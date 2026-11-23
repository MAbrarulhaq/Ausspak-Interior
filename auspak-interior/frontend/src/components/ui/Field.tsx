import type { ReactNode } from 'react';

export const inputClass = 'w-full bg-alabaster-muted px-4 py-3 rounded text-on-surface font-body-md placeholder:text-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-secondary transition-all shadow-sm';

export default function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-label-sm text-label-sm uppercase tracking-wider text-slate-text">{label} <span className="text-error">*</span></label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  );
}
