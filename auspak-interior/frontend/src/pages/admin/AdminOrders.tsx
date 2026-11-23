import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Btn, Card, ctl, ErrorBox, Loading, PageHeader, Pagination, rowLink, tableBase, tableWrap, td, th, thead, trow } from '../../components/admin/ui';
import Icon from '../../components/ui/Icon';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { ORDER_STATUSES, orderStatusLabel } from '../../utils/labels';
import { formatDate } from '../../utils/format';

const PAGE_SIZE = 20;

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const delayed = params.get('is_delayed') ?? '';
  const sort = params.get('sort') ?? 'created_at:desc';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => { setSearch(q); }, [q]); // keep the box in sync when the top-bar search changes ?q=
  const [sort_by, sort_dir] = sort.split(':');
  const { data, loading, error, reload } = useAsync(() => adminApi.orders({ q, status, is_delayed: delayed, sort_by, sort_dir, page, page_size: PAGE_SIZE }), [q, status, delayed, sort, page]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Orders" actions={<Link to="/admin/orders/new"><Btn data-testid="new-order"><Icon name="add" className="text-[16px]" />New order</Btn></Link>} />
      <Card className="mb-6 !p-4 sm:!p-5">
        <form onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() }); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center" role="search">
          <input className={ctl} placeholder="Search order no., name, phone, email" aria-label="Search orders" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={ctl} aria-label="Filter by status" value={status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All stages</option>{ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className={ctl} aria-label="Filter by delay" value={delayed} onChange={(e) => set({ is_delayed: e.target.value })}>
            <option value="">Delayed or not</option><option value="true">Delayed only</option><option value="false">Not delayed</option>
          </select>
          <select className={ctl} aria-label="Sort" value={sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="created_at:desc">Newest first</option><option value="created_at:asc">Oldest first</option>
            <option value="estimated_completion_date:asc">Due soonest</option><option value="estimated_completion_date:desc">Due latest</option>
          </select>
          <Btn type="submit" variant="secondary">Search</Btn>
        </form>
      </Card>
      {loading && !data && <Loading what="Loading orders" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <p className="text-slate-text font-body-md py-4" data-testid="no-orders">No orders found.</p> : (
        <div className={tableWrap}>
          <table className={tableBase} data-testid="orders-table">
            <thead className={thead}><tr>{['Order', 'Customer', 'Work', 'Stage', 'Estimated', 'Created'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{data.items.map((o) => (
              <tr key={o.id} className={trow}>
                <td className={`${td} whitespace-nowrap`}><Link className={rowLink} to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                <td className={td}>{o.customer_name}<br /><span className="text-slate-text">{o.customer_phone}</span></td>
                <td className={td}>{o.work_type}</td>
                <td className={td}><div className="flex flex-wrap gap-1.5"><Badge tone={o.current_status === 'completed' ? 'good' : 'info'}>{orderStatusLabel(o.current_status)}</Badge>{o.is_delayed && <Badge tone="warn">Delayed</Badge>}</div></td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(o.estimated_completion_date)}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(o.created_at)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      ))}
      {data && <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={(p) => set({ page: String(p) })} />}
    </>
  );
}
