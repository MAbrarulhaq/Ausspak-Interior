import { useSearchParams } from 'react-router-dom';
import { ctl, ErrorBox, Loading, PageHeader, Pagination } from '../../components/admin/ui';
import NotificationTable from '../../components/admin/NotificationTable';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import type { Channel, DeliveryStatus } from '../../types';

export default function AdminNotifications() {
  const [params, setParams] = useSearchParams();
  const delivery_status = (params.get('delivery_status') ?? '') as DeliveryStatus | '';
  const channel = (params.get('channel') ?? '') as Channel | '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, loading, error, reload } = useAsync(() => adminApi.notifications({ delivery_status, channel, page }), [delivery_status, channel, page]);
  const set = (patch: Record<string, string>) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!('page' in patch)) n.delete('page'); setParams(n); };
  return (
    <>
      <PageHeader eyebrow={['Atelier client dispatch', 'Notifications log']} title="Notifications" subtitle="Every message created for customers. 'Not sent' means it was recorded but no automatic provider delivered it. For WhatsApp, use the link to send it by hand." />
      {error && <ErrorBox message={error} onRetry={reload} />}
      <section className="bg-white border border-[#e8e4db] rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-3 px-4 sm:px-5 py-4 bg-surface-container-low border-b border-[#efece5]">
          <select className={`${ctl} sm:w-56`} aria-label="Filter by delivery status" value={delivery_status} onChange={(e) => set({ delivery_status: e.target.value })}>
            <option value="">All statuses</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="not_sent">Not sent (recorded only)</option><option value="pending">Pending</option></select>
          <select className={`${ctl} sm:w-48`} aria-label="Filter by channel" value={channel} onChange={(e) => set({ channel: e.target.value })}><option value="">All channels</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select>
        </div>
        {loading && !data && <div className="px-5"><Loading /></div>}
        {data && <NotificationTable items={data.items} onChanged={reload} />}
        {data && <Pagination embedded page={page} total={data.total} pageSize={20} onPage={(p) => set({ page: String(p) })} />}
      </section>
    </>
  );
}
