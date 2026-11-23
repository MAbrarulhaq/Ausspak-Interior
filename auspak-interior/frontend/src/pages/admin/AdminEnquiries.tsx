import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Btn, Card, ctl, ErrorBox, Loading, PageHeader, Pagination, Row, rowLink, tableBase, tableWrap, td, th, thead, trow, useAction } from '../../components/admin/ui';
import AuthImage from '../../components/admin/AuthImage';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { ENQUIRY_STATUSES } from '../../utils/labels';
import { formatDate } from '../../utils/format';
import type { EnquiryStatus } from '../../types';

const dt = 'font-label-sm text-label-sm uppercase tracking-wider text-slate-text mb-1';

export function AdminEnquiries() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => { setSearch(q); }, [q]);
  const { data, loading, error, reload } = useAsync(() => adminApi.enquiries({ status, q, page }), [status, q, page]);
  const set = (patch: Record<string, string>) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!('page' in patch)) n.delete('page'); setParams(n); };
  return (
    <>
      <PageHeader title="Enquiries" />
      <Card className="mb-6 !p-4 sm:!p-5">
        <form onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() }); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto] gap-3 items-center" role="search">
          <input className={`${ctl} sm:col-span-2 lg:col-span-1`} placeholder="Search name, email, phone, text" aria-label="Search enquiries" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={ctl} aria-label="Filter by status" value={status} onChange={(e) => set({ status: e.target.value })}><option value="">All statuses</option>{ENQUIRY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <Btn type="submit" variant="secondary">Search</Btn>
        </form>
      </Card>
      {loading && !data && <Loading what="Loading enquiries" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <p className="text-slate-text py-4" data-testid="no-enquiries">No enquiries found.</p> : (
        <div className={tableWrap}><table className={tableBase} data-testid="enquiries-table">
          <thead className={thead}><tr>{['Received', 'From', 'Type', 'Status', 'Images'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{data.items.map((e) => (
            <tr key={e.id} className={trow}>
              <td className={`${td} whitespace-nowrap`}><Link className={rowLink} to={`/admin/enquiries/${e.id}`}>{formatDate(e.created_at)}</Link></td>
              <td className={td}>{e.full_name}<br /><span className="text-slate-text">{e.phone}</span></td>
              <td className={td}>{e.work_type}{e.order_number_reference && <><br /><Badge tone="info">Order {e.order_number_reference}</Badge></>}</td>
              <td className={td}><Badge tone={e.status === 'new' ? 'warn' : e.status === 'converted' ? 'good' : 'neutral'}>{e.status.replace('_', ' ')}</Badge></td>
              <td className={td}>{e.attachments.length}</td>
            </tr>))}</tbody></table></div>
      ))}
      {data && <Pagination page={page} total={data.total} pageSize={20} onPage={(p) => set({ page: String(p) })} />}
    </>
  );
}

export function AdminEnquiryDetail() {
  const { id = '' } = useParams();
  const { isAdmin } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(() => adminApi.enquiry(id), [id]);
  const { run, busy, error: actionError } = useAction();
  if (loading && !data) return <Loading what="Loading enquiry" />;
  if (error || !data) return <><PageHeader title="Enquiry" /><ErrorBox message={error ?? 'Enquiry not found.'} onRetry={reload} /></>;
  const setStatus = async (s: EnquiryStatus) => { const r = await run(() => adminApi.setEnquiryStatus(data.id, s)); if (r) setData(r); };
  return (
    <>
      <PageHeader eyebrow={['Enquiries', 'Details']} title={`Enquiry from ${data.full_name}`} subtitle={`Received ${formatDate(data.created_at)}`}
        actions={<><Link to="/admin/enquiries"><Btn variant="outline">Back</Btn></Link><Link to={`/admin/orders/new?enquiry=${data.id}`}><Btn data-testid="create-order-from-enquiry">Create order from this enquiry</Btn></Link></>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Details" className="lg:col-span-2">
          <dl className="font-body-sm grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div><dt className={dt}>Phone</dt><dd>{data.phone}</dd></div><div><dt className={dt}>Email</dt><dd className="break-all">{data.email}</dd></div>
            <div><dt className={dt}>Type</dt><dd>{data.work_type}</dd></div>
            {data.order_number_reference && <div><dt className={dt}>About order</dt><dd data-testid="order-reference">{data.order_number_reference}</dd></div>}
            {data.selected_design_id && <div><dt className={dt}>Selected design</dt><dd>{isAdmin ? <Link className="text-secondary underline underline-offset-2" to={`/admin/designs/${data.selected_design_id}`}>Open design</Link> : 'A design was selected'}</dd></div>}
          </dl>
          <p className="font-body-md whitespace-pre-line border-t border-[#efece5] pt-5" data-testid="enquiry-description">{data.description}</p>
        </Card>
        <Card title="Status">
          <Row label="Enquiry status"><select className={ctl} value={data.status} disabled={busy} onChange={(e) => setStatus(e.target.value as EnquiryStatus)} data-testid="enquiry-status">{ENQUIRY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Row>
          {actionError && <div className="mt-3"><ErrorBox message={actionError} /></div>}
        </Card>
      </div>
      <Card title={`Reference images (${data.attachments.length})`} className="mt-6">
        {data.attachments.length === 0 ? <p className="text-slate-text font-body-sm">No images were attached.</p> : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{data.attachments.map((a) => <figure key={a.id}><AuthImage enquiryId={data.id} attachmentId={a.id} alt={a.original_filename} /><figcaption className="font-body-sm text-slate-text truncate mt-1">{a.original_filename}</figcaption></figure>)}</div>
        )}
      </Card>
    </>
  );
}
