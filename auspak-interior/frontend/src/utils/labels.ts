import type { CommitmentStatus, DeliveryStatus, EnquiryStatus, OrderStatus } from '../types';

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'order_received', label: 'Order Received' },
  { value: 'designing', label: 'Designing' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready_for_collection', label: 'Ready for Collection' },
  { value: 'completed', label: 'Completed' },
];
export const orderStatusLabel = (s: OrderStatus) => ORDER_STATUSES.find((x) => x.value === s)?.label ?? s;
export const ENQUIRY_STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: 'new', label: 'New' }, { value: 'in_review', label: 'In review' }, { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted to order' }, { value: 'closed', label: 'Closed' },
];
export const COMMITMENT_STATUSES: CommitmentStatus[] = ['active', 'revised', 'fulfilled', 'cancelled'];
export const deliveryLabel: Record<DeliveryStatus, string> = { pending: 'Pending', sent: 'Sent', failed: 'Failed', not_sent: 'Not sent (recorded only)' };
export const todayISO = () => new Date().toISOString().slice(0, 10);
