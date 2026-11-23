import { Link } from 'react-router-dom';
import { ErrorBox, Loading, PageHeader } from '../../components/admin/ui';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { ORDER_STATUSES } from '../../utils/labels';

const cardCls = 'bg-white border border-[#e8e4db] rounded-lg shadow-sm p-5 min-h-[112px] flex flex-col justify-between gap-4';

function Stat({ label, value, to, tone = '', labelTone = 'text-slate-text' }: { label: string; value: number | null; to?: string; tone?: string; labelTone?: string }) {
  if (value === null) return null;
  const body = (
    <>
      <p className={`font-label-sm text-label-sm uppercase tracking-widest ${labelTone}`}>{label}</p>
      <p className={`font-display-lg text-4xl ${tone || 'text-primary'}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
    </>
  );
  return to
    ? <Link to={to} className={`${cardCls} hover:shadow-md hover:border-border-brass transition`}>{body}</Link>
    : <div className={cardCls}>{body}</div>;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminApi.summary(), []);
  return (
    <>
      <PageHeader title="Dashboard" divider subtitle={`Welcome, ${user?.full_name}.${isAdmin ? '' : ' (Limited view for staff accounts.)'}`} />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Stat label="Total orders" value={data.total_orders} to="/admin/orders" />
            <Stat label="In progress" value={data.in_progress} to="/admin/orders?status=in_progress" />
            <Stat label="Delayed" value={data.delayed} to="/admin/orders?is_delayed=true" tone="text-secondary" labelTone="text-secondary" />
            <Stat label="Ready for collection" value={data.ready_for_collection} to="/admin/orders?status=ready_for_collection" />
            <Stat label="Completed" value={data.completed} to="/admin/orders?status=completed" />
            <Stat label="New enquiries" value={data.new_enquiries} to="/admin/enquiries?status=new" />
            <Stat label="Published designs" value={data.published_designs} to="/admin/designs" />
            <Stat label="Draft designs" value={data.draft_designs} to="/admin/designs" />
            <Stat label="Failed notifications" value={data.failed_notifications} to="/admin/notifications?delivery_status=failed" tone="text-error" labelTone="text-error" />
          </div>
          <section aria-labelledby="orders-by-stage">
            <h2 id="orders-by-stage" className="font-headline-md text-headline-md text-primary mb-5">Orders by stage</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {ORDER_STATUSES.map((s) => (
                <li key={s.value} className="bg-white border border-[#e8e4db] rounded-lg shadow-sm p-5 flex flex-col gap-3">
                  <p className="font-label-sm text-label-sm uppercase tracking-wider text-slate-text">{s.label}</p>
                  <p className="font-headline-md text-headline-md text-primary">{data.orders_by_status[s.value] ?? 0}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
