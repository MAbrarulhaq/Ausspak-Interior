import { useState } from 'react';
import { Badge, Btn, tableBase, td, th, thead, trow, useAction } from './ui';
import Icon from '../ui/Icon';
import { adminApi } from '../../services/api';
import type { NotificationItem } from '../../types';
import { deliveryLabel } from '../../utils/labels';
import { formatDate } from '../../utils/format';

const tone = { sent: 'good', failed: 'bad', pending: 'warn', not_sent: 'neutral' } as const;
const sentence = (s: string) => { const t = s.replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };

export default function NotificationTable({ items, onChanged }: { items: NotificationItem[]; onChanged?: () => void }) {
  const [rows, setRows] = useState(items);
  const [open, setOpen] = useState<string | null>(null);
  const { run, busy, error } = useAction();
  if (rows !== items && items !== rows && items.length !== rows.length) setRows(items);
  const retry = async (id: string) => {
    const updated = await run(() => adminApi.retryNotification(id));
    if (updated) { setRows(rows.map((r) => (r.id === id ? updated : r))); onChanged?.(); }
  };
  if (items.length === 0) return <p className="text-slate-text font-body-sm px-5 py-6" data-testid="no-notifications">No notifications.</p>;
  return (
    <div className="space-y-2">
      {error && <p role="alert" className="text-error font-body-sm px-5 pt-3">{error}</p>}
      <div className="overflow-x-auto">
        <table className={`${tableBase} min-w-[820px]`} data-testid="notifications-table">
          <thead className={thead}><tr>{['When', 'Type', 'Channel / to', 'Status & details', 'Actions'].map((h, i) => <th key={h} className={`${th} ${i === 4 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>{items.map((n) => {
            const row = rows.find((r) => r.id === n.id) ?? n;
            return (
              <tr key={row.id} className={trow}>
                <td className={`${td} whitespace-nowrap`}>{formatDate(row.created_at)}</td>
                <td className={td}>{sentence(row.notification_type)}</td>
                <td className={td}><span className="block font-label-sm text-label-sm uppercase tracking-wider text-secondary">{row.channel}</span><span className="break-all">{row.recipient}</span></td>
                <td className={td}>
                  <Badge tone={tone[row.delivery_status]}>{deliveryLabel[row.delivery_status]}</Badge>
                  {row.error_message && <p className="text-slate-text mt-2 max-w-sm">{row.error_message}</p>}
                  {open === row.id && <pre className="whitespace-pre-wrap bg-surface-container-low border border-[#e8e4db] rounded p-3 mt-2 max-w-md text-xs font-body-sm">{row.message}</pre>}
                </td>
                <td className={td}>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Btn variant="ghost" className="!py-1.5 !px-2" onClick={() => setOpen(open === row.id ? null : row.id)}>{open === row.id ? 'Hide' : 'View'}</Btn>
                      {row.delivery_status !== 'sent' && <Btn variant="secondary" className="!py-1.5 !px-3" disabled={busy} onClick={() => retry(row.id)}>Retry</Btn>}
                    </div>
                    {row.whatsapp_link && <a href={row.whatsapp_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-secondary text-on-secondary hover:bg-[#5d4201] font-label-md text-label-md uppercase tracking-wider whitespace-nowrap transition-colors" data-testid="wa-link"><Icon name="chat" className="text-[16px]" />Send on WhatsApp</a>}
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
