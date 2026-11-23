import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { apiErrorMessage } from '../../services/api';

/** Form control (inputs, selects, textareas) used across the dashboard. */
export const ctl = 'w-full bg-surface-container-low border border-[#e8e4db] px-3.5 py-2.5 rounded text-on-surface font-body-sm text-body-sm placeholder:text-slate-text/70 transition-colors focus:bg-white focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

/** Shared table classes so every dashboard table looks the same. */
export const tableWrap = 'overflow-x-auto bg-white border border-[#e8e4db] rounded-lg shadow-sm';
export const tableBase = 'w-full min-w-[720px] text-left font-body-sm text-body-sm';
export const thead = 'bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-slate-text';
export const th = 'px-5 py-4 font-semibold';
export const td = 'px-5 py-4 align-top';
export const trow = 'border-t border-[#efece5] hover:bg-surface-container-low/60 transition-colors';
export const rowLink = 'text-secondary underline underline-offset-2 decoration-secondary/50 hover:decoration-secondary font-medium';

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-[#e8e4db] rounded-lg shadow-sm p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Page title block. `eyebrow` renders the small breadcrumb above the title (e.g. ['Islamabad atelier archive', 'Staff management']).
 * `divider` adds the thin rule under the header used on the dashboard and users pages.
 */
export function PageHeader({ title, subtitle, actions, eyebrow, divider = false }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: [string, string?]; divider?: boolean }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 mb-8 ${divider ? 'pb-6 border-b border-[#e8e4db]' : ''}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-label-sm text-label-sm uppercase tracking-[0.16em] mb-2">
            <span className="text-secondary">{eyebrow[0]}</span>
            {eyebrow[1] && <span className="text-slate-text"> / {eyebrow[1]}</span>}
          </p>
        )}
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">{title}</h1>
        {subtitle && <p className="font-body-sm text-body-sm text-slate-text mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gold';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-charcoal-dark',
  secondary: 'bg-surface-container text-primary hover:bg-surface-container-high',
  outline: 'bg-white text-primary border border-[#e8e4db] hover:bg-surface-container-low',
  gold: 'bg-secondary text-on-secondary hover:bg-[#5d4201]',
  danger: 'bg-error text-on-error hover:opacity-90',
  ghost: 'text-secondary hover:bg-surface-container-low',
};
export function Btn({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...p} className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded font-label-md text-label-md uppercase tracking-wider whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} />;
}

export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info'; dot?: boolean }) {
  const t = {
    neutral: 'bg-surface-container-high text-on-surface',
    good: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-amber-100 text-amber-800',
    bad: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-label-sm text-label-sm uppercase tracking-wider whitespace-nowrap ${t}`}>
      {dot && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[999px] bg-current opacity-80" />}
      {children}
    </span>
  );
}

export const Loading = ({ what = 'Loading' }: { what?: string }) => <p role="status" className="py-4 text-slate-text font-body-md">{what}...</p>;
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="p-3 rounded bg-error-container text-on-error-container font-body-sm flex items-center justify-between gap-3">
    <span>{message}</span>{onRetry && <button type="button" onClick={onRetry} className="underline font-label-md uppercase">Retry</button>}
  </div>
);
export const Notice = ({ children }: { children: ReactNode }) => <div role="status" className="p-3 rounded bg-emerald-50 text-emerald-900 font-body-sm">{children}</div>;

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 font-label-sm text-label-sm uppercase tracking-wider text-slate-text">
      <span>{label}</span>{children}{hint && <span className="normal-case tracking-normal text-slate-text">{hint}</span>}
    </label>
  );
}

/**
 * Result count and page buttons. With a single page it only shows the count, unless `embedded` is set:
 * embedded is the footer strip used inside a table card (always shows Previous / Page x of y / Next).
 */
export function Pagination({ page, total, pageSize, onPage, embedded = false }: { page: number; total: number; pageSize: number; onPage: (p: number) => void; embedded?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const count = `${total} ${total === 1 ? 'result' : 'results'}`;
  if (!embedded && pages <= 1) return <p className="text-slate-text font-body-sm mt-3">{count}</p>;
  const buttons = (
    <div className="flex items-center gap-3">
      <Btn variant="secondary" className="!py-1.5 !px-3" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Btn>
      <span className="font-label-md text-label-md uppercase tracking-wider text-primary" data-testid="page-info">Page {page} of {pages}</span>
      <Btn variant="secondary" className="!py-1.5 !px-3" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Btn>
    </div>
  );
  if (embedded) {
    return (
      <nav className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-surface-container-low border-t border-[#efece5]" aria-label="Pagination">
        <span className="flex items-center gap-2 font-body-sm text-slate-text"><span aria-hidden="true" className="w-1.5 h-1.5 rounded-[999px] bg-secondary" />{count}</span>
        {buttons}
      </nav>
    );
  }
  return (
    <nav className="flex flex-wrap items-center gap-3 mt-4" aria-label="Pagination">
      {buttons}
      <span className="font-body-sm text-slate-text">{count}</span>
    </nav>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#121518]/60 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white border border-[#e8e4db] rounded-lg shadow-xl w-full max-w-lg mt-12 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-text hover:text-primary text-2xl leading-none">×</button></div>
        {children}
      </div>
    </div>
  );
}

/** Runs an async action and tracks busy/error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError(null);
    try { return await fn(); } catch (e) { setError(apiErrorMessage(e)); return undefined; } finally { setBusy(false); }
  };
  return { run, busy, error, setError };
}
