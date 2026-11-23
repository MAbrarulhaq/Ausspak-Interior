import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Badge, Btn, Card, ctl, ErrorBox, Loading, Modal, Notice, PageHeader, Row, useAction } from '../../components/admin/ui';
import NotificationTable from '../../components/admin/NotificationTable';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { COMMITMENT_STATUSES, ORDER_STATUSES, orderStatusLabel, todayISO } from '../../utils/labels';
import { formatDate } from '../../utils/format';
import type { Channel, CommitmentStatus, NotificationItem, OrderDetail, OrderStatus } from '../../types';

type Setter = (o: OrderDetail) => void;

function StatusForm({ order, onSaved }: { order: OrderDetail; onSaved: Setter }) {
  const { run, busy, error } = useAction();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: { new_status: order.current_status as OrderStatus, update_message: '', is_delayed: order.is_delayed, delay_reason: order.delay_reason ?? '', internal_note: '', notify: true } });
  const delayed = watch('is_delayed');
  const submit = handleSubmit(async (v) => {
    setDone(false);
    const res = await run(() => adminApi.changeStatus(order.id, {
      new_status: v.new_status, update_message: v.update_message, is_delayed: v.is_delayed,
      delay_reason: v.is_delayed && v.delay_reason ? v.delay_reason : undefined, internal_note: v.internal_note || undefined, notify: v.notify,
    }));
    if (res) { onSaved(res); setDone(true); reset({ new_status: res.current_status, update_message: '', is_delayed: res.is_delayed, delay_reason: res.delay_reason ?? '', internal_note: '', notify: v.notify }); }
  });
  return (
    <Card title="Post an update">
      <form onSubmit={submit} className="space-y-space-sm" noValidate aria-label="Status update form">
        <Row label="Stage"><select className={ctl} {...register('new_status')}>{ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Row>
        <Row label="Update shown to the customer *"><textarea rows={2} className={ctl} {...register('update_message', { required: 'Please write an update for the customer.' })} />{errors.update_message && <span role="alert" className="text-error normal-case">{errors.update_message.message}</span>}</Row>
        <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('is_delayed')} /> This order is delayed</label>
        {delayed && <Row label="Reason for the delay (shown to the customer) *"><input className={ctl} {...register('delay_reason', { validate: (v) => !delayed || v.trim().length >= 5 || 'A delayed order needs an explanation (at least 5 characters).' })} />{errors.delay_reason && <span role="alert" className="text-error normal-case">{errors.delay_reason.message}</span>}</Row>}
        <Row label="Internal note (staff only, never shown to the customer)"><input className={ctl} {...register('internal_note')} /></Row>
        <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('notify')} /> Notify the customer</label>
        {error && <ErrorBox message={error} />}{done && <Notice>Update saved.</Notice>}
        <Btn type="submit" disabled={busy} data-testid="post-update">{busy ? 'Saving...' : 'Post update'}</Btn>
      </form>
    </Card>
  );
}

function ReviseDate({ order, onSaved }: { order: OrderDetail; onSaved: Setter }) {
  const { run, busy, error } = useAction();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { revised_date: '', reason: '', notify: true } });
  const submit = handleSubmit(async (v) => {
    setDone(false);
    const res = await run(() => adminApi.reviseDate(order.id, v));
    if (res) { onSaved(res); setDone(true); reset({ revised_date: '', reason: '', notify: v.notify }); }
  });
  return (
    <form onSubmit={submit} className="space-y-space-sm border-t border-outline-variant/30 pt-space-sm" noValidate aria-label="Revise date form">
      <p className="font-label-md uppercase tracking-wider text-primary">Revise the estimated date</p>
      <Row label="New estimated date *"><input type="date" className={ctl} {...register('revised_date', { required: 'Choose a date.' })} />{errors.revised_date && <span role="alert" className="text-error normal-case">{errors.revised_date.message}</span>}</Row>
      <Row label="Reason *"><input className={ctl} {...register('reason', { required: 'A reason is required.', minLength: { value: 5, message: 'At least 5 characters.' } })} />{errors.reason && <span role="alert" className="text-error normal-case">{errors.reason.message}</span>}</Row>
      <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('notify')} /> Notify the customer</label>
      {error && <ErrorBox message={error} />}{done && <Notice>Date revised. The original agreed date is kept.</Notice>}
      <Btn type="submit" variant="secondary" disabled={busy} data-testid="revise-date">Revise date</Btn>
    </form>
  );
}

function Commitments({ order, onSaved }: { order: OrderDetail; onSaved: () => void }) {
  const { run, busy, error } = useAction();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { commitment_text: '', agreed_date: todayISO(), due_date: '', notify: true } });
  const add = handleSubmit(async (v) => {
    const res = await run(() => adminApi.addCommitment(order.id, { commitment_text: v.commitment_text, agreed_date: v.agreed_date, due_date: v.due_date || undefined, notify: v.notify }));
    if (res) { reset({ commitment_text: '', agreed_date: todayISO(), due_date: '', notify: v.notify }); onSaved(); }
  });
  const setStatus = async (id: string, status: CommitmentStatus) => { if (await run(() => adminApi.updateCommitment(order.id, id, { status, notify: true }))) onSaved(); };
  return (
    <Card title="Commitments">
      {order.commitments.length === 0 ? <p className="text-slate-text font-body-sm mb-3">No commitments recorded.</p> : (
        <ul className="space-y-3 mb-space-sm" data-testid="commitments-list">{order.commitments.map((c) => (
          <li key={c.id} className="font-body-sm bg-alabaster-muted rounded p-3">
            <p>{c.commitment_text}</p><p className="text-slate-text">Agreed {formatDate(c.agreed_date)}{c.due_date ? ` · Due ${formatDate(c.due_date)}` : ''}</p>
            <select aria-label="Commitment status" className={`${ctl} mt-2`} value={c.status} disabled={busy} onChange={(e) => setStatus(c.id, e.target.value as CommitmentStatus)}>{COMMITMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </li>))}</ul>
      )}
      <form onSubmit={add} className="space-y-space-sm border-t border-outline-variant/30 pt-space-sm" noValidate aria-label="Add commitment form">
        <Row label="New commitment *"><input className={ctl} {...register('commitment_text', { required: 'Describe the commitment.', minLength: { value: 3, message: 'Too short.' } })} />{errors.commitment_text && <span role="alert" className="text-error normal-case">{errors.commitment_text.message}</span>}</Row>
        <div className="grid grid-cols-2 gap-3"><Row label="Agreed on *"><input type="date" className={ctl} {...register('agreed_date', { required: true })} /></Row><Row label="Due (optional)"><input type="date" className={ctl} {...register('due_date')} /></Row></div>
        <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" {...register('notify')} /> Notify the customer</label>
        {error && <ErrorBox message={error} />}
        <Btn type="submit" variant="secondary" disabled={busy} data-testid="add-commitment">Add commitment</Btn>
      </form>
    </Card>
  );
}

function EditContact({ order, onSaved, onClose }: { order: OrderDetail; onSaved: Setter; onClose: () => void }) {
  const { run, busy, error } = useAction();
  const { register, handleSubmit } = useForm({ defaultValues: { customer_name: order.customer_name, customer_phone: order.customer_phone, customer_email: order.customer_email ?? '', work_type: order.work_type, description: order.description } });
  const submit = handleSubmit(async (v) => {
    const res = await run(() => adminApi.editOrder(order.id, { customer_name: v.customer_name, customer_phone: v.customer_phone, work_type: v.work_type, description: v.description, ...(v.customer_email ? { customer_email: v.customer_email } : {}) }));
    if (res) { onSaved(res); onClose(); }
  });
  return (
    <Modal title="Edit customer and order details" onClose={onClose}>
      <form onSubmit={submit} className="space-y-space-sm" aria-label="Edit order form">
        <Row label="Customer name"><input className={ctl} {...register('customer_name', { required: true })} /></Row>
        <Row label="Customer phone" hint="Changing this changes the number the customer must use for tracking."><input className={ctl} {...register('customer_phone', { required: true })} /></Row>
        <Row label="Customer email"><input type="email" className={ctl} {...register('customer_email')} /></Row>
        <Row label="Work type"><input className={ctl} {...register('work_type', { required: true })} /></Row>
        <Row label="Description"><textarea rows={3} className={ctl} {...register('description', { required: true })} /></Row>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-2"><Btn type="submit" disabled={busy}>Save</Btn><Btn variant="secondary" onClick={onClose}>Cancel</Btn></div>
      </form>
    </Modal>
  );
}

function NotifyBox({ order, onSent }: { order: OrderDetail; onSent: () => void }) {
  const { run, busy, error } = useAction();
  const [sent, setSent] = useState<NotificationItem[] | null>(null);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { message: '', email: true, whatsapp: true } });
  const v = watch();
  const submit = handleSubmit(async (f) => {
    const channels: Channel[] = [...(f.email ? ['email' as const] : []), ...(f.whatsapp ? ['whatsapp' as const] : [])];
    const res = await run(() => adminApi.notifyOrder(order.id, { message: f.message, channels }));
    if (res) { setSent(res); reset({ ...f, message: '' }); onSent(); }
  });
  return (
    <Card title="Send a message to the customer">
      <form onSubmit={submit} className="space-y-space-sm" aria-label="Manual notification form">
        <Row label="Message *"><textarea rows={2} className={ctl} {...register('message', { required: true, minLength: 3 })} /></Row>
        <div className="flex gap-4 font-body-sm"><label className="flex items-center gap-2"><input type="checkbox" {...register('email')} /> Email{!order.customer_email && ' (no email on order)'}</label><label className="flex items-center gap-2"><input type="checkbox" {...register('whatsapp')} /> WhatsApp</label></div>
        {error && <ErrorBox message={error} />}
        {sent && <Notice>{sent.length === 0 ? 'Nothing was recorded: the order has no contact for the selected channels.' : `Recorded ${sent.length} message(s). See the status below.`}</Notice>}
        <Btn type="submit" variant="secondary" disabled={busy || (!v.email && !v.whatsapp)} data-testid="send-message">Send</Btn>
      </form>
    </Card>
  );
}

export default function AdminOrderDetail() {
  const { id = '' } = useParams();
  const { data, loading, error, reload, setData } = useAsync(() => adminApi.order(id), [id]);
  const notes = useAsync(() => adminApi.notifications({ order_id: id }), [id]);
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  useEffect(() => { if (data) setOrder(data); }, [data]);
  const save: Setter = (o) => { setOrder(o); setData(o); notes.reload(); };

  if (loading && !order) return <Loading what="Loading order" />;
  if (error || !order) return <><PageHeader title="Order" /><ErrorBox message={error ?? 'Order not found.'} onRetry={reload} /><Link to="/admin/orders" className="text-secondary underline">Back to orders</Link></>;

  return (
    <>
      <PageHeader title={order.order_number} subtitle={`${order.customer_name} · ${order.customer_phone}${order.customer_email ? ' · ' + order.customer_email : ''}`}
        actions={<><Btn variant="secondary" onClick={() => setEditing(true)} data-testid="edit-order">Edit details</Btn><Link to="/admin/orders"><Btn variant="ghost">Back to orders</Btn></Link></>} />
      <div className="flex flex-wrap gap-2 mb-space-md">
        <Badge tone={order.current_status === 'completed' ? 'good' : 'info'}>{orderStatusLabel(order.current_status)}</Badge>
        {order.is_delayed && <Badge tone="warn">Delayed</Badge>}
        <span className="font-body-sm text-slate-text">{order.work_type}</span>
      </div>
      {order.is_delayed && <p className="mb-space-md p-3 rounded bg-amber-50 text-amber-900 font-body-sm" data-testid="delay-reason">Delay reason: {order.delay_reason}</p>}
      <p className="font-body-md text-on-surface mb-space-md">{order.description}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 space-y-gutter">
          <StatusForm order={order} onSaved={save} />
          <Card title="History">
            <ol className="space-y-3" data-testid="history">{[...order.history].reverse().map((h) => (
              <li key={h.id} className="font-body-sm border-l-2 border-secondary pl-3">
                <p><strong className="text-primary">{orderStatusLabel(h.new_status)}</strong>{h.previous_status && h.previous_status !== h.new_status ? ` (from ${orderStatusLabel(h.previous_status)})` : ''} <span className="text-slate-text">· {formatDate(h.created_at)}</span> {h.is_delayed && <Badge tone="warn">Delayed</Badge>}</p>
                <p>{h.update_message}</p>
                {h.delay_reason && <p className="text-amber-800">Delay: {h.delay_reason}</p>}
                {h.internal_note && <p className="text-slate-text italic">Internal: {h.internal_note}</p>}
              </li>))}</ol>
          </Card>
          <Card title="Notifications for this order">
            {notes.data ? <NotificationTable items={notes.data.items} onChanged={notes.reload} /> : notes.error ? <ErrorBox message={notes.error} onRetry={notes.reload} /> : <Loading />}
          </Card>
        </div>
        <div className="space-y-gutter">
          <Card title="Dates">
            <dl className="font-body-sm space-y-2 mb-space-sm">
              <div className="flex justify-between"><dt className="text-slate-text">Order date</dt><dd>{formatDate(order.order_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-text">Agreed (original)</dt><dd data-testid="agreed-date">{formatDate(order.agreed_completion_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-text">Current estimate</dt><dd className="font-semibold" data-testid="estimated-date">{formatDate(order.estimated_completion_date)}</dd></div>
            </dl>
            {order.revisions.length > 0 && <ul className="font-body-sm space-y-2 mb-space-sm" data-testid="revisions">{order.revisions.map((r) => <li key={r.id} className="bg-alabaster-muted rounded p-2">{formatDate(r.previous_date)} → <strong>{formatDate(r.revised_date)}</strong><br /><span className="text-slate-text">{r.reason}</span></li>)}</ul>}
            <ReviseDate order={order} onSaved={save} />
          </Card>
          <Commitments order={order} onSaved={async () => { const o = await adminApi.order(order.id); save(o); }} />
          <NotifyBox order={order} onSent={notes.reload} />
        </div>
      </div>
      {editing && <EditContact order={order} onSaved={save} onClose={() => setEditing(false)} />}
    </>
  );
}
