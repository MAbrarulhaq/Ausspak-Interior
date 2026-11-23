import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Badge, Btn, Card, ctl, ErrorBox, Loading, Notice, PageHeader, Row, useAction } from '../../components/admin/ui';
import { adminApi, apiErrorMessage, publicApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { mediaUrl } from '../../utils/media';
import { fileProblem } from '../../utils/validation';
import type { AdminDesign, PublicationStatus } from '../../types';

export default function AdminDesignEdit() {
  const { id = '' } = useParams();
  const { data, loading, error, reload, setData } = useAsync(() => adminApi.adminDesign(id), [id]);
  const cats = useAsync(() => publicApi.categories(), []);
  const { run, busy, error: actionError } = useAction();
  const [saved, setSaved] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { category_id: '', title: '', description: '', style: '', is_demonstration: false } });
  useEffect(() => { if (data) reset({ category_id: data.category.id, title: data.title, description: data.description, style: data.style ?? '', is_demonstration: data.is_demonstration }); }, [data, reset]);

  if (loading && !data) return <Loading what="Loading design" />;
  if (error || !data) return <><PageHeader title="Design" /><ErrorBox message={error ?? 'Design not found.'} onRetry={reload} /></>;
  const apply = (d: AdminDesign) => setData(d);

  const save = handleSubmit(async (v) => { setSaved(false); const d = await run(() => adminApi.updateDesign(data.id, { ...v, style: v.style })); if (d) { apply(d); setSaved(true); } });
  const setStatus = async (s: PublicationStatus) => { const d = s === 'archived' ? await run(() => adminApi.archiveDesign(data.id)) : await run(() => adminApi.updateDesign(data.id, { publication_status: s })); if (d) apply(d); };
  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploadErr(null); setUploadMsg(null);
    const files = Array.from(list); const bad = files.map(fileProblem).find(Boolean);
    if (bad) { setUploadErr(bad); return; }
    let ok = 0;
    for (const f of files) {
      try { await adminApi.uploadDesignImage(data.id, f, ''); ok++; } catch (e) { setUploadErr(`${f.name}: ${apiErrorMessage(e)}`); break; }
    }
    if (ok) { setUploadMsg(`${ok} image(s) uploaded.`); apply(await adminApi.adminDesign(data.id)); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const removeImage = async (imageId: string) => { if (window.confirm('Delete this image?') && (await run(() => adminApi.deleteDesignImage(data.id, imageId).then(() => true)))) apply(await adminApi.adminDesign(data.id)); };

  return (
    <>
      <PageHeader title={data.title} subtitle={`Slug: ${data.slug}`} actions={<Link to="/admin/designs"><Btn variant="ghost">Back to gallery</Btn></Link>} />
      <div className="flex flex-wrap items-center gap-2 mb-space-md">
        <Badge tone={data.publication_status === 'published' ? 'good' : data.publication_status === 'draft' ? 'warn' : 'neutral'}>{data.publication_status}</Badge>
        {data.publication_status !== 'published' && <Btn onClick={() => setStatus('published')} disabled={busy} data-testid="publish">Publish</Btn>}
        {data.publication_status === 'published' && <Btn variant="secondary" onClick={() => setStatus('draft')} disabled={busy} data-testid="unpublish">Move to draft</Btn>}
        {data.publication_status !== 'archived' && <Btn variant="danger" onClick={() => setStatus('archived')} disabled={busy} data-testid="archive">Archive</Btn>}
        {data.publication_status === 'published' && <Link className="text-secondary underline font-body-sm" to={`/projects/${data.slug}`}>View on website</Link>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <Card title="Details">
          <form onSubmit={save} className="space-y-space-sm" aria-label="Edit design form" noValidate>
            <Row label="Category"><select className={ctl} {...register('category_id')}>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Row>
            <Row label="Title"><input className={ctl} {...register('title', { required: true, minLength: 2 })} /></Row>
            <Row label="Style"><input className={ctl} {...register('style')} /></Row>
            <Row label="Description"><textarea rows={5} className={ctl} {...register('description', { required: true, minLength: 3 })} /></Row>
            <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('is_demonstration')} /> Sample content, not a real Auspak project (shows a "Sample project" label)</label>
            {actionError && <ErrorBox message={actionError} />}{saved && <Notice>Saved.</Notice>}
            <Btn type="submit" disabled={busy} data-testid="save-design">Save changes</Btn>
          </form>
        </Card>
        <Card title={`Images (${data.images.length})`}>
          <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files)} aria-label="Upload images" data-testid="design-upload"
            className="block w-full text-body-sm font-body-sm text-slate-text mb-3 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-on-primary file:font-label-md" />
          <p className="font-body-sm text-slate-text mb-3">JPG, PNG or WebP, up to 5 MB each. The first image is the cover.</p>
          {uploadErr && <p role="alert" className="text-error font-body-sm mb-2" data-testid="upload-error">{uploadErr}</p>}{uploadMsg && <Notice>{uploadMsg}</Notice>}
          <ul className="grid grid-cols-2 gap-3 mt-3" data-testid="design-images">{data.images.map((im, i) => (
            <li key={im.id} className="relative bg-alabaster-muted rounded overflow-hidden"><img src={mediaUrl(im.image_url)} alt={im.alt_text} className="h-32 w-full object-cover" loading="lazy" />
              <span className="absolute top-1 left-1"><Badge>{i === 0 ? 'cover' : i + 1}</Badge></span>
              <button type="button" onClick={() => removeImage(im.id)} className="absolute top-1 right-1 bg-surface/90 rounded px-2 text-error font-label-sm" aria-label={`Delete image ${i + 1}`}>Delete</button></li>))}</ul>
        </Card>
      </div>
    </>
  );
}
