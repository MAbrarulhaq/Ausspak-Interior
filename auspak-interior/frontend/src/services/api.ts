import axios, { AxiosError } from 'axios';
import type {
  AdminDesign, AdminEnquiry, Category, ContactInfo, CustomerNotification, DashboardSummary, DesignDetail, DesignListItem, EnquiryCreated,
  EnquiryStatus, NotificationItem, OrderDetail, OrderListItem, OrderStatus, Page, TokenResponse, TrackingResult, User, Role, Commitment,
  CommitmentStatus, Channel, DeliveryStatus, PublicationStatus,
} from '../types';

export const TOKEN_KEY = 'auspak_token'; // sessionStorage: cleared when the browser tab is closed
export const UNAUTHORIZED_EVENT = 'auspak:unauthorized';

export const api = axios.create({ baseURL: `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`, timeout: 20000 });

api.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && sessionStorage.getItem(TOKEN_KEY) && !isLogin) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(err);
  },
);

/** Safe, readable message for any API error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Please check your connection and try again.';
    const d = err.response.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d) && d.length) return d.map((x: { field?: string; msg?: string }) => (x.field ? `${x.field}: ${x.msg}` : x.msg)).join('. ');
    if (err.response.status === 413) return 'The file is too large.';
    if (err.response.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return fallback;
}
export const statusOf = (err: unknown): number | undefined => (axios.isAxiosError(err) ? err.response?.status : undefined);

type Params = Record<string, string | number | boolean | undefined>;
const clean = (p?: Params) => Object.fromEntries(Object.entries(p ?? {}).filter(([, v]) => v !== undefined && v !== ''));

// ---------- auth ----------
export const authApi = {
  login: (email: string, password: string) => api.post<TokenResponse>('/auth/login', { email, password }).then((r) => r.data),
  signup: (d: { full_name: string; email: string; phone?: string; password: string }) => api.post<TokenResponse>('/auth/signup', d).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};

// ---------- public ----------
export const publicApi = {
  contact: () => api.get<ContactInfo>('/site/contact').then((r) => r.data),
  categories: () => api.get<Category[]>('/categories').then((r) => r.data),
  designs: (p?: { category?: string; style?: string; q?: string; page?: number; page_size?: number }) =>
    api.get<Page<DesignListItem>>('/designs', { params: clean(p) }).then((r) => r.data),
  design: (slug: string) => api.get<DesignDetail>(`/designs/${slug}`).then((r) => r.data),
  track: (order_number: string, phone: string) => api.post<TrackingResult>('/tracking/lookup', { order_number, phone }).then((r) => r.data),
  submitEnquiry: (f: { full_name: string; email: string; phone: string; work_type: string; description: string; selected_design_id?: string; order_number?: string }, files: File[]) => {
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => { if (v) fd.append(k, v); });
    files.forEach((file) => fd.append('files', file));
    return api.post<EnquiryCreated>('/enquiries', fd).then((r) => r.data);
  },
};

// ---------- customer ----------
export const customerApi = {
  favourites: (page = 1) => api.get<Page<DesignListItem>>('/favourites', { params: { page, page_size: 12 } }).then((r) => r.data),
  addFavourite: (id: string) => api.post(`/favourites/${id}`).then((r) => r.data),
  removeFavourite: (id: string) => api.delete(`/favourites/${id}`),
  notifications: (page = 1) => api.get<Page<CustomerNotification>>('/notifications', { params: { page } }).then((r) => r.data),
};

// ---------- staff / admin ----------
export interface OrderCreateInput {
  customer_name: string; customer_phone: string; customer_email?: string | null; work_type: string; description: string;
  order_date?: string; agreed_completion_date: string; estimated_completion_date?: string; current_status: OrderStatus;
  initial_message?: string; enquiry_id?: string; notify: boolean;
}
export const adminApi = {
  summary: () => api.get<DashboardSummary>('/admin/dashboard/summary').then((r) => r.data),

  orders: (p: { q?: string; status?: string; is_delayed?: string; sort_by?: string; sort_dir?: string; page?: number; page_size?: number }) =>
    api.get<Page<OrderListItem>>('/orders', { params: clean(p) }).then((r) => r.data),
  order: (id: string) => api.get<OrderDetail>(`/orders/${id}`).then((r) => r.data),
  createOrder: (d: OrderCreateInput) => api.post<OrderDetail>('/orders', d).then((r) => r.data),
  editOrder: (id: string, d: Partial<{ customer_name: string; customer_phone: string; customer_email: string; work_type: string; description: string }>) =>
    api.patch<OrderDetail>(`/orders/${id}`, d).then((r) => r.data),
  changeStatus: (id: string, d: { new_status?: OrderStatus; update_message: string; is_delayed?: boolean; delay_reason?: string; internal_note?: string; notify: boolean }) =>
    api.post<OrderDetail>(`/orders/${id}/status`, d).then((r) => r.data),
  reviseDate: (id: string, d: { revised_date: string; reason: string; notify: boolean }) => api.post<OrderDetail>(`/orders/${id}/revise-date`, d).then((r) => r.data),
  addCommitment: (id: string, d: { commitment_text: string; agreed_date: string; due_date?: string; notify: boolean }) =>
    api.post<Commitment>(`/orders/${id}/commitments`, d).then((r) => r.data),
  updateCommitment: (id: string, cid: string, d: { status?: CommitmentStatus; due_date?: string; commitment_text?: string; notify: boolean }) =>
    api.patch<Commitment>(`/orders/${id}/commitments/${cid}`, d).then((r) => r.data),
  notifyOrder: (id: string, d: { message: string; channels?: Channel[] }) => api.post<NotificationItem[]>(`/admin/orders/${id}/notify`, d).then((r) => r.data),

  enquiries: (p: { status?: string; q?: string; page?: number }) => api.get<Page<AdminEnquiry>>('/admin/enquiries', { params: clean(p) }).then((r) => r.data),
  enquiry: (id: string) => api.get<AdminEnquiry>(`/admin/enquiries/${id}`).then((r) => r.data),
  setEnquiryStatus: (id: string, status: EnquiryStatus) => api.patch<AdminEnquiry>(`/admin/enquiries/${id}`, { status }).then((r) => r.data),
  attachmentBlob: (eid: string, aid: string) => api.get<Blob>(`/admin/enquiries/${eid}/attachments/${aid}/file`, { responseType: 'blob' }).then((r) => r.data),

  notifications: (p: { delivery_status?: DeliveryStatus | ''; channel?: Channel | ''; order_id?: string; page?: number }) =>
    api.get<Page<NotificationItem>>('/admin/notifications', { params: clean(p) }).then((r) => r.data),
  retryNotification: (id: string) => api.post<NotificationItem>(`/admin/notifications/${id}/retry`).then((r) => r.data),

  // admin only
  adminDesigns: (p: { publication_status?: PublicationStatus | ''; category?: string; page?: number }) =>
    api.get<Page<AdminDesign>>('/admin/designs', { params: { ...clean(p), page_size: 24 } }).then((r) => r.data),
  adminDesign: (id: string) => api.get<AdminDesign>(`/admin/designs/${id}`).then((r) => r.data),
  createCategory: (d: { name: string; description?: string }) => api.post<Category>('/admin/categories', d).then((r) => r.data),
  createDesign: (d: { category_id: string; title: string; description: string; style?: string; publication_status: PublicationStatus; is_demonstration: boolean }) =>
    api.post<AdminDesign>('/admin/designs', d).then((r) => r.data),
  updateDesign: (id: string, d: Partial<{ category_id: string; title: string; description: string; style: string; publication_status: PublicationStatus; is_demonstration: boolean }>) =>
    api.patch<AdminDesign>(`/admin/designs/${id}`, d).then((r) => r.data),
  archiveDesign: (id: string) => api.delete<AdminDesign>(`/admin/designs/${id}`).then((r) => r.data),
  uploadDesignImage: (id: string, file: File, alt_text: string) => {
    const fd = new FormData(); fd.append('file', file); fd.append('alt_text', alt_text);
    return api.post<{ id: string; image_url: string }>(`/admin/designs/${id}/images`, fd).then((r) => r.data);
  },
  deleteDesignImage: (id: string, imageId: string) => api.delete(`/admin/designs/${id}/images/${imageId}`),
  users: (p: { role?: Role | ''; q?: string; page?: number }) => api.get<Page<User>>('/admin/users', { params: clean(p) }).then((r) => r.data),
  createUser: (d: { full_name: string; email: string; password: string; role: Role; phone?: string }) => api.post<User>('/admin/users', d).then((r) => r.data),
  updateUser: (id: string, d: Partial<{ full_name: string; role: Role; is_active: boolean }>) => api.patch<User>(`/admin/users/${id}`, d).then((r) => r.data),
};
