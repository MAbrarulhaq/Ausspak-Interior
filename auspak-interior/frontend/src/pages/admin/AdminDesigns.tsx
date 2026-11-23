import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Badge, Btn, ctl, ErrorBox, Loading, Modal, PageHeader, Pagination, Row, useAction } from '../../components/admin/ui';
import Icon from '../../components/ui/Icon';
import { adminApi, publicApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { mediaUrl } from '../../utils/media';
import type { PublicationStatus } from '../../types';

const tone = { published: 'good', draft: 'warn', archived: 'neutral' } as const;

function NewDesign({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const cats = useAsync(() => publicApi.categories(), []);
  const { run, busy, error } = useAction();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { category_id: '', title: '', description: '', style: '', publication_status: 'draft' as PublicationStatus, is_demonstration: false } });
  const submit = handleSubmit(async (v) => {
    const d = await run(() => adminApi.createDesign({ ...v, style: v.style || undefined }));
    if (d) nav(`/admin/designs/${d.id}`);
  });
  return (
    <Modal title="New design" onClose={onClose}>
      <form onSubmit={submit} className="space-y-space-sm" aria-label="New design form" noValidate>
        <Row label="Category *"><select className={ctl} {...register('category_id', { required: 'Choose a category.' })}><option value="">Select</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errors.category_id && <span role="alert" className="text-error normal-case">{errors.category_id.message}</span>}</Row>
        <Row label="Title *"><input className={ctl} {...register('title', { required: 'A title is required.', minLength: { value: 2, message: 'Too short.' } })} />{errors.title && <span role="alert" className="text-error normal-case">{errors.title.message}</span>}</Row>
        <Row label="Style (optional)"><input className={ctl} {...register('style')} /></Row>
        <Row label="Description *"><textarea rows={3} className={ctl} {...register('description', { required: 'A description is required.', minLength: { value: 3, message: 'Too short.' } })} />{errors.description && <span role="alert" className="text-error normal-case">{errors.description.message}</span>}</Row>
        <Row label="Visibility"><select className={ctl} {...register('publication_status')}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></Row>
        <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('is_demonstration')} /> This is sample content, not a real Auspak project</label>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-2"><Btn type="submit" disabled={busy} data-testid="save-new-design">Create</Btn><Btn variant="secondary" onClick={onClose}>Cancel</Btn></div>
      </form>
    </Modal>
  );
}

function Categories() {
  const cats = useAsync(() => publicApi.categories(), []);
  const { run, busy, error } = useAction();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', description: '' } });
  const add = handleSubmit(async (v) => { if (await run(() => adminApi.createCategory({ name: v.name, description: v.description || undefined }))) { reset(); cats.reload(); } });
  return (
    <section className="bg-surface-container-low border border-[#e8e4db] rounded-lg p-5 sm:p-6" aria-labelledby="categories-title">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 id="categories-title" className="font-headline-sm text-headline-sm text-primary flex items-center gap-2"><span aria-hidden="true" className="w-1.5 h-1.5 rounded-[999px] bg-secondary" />Categories</h2>
          <p className="font-body-sm text-slate-text mt-1">Group designs so visitors can filter them on the website.</p>
        </div>
        <ul className="flex flex-wrap gap-2 max-w-xl sm:justify-end" data-testid="category-list">{cats.data?.map((c) => (
          <li key={c.id} className="inline-flex items-center gap-2 bg-white border border-[#e8e4db] rounded px-3 py-1.5 font-label-sm text-label-sm uppercase tracking-wider text-primary shadow-sm"><span aria-hidden="true" className="w-1.5 h-1.5 rounded-[999px] bg-secondary" />{c.name} · {c.design_count} published</li>
        ))}</ul>
      </div>
      <form onSubmit={add} className="bg-white border border-[#e8e4db] rounded-lg p-4 grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-4 items-end" aria-label="New category form">
        <Row label="New category"><input className={ctl} placeholder="e.g. Architectural Partitions" {...register('name', { required: true, minLength: 2 })} /></Row>
        <Row label="Description (optional)"><input className={ctl} placeholder="Scope notes, wood grade or application..." {...register('description')} /></Row>
        <Btn type="submit" variant="secondary" disabled={busy} data-testid="add-category"><Icon name="add_circle" className="text-[16px]" />Add category</Btn>
      </form>
      {error && <div className="mt-3"><ErrorBox message={error} /></div>}
    </section>
  );
}

export default function AdminDesigns() {
  const [status, setStatus] = useState<PublicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useAsync(() => adminApi.adminDesigns({ publication_status: status, page }), [status, page]);
  return (
    <>
      <PageHeader eyebrow={['Islamabad atelier archive', 'Catalogue management']} title="Gallery" subtitle="Admin only. Publish designs to show them on the website." actions={<Btn onClick={() => setCreating(true)} data-testid="new-design"><Icon name="add" className="text-[16px]" />New design</Btn>} />
      <div className="space-y-8">
        <Categories />
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <select className={`${ctl} sm:w-56 !bg-white`} aria-label="Filter by visibility" value={status} onChange={(e) => { setStatus(e.target.value as PublicationStatus | ''); setPage(1); }}><option value="">All designs</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
            {data && <p className="font-label-sm text-label-sm uppercase tracking-wider text-slate-text">Viewing <strong className="text-primary">{data.total} {data.total === 1 ? 'design' : 'designs'}</strong></p>}
          </div>
          {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
          {data && (data.items.length === 0 ? <p className="text-slate-text">No designs.</p> : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" data-testid="design-grid">{data.items.map((d) => (
              <li key={d.id} className="bg-white border border-[#e8e4db] rounded-lg shadow-sm overflow-hidden hover:shadow-md hover:border-border-brass transition">
                <Link to={`/admin/designs/${d.id}`} className="block">
                  <div className="aspect-[4/3] bg-surface-container-high">{d.cover_image && <img src={mediaUrl(d.cover_image.image_url)} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
                  <div className="p-4"><p className="font-headline-sm text-lg leading-snug text-primary">{d.title}</p><div className="flex flex-wrap gap-1.5 mt-3"><Badge dot tone={tone[d.publication_status]}>{d.publication_status}</Badge>{d.is_demonstration && <Badge tone="info">sample</Badge>}</div></div>
                </Link></li>))}</ul>
          ))}
          {data && data.total > 24 && <Pagination page={page} total={data.total} pageSize={24} onPage={setPage} />}
        </div>
        <p className="flex items-center gap-2 pt-4 border-t border-[#e8e4db] font-body-sm text-slate-text"><Icon name="architecture" className="text-[16px]" />Published designs appear on the public website straight away.</p>
      </div>
      {creating && <NewDesign onClose={() => setCreating(false)} />}
    </>
  );
}
