import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import type { TrackingResult } from '../../types';
import { formatDate } from '../../utils/format';

export default function OrderResult({ order }: { order: TrackingResult }) {
  const cur = Math.max(0, order.stages.findIndex((s) => s.state === 'current'));
  const done = order.stages.every((s) => s.state === 'done');
  const progressPct = done ? 100 : (cur / (order.stages.length - 1)) * 100;

  return (
    <div className="space-y-space-lg" data-testid="order-result">
      <div className="bg-surface-container-lowest rounded-xl shadow-lg p-space-md md:p-space-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent pointer-events-none blur-2xl" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-space-lg relative z-10">
          <div className="space-y-space-sm max-w-3xl">
            <span className="inline-block px-3 py-1 rounded bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-widest">Order: {order.order_number}</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight" data-testid="order-project">{order.work_type}</h2>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-2 bg-alabaster-muted/80 p-space-md rounded-xl">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text">Current Status</span>
            <div className="inline-flex items-center gap-2">
              {!done && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" /></span>}
              <span className="font-headline-sm text-headline-sm text-primary" data-testid="order-status">{order.current_status_label}</span>
            </div>
            {order.is_delayed && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-label-sm uppercase tracking-wider" data-testid="delayed-badge">Delayed</span>}
          </div>
        </div>
        <div className="mt-space-lg pt-space-md grid grid-cols-1 sm:grid-cols-3 gap-gutter border-t border-on-surface/5 relative z-10">
          <div><span className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text block">Order Date</span><span className="font-body-lg text-body-lg text-primary font-medium">{formatDate(order.order_date)}</span></div>
          <div><span className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text block">Agreed Completion Date</span><span className="font-body-lg text-body-lg text-primary font-medium" data-testid="agreed-date">{formatDate(order.agreed_completion_date)}</span></div>
          <div><span className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text block">Current Estimate</span><span className="font-body-lg text-body-lg text-primary font-medium" data-testid="estimated-date">{formatDate(order.estimated_completion_date)}</span>
            {order.date_revised && <span className="block font-body-sm text-body-sm text-secondary">Revised from the agreed date</span>}</div>
        </div>
        {order.is_delayed && (
          <div role="status" className="mt-space-md p-4 rounded bg-amber-50 text-amber-900 flex items-start gap-3 relative z-10" data-testid="delay-notice">
            <Icon name="info" className="text-[20px] mt-0.5" />
            <div><p className="font-label-md text-label-md uppercase tracking-wider">Delay information</p><p className="font-body-sm text-body-sm">{order.delay_reason}</p></div>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-lg p-space-md md:p-space-xl">
        <div className="mb-space-lg"><span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">Progress</span><h3 className="font-headline-md text-headline-md text-primary">Order Timeline</h3></div>
        <ol className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2 relative" aria-label="Order progress">
          <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-[3px] bg-alabaster-muted" />
          <div className="hidden md:block absolute top-6 left-[10%] h-[3px] bg-secondary transition-all duration-700" style={{ width: `${progressPct * 0.8}%` }} />
          {order.stages.map((st, i) => {
            const circle = st.state === 'done' ? 'bg-primary-container text-on-primary' : st.state === 'current' ? 'bg-secondary text-on-secondary ring-4 ring-secondary/20' : 'bg-alabaster-muted text-slate-text';
            return (
              <li key={st.status} data-state={st.state} aria-current={st.state === 'current' ? 'step' : undefined} className="relative z-10 flex md:flex-col items-center gap-3 md:text-center">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center shadow-md ${circle}`}>
                  {st.state === 'done' ? <Icon name="check" className="text-[20px]" /> : st.state === 'current' ? <Icon name="schedule" className="text-[20px]" /> : <span className="font-label-md text-label-md">{i + 1}</span>}
                </div>
                <div>
                  <span className={`font-label-md text-label-md block ${st.state === 'pending' ? 'text-slate-text' : 'text-primary'}`}>{st.label}</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-text">{st.state === 'done' ? 'Completed' : st.state === 'current' ? 'In progress' : 'Pending'}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-lg p-space-md md:p-space-xl space-y-space-md">
        <div>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">Latest Update</span>
          <p className="font-body-lg text-body-lg text-primary mt-2" data-testid="latest-update">{order.progress.length ? order.progress[order.progress.length - 1].message : 'No updates have been posted yet.'}</p>
          {order.last_update && <p className="font-body-sm text-slate-text mt-1">Updated {formatDate(order.last_update)}</p>}
        </div>
        {order.progress.length > 1 && (
          <ul className="space-y-3 border-t border-on-surface/5 pt-space-md" data-testid="progress-history">
            {[...order.progress].reverse().map((u, k) => (
              <li key={k} className="flex gap-3 font-body-sm text-body-sm"><span className="text-slate-text w-28 shrink-0">{formatDate(u.date)}</span><span className="text-on-surface"><strong className="font-medium text-primary">{u.status_label}:</strong> {u.message}</span></li>
            ))}
          </ul>
        )}
      </div>

      {order.date_revisions.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl shadow-lg p-space-md md:p-space-xl" data-testid="date-revisions">
          <h3 className="font-headline-md text-headline-md text-primary mb-space-sm">Changes to the completion date</h3>
          <ul className="space-y-3">{order.date_revisions.map((r, i) => (
            <li key={i} className="font-body-sm text-body-sm"><strong className="text-primary">{formatDate(r.previous_date)} → {formatDate(r.revised_date)}</strong><span className="text-slate-text"> (changed {formatDate(r.date)})</span><br /><span className="text-on-surface">{r.reason}</span></li>
          ))}</ul>
        </div>
      )}

      {order.commitments.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl shadow-lg p-space-md md:p-space-xl" data-testid="commitments">
          <h3 className="font-headline-md text-headline-md text-primary mb-space-sm">Agreed commitments</h3>
          <ul className="space-y-3">{order.commitments.map((c, i) => (
            <li key={i} className="font-body-sm text-body-sm flex flex-wrap items-baseline gap-x-3"><span className="text-on-surface">{c.commitment_text}</span>
              <span className="text-slate-text">{c.due_date ? `Due ${formatDate(c.due_date)}` : `Agreed ${formatDate(c.agreed_date)}`}</span>
              <span className="px-2 py-0.5 rounded bg-alabaster-muted text-secondary uppercase tracking-wider font-label-sm">{c.status}</span></li>
          ))}</ul>
        </div>
      )}

      <p className="font-body-md text-slate-text">Questions about this order? <Link className="text-secondary underline" to={`/contact?order=${encodeURIComponent(order.order_number)}`} data-testid="ask-about-order">Ask us about order {order.order_number}</Link>.</p>
    </div>
  );
}
