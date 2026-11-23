import { z } from 'zod';

/** Accepts local and international numbers: digits with optional +, spaces, dashes and brackets (9-15 digits). */
export const normalizePhone = (v: string) => v.replace(/[\s\-()]/g, '');
export const phoneRegex = /^\+?\d{9,15}$/;

export const ORDER_QUESTION = 'Question about my order';
export const enquirySchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name.').max(120, 'Name is too long.'),
  phone: z.string().trim().min(1, 'Please enter your phone number.').refine((v) => phoneRegex.test(normalizePhone(v)), 'Enter a valid phone number, for example 0300 1234567.'),
  email: z.string().trim().min(1, 'Please enter your email address.').email('Enter a valid email address.'),
  work_type: z.string().min(1, 'Please choose what you need.'),
  order_number: z.string().trim().max(30).optional(),
  description: z.string().trim().min(10, 'Please describe your project (at least 10 characters).').max(4000, 'Description is too long.'),
}).refine((v) => v.work_type !== ORDER_QUESTION || (v.order_number ?? '').length > 0, { path: ['order_number'], message: 'Please enter your order number.' });
export type EnquiryFormValues = z.infer<typeof enquirySchema>;

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const OK_EXT = ['jpg', 'jpeg', 'png', 'webp'];
/** Returns an error message for a file the server would reject, or null. (The server re-checks everything.) */
export function fileProblem(f: File): string | null {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  if (!OK_EXT.includes(ext)) return `${f.name}: only JPG, JPEG, PNG and WebP images are accepted.`;
  if (f.size > MAX_FILE_BYTES) return `${f.name}: each image must be 5 MB or smaller.`;
  return null;
}

export const trackSchema = z.object({
  order_number: z.string().trim().min(1, 'Please enter your Order ID.'),
  phone: z.string().trim().min(1, 'Please enter the registered phone number.').refine((v) => phoneRegex.test(normalizePhone(v)), 'Enter a valid phone number.'),
});
export type TrackForm = z.infer<typeof trackSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Please enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  email: z.string().trim().min(1, 'Please enter your email.').email('Enter a valid email address.'),
  phone: z.string().trim().optional().refine((v) => !v || phoneRegex.test(normalizePhone(v)), 'Enter a valid phone number, for example 0300 1234567.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
});
export type SignupForm = z.infer<typeof signupSchema>;
