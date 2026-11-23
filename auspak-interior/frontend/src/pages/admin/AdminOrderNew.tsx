import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Btn, Card, ctl, ErrorBox, PageHeader, Row, useAction } from '../../components/admin/ui';
import { adminApi } from '../../services/api';
import { services } from '../../data/services';
import { ORDER_STATUSES, todayISO } from '../../utils/labels';
import type { OrderStatus } from '../../types';

interface V {
  customer_name: string; customer_phone: string; customer_email: string; work_type: string; description: string;
  order_date: string; agreed_completion_date: string; estimated_completion_date: string; current_status: OrderStatus; initial_message: string; notify: boolean;
}

export default function AdminOrderNew() {
  const [params] = useSearchParams();
  const enquiryId = params.get('enquiry') ?? undefined;
  const nav = useNavigate();
  const { run, busy, error } = useAction();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<V>({
    defaultValues: { customer_name: '', customer_phone: '', customer_email: '', work_type: '', description: '', order_date: todayISO(), agreed_completion_date: '', estimated_completion_date: '', current_status: 'order_received', initial_message: '', notify: true },
  });

  useEffect(() => {
    if (!enquiryId) return;
    adminApi.enquiry(enquiryId).then((e) => reset((cur) => ({ ...cur, customer_name: e.full_name, customer_phone: e.phone, customer_email: e.email, work_type: e.work_type, description: e.description }))).catch(() => undefined);
  }, [enquiryId, reset]);

  const onSubmit = async (v: V) => {
    const created = await run(() => adminApi.createOrder({
      customer_name: v.customer_name, customer_phone: v.customer_phone, customer_email: v.customer_email || null, work_type: v.work_type, description: v.description,
      order_date: v.order_date || undefined, agreed_completion_date: v.agreed_completion_date, estimated_completion_date: v.estimated_completion_date || undefined,
      current_status: v.current_status, initial_message: v.initial_message || undefined, enquiry_id: enquiryId, notify: v.notify,
    }));
    if (created) nav(`/admin/orders/${created.id}`);
  };
  const req = { required: 'Required' };

  return (
    <>
      <PageHeader title="New order" subtitle={enquiryId ? 'Created from an enquiry: details are pre-filled. Check them before saving.' : 'Use this for a new order or to add an existing order at its current stage.'} actions={<Link to="/admin/orders"><Btn variant="secondary">Cancel</Btn></Link>} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="New order form">
        <Card className="space-y-space-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <Row label="Customer name *"><input className={ctl} {...register('customer_name', req)} />{errors.customer_name && <span role="alert" className="text-error normal-case">{errors.customer_name.message}</span>}</Row>
            <Row label="Customer phone *" hint="Any format, e.g. 0300 1234567. This is used to verify order tracking."><input className={ctl} type="tel" {...register('customer_phone', req)} />{errors.customer_phone && <span role="alert" className="text-error normal-case">{errors.customer_phone.message}</span>}</Row>
            <Row label="Customer email (optional)" hint="Needed to send email notifications."><input className={ctl} type="email" {...register('customer_email')} /></Row>
            <Row label="Work type *"><input className={ctl} list="work-types" {...register('work_type', req)} /><datalist id="work-types">{services.map((s) => <option key={s.slug} value={s.title} />)}</datalist>{errors.work_type && <span role="alert" className="text-error normal-case">{errors.work_type.message}</span>}</Row>
          </div>
          <Row label="Description *"><textarea rows={3} className={ctl} {...register('description', req)} />{errors.description && <span role="alert" className="text-error normal-case">{errors.description.message}</span>}</Row>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <Row label="Order date"><input type="date" className={ctl} {...register('order_date')} /></Row>
            <Row label="Agreed completion date *" hint="This original date is always kept."><input type="date" className={ctl} {...register('agreed_completion_date', req)} />{errors.agreed_completion_date && <span role="alert" className="text-error normal-case">{errors.agreed_completion_date.message}</span>}</Row>
            <Row label="Estimated date (optional)" hint="Leave empty to use the agreed date."><input type="date" className={ctl} {...register('estimated_completion_date')} /></Row>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <Row label="Current stage" hint="For an existing order, pick where it is now. No earlier history is invented."><select className={ctl} {...register('current_status')}>{ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Row>
            <Row label="First update shown to the customer (optional)"><input className={ctl} placeholder="Order recorded." {...register('initial_message')} /></Row>
          </div>
          <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('notify')} /> Notify the customer (email and WhatsApp record)</label>
          {error && <ErrorBox message={error} />}
          <Btn type="submit" disabled={busy} data-testid="create-order">{busy ? 'Saving...' : 'Create order'}</Btn>
        </Card>
      </form>
    </>
  );
}
