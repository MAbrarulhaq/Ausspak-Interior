export type Role = 'customer' | 'staff' | 'admin';
export type OrderStatus = 'order_received' | 'designing' | 'in_progress' | 'ready_for_collection' | 'completed';
export type PublicationStatus = 'draft' | 'published' | 'archived';
export type EnquiryStatus = 'new' | 'in_review' | 'contacted' | 'converted' | 'closed';
export type CommitmentStatus = 'active' | 'revised' | 'fulfilled' | 'cancelled';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'not_sent';
export type Channel = 'email' | 'whatsapp';

export interface Page<T> { items: T[]; total: number; page: number; page_size: number }

export interface User { id: string; full_name: string; email: string; phone: string | null; role: Role; is_active: boolean; created_at: string }
export interface TokenResponse { access_token: string; token_type: string; expires_in: number; user: User }

export interface Category { id: string; name: string; slug: string; description: string | null; design_count: number }
export interface CategoryRef { id: string; name: string; slug: string }
export interface DesignImage { id: string; image_url: string; alt_text: string; display_order: number }
export interface DesignListItem {
  id: string; title: string; slug: string; description: string; style: string | null; is_demonstration: boolean;
  category: CategoryRef; cover_image: DesignImage | null; image_count: number; is_favourite: boolean;
}
export interface DesignDetail extends DesignListItem { images: DesignImage[]; created_at: string; updated_at: string }
export interface AdminDesign extends DesignDetail { publication_status: PublicationStatus }

export interface ContactInfo { business_name: string; whatsapp_number: string; whatsapp_link: string; email: string; address: string; facebook_url: string }

// ----- public tracking -----
export interface TrackingStage { status: OrderStatus; label: string; state: 'done' | 'current' | 'pending' }
export interface TrackingResult {
  order_number: string; work_type: string; order_date: string; current_status: OrderStatus; current_status_label: string;
  stages: TrackingStage[]; is_delayed: boolean; delay_reason: string | null; agreed_completion_date: string; estimated_completion_date: string;
  date_revised: boolean; last_update: string | null;
  progress: { status: OrderStatus; status_label: string; message: string; is_delayed: boolean; date: string }[];
  date_revisions: { previous_date: string; revised_date: string; reason: string; date: string }[];
  commitments: { commitment_text: string; agreed_date: string; due_date: string | null; status: CommitmentStatus }[];
}

// ----- enquiries -----
export interface Attachment { id: string; original_filename: string; content_type: string; file_size: number; created_at: string }
export interface EnquiryCreated { id: string; status: EnquiryStatus; attachments: Attachment[]; attachment_token: string; message: string }
export interface AdminEnquiry {
  id: string; user_id: string | null; full_name: string; email: string; phone: string; work_type: string; selected_design_id: string | null;
  order_number_reference: string | null; description: string; status: EnquiryStatus; created_at: string; updated_at: string; attachments: Attachment[];
}

// ----- orders (admin/staff) -----
export interface HistoryEntry {
  id: string; previous_status: OrderStatus | null; new_status: OrderStatus; update_message: string; internal_note: string | null;
  is_delayed: boolean; delay_reason: string | null; updated_by: string | null; created_at: string;
}
export interface Revision { id: string; previous_date: string; revised_date: string; reason: string; changed_by: string | null; created_at: string }
export interface Commitment { id: string; commitment_text: string; agreed_date: string; due_date: string | null; status: CommitmentStatus; created_at: string; updated_at: string }
export interface OrderListItem {
  id: string; order_number: string; customer_name: string; customer_phone: string; work_type: string; current_status: OrderStatus; is_delayed: boolean;
  order_date: string; agreed_completion_date: string; estimated_completion_date: string; created_at: string; updated_at: string;
}
export interface OrderDetail extends OrderListItem {
  customer_email: string | null; customer_id: string | null; enquiry_id: string | null; description: string; delay_reason: string | null;
  history: HistoryEntry[]; revisions: Revision[]; commitments: Commitment[];
}

export interface NotificationItem {
  id: string; user_id: string | null; order_id: string | null; notification_type: string; channel: Channel; recipient: string; subject: string | null;
  message: string; delivery_status: DeliveryStatus; provider_message_id: string | null; error_message: string | null; sent_at: string | null;
  created_at: string; whatsapp_link: string | null;
}
export interface CustomerNotification { id: string; notification_type: string; channel: Channel; subject: string | null; message: string; created_at: string }

export interface DashboardSummary {
  total_orders: number; orders_by_status: Record<string, number>; in_progress: number; delayed: number; ready_for_collection: number; completed: number;
  new_enquiries: number; published_designs: number | null; draft_designs: number | null; failed_notifications: number | null;
}
