import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Icon from './Icon';
import Field, { inputClass } from './Field';
import { ORDER_QUESTION, MAX_FILES, enquirySchema, fileProblem, normalizePhone, type EnquiryFormValues } from '../../utils/validation';
import { apiErrorMessage, publicApi } from '../../services/api';
import { services } from '../../data/services';
import { useAsync } from '../../hooks/useAsync';

type Status = { kind: 'idle' } | { kind: 'success'; id: string } | { kind: 'error'; message: string };

export default function ContactForm() {
  const [params] = useSearchParams();
  const designSlug = params.get('design');
  const orderParam = params.get('order');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dropDesign, setDropDesign] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const design = useAsync(async () => (designSlug ? publicApi.design(designSlug).catch(() => null) : null), [designSlug]);
  const selected = !dropDesign ? design.data : null;

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { full_name: '', phone: '', email: '', work_type: orderParam ? ORDER_QUESTION : '', order_number: orderParam ?? '', description: '' },
  });
  const isOrderQuestion = watch('work_type') === ORDER_QUESTION;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const problem = incoming.map(fileProblem).find(Boolean);
    if (problem) { setFileError(problem); }
    else if (files.length + incoming.length > MAX_FILES) { setFileError(`You can attach at most ${MAX_FILES} images.`); }
    else { setFileError(null); setFiles([...files, ...incoming]); }
    if (fileInput.current) fileInput.current.value = '';
  };

  const onSubmit = async (v: EnquiryFormValues) => {
    setStatus({ kind: 'idle' });
    try {
      const res = await publicApi.submitEnquiry({
        full_name: v.full_name, email: v.email, phone: normalizePhone(v.phone), work_type: v.work_type, description: v.description,
        selected_design_id: selected?.id, order_number: v.work_type === ORDER_QUESTION ? v.order_number : undefined,
      }, files);
      setStatus({ kind: 'success', id: res.id });
      reset(); setFiles([]);
    } catch (err) {
      setStatus({ kind: 'error', message: apiErrorMessage(err, 'We could not send your enquiry. Please try again or contact us by phone or WhatsApp.') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-md" aria-label="Enquiry form">
      {selected && (
        <div className="flex items-center justify-between gap-3 p-3 rounded bg-alabaster-muted" data-testid="selected-design">
          <p className="font-body-sm text-body-sm text-primary">Enquiring about: <strong>{selected.title}</strong></p>
          <button type="button" onClick={() => setDropDesign(true)} className="font-label-sm uppercase tracking-wider text-secondary underline">Remove</button>
        </div>
      )}
      <Field id="full_name" label="Full Name" error={errors.full_name?.message}>
        <input id="full_name" type="text" autoComplete="name" placeholder="Your full name" className={inputClass} aria-invalid={!!errors.full_name} {...register('full_name')} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <Field id="phone" label="Phone Number" error={errors.phone?.message}>
          <input id="phone" type="tel" autoComplete="tel" placeholder="0300 1234567" className={inputClass} aria-invalid={!!errors.phone} {...register('phone')} />
        </Field>
        <Field id="email" label="Email Address" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" placeholder="name@example.com" className={inputClass} aria-invalid={!!errors.email} {...register('email')} />
        </Field>
      </div>
      <Field id="work_type" label="What do you need?" error={errors.work_type?.message}>
        <div className="relative">
          <select id="work_type" className={`${inputClass} pr-10 appearance-none`} aria-invalid={!!errors.work_type} {...register('work_type')}>
            <option value="">Select</option>
            {services.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
            <option value={ORDER_QUESTION}>{ORDER_QUESTION}</option>
            <option value="Other">Other</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant"><Icon name="expand_more" className="text-[18px]" /></div>
        </div>
      </Field>
      {isOrderQuestion && (
        <Field id="order_number" label="Order Number" error={errors.order_number?.message}>
          <input id="order_number" type="text" placeholder="e.g. AUS-7K3F9QXM" className={inputClass} aria-invalid={!!errors.order_number} {...register('order_number')} />
        </Field>
      )}
      <Field id="description" label={isOrderQuestion ? 'Your Question' : 'Project Description'} error={errors.description?.message}>
        <textarea id="description" rows={4} placeholder={isOrderQuestion ? 'What would you like to know about your order?' : 'Tell us about your space, measurements or design ideas...'} className={`${inputClass} resize-y`} aria-invalid={!!errors.description} {...register('description')} />
      </Field>

      {!isOrderQuestion && (
        <div className="space-y-2">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-text block">Reference images <span className="normal-case tracking-normal">(optional, up to {MAX_FILES}; JPG, PNG or WebP, 5 MB each)</span></span>
          <input ref={fileInput} id="reference_files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => addFiles(e.target.files)}
            className="block w-full text-body-sm font-body-sm text-slate-text file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-on-primary file:font-label-md" />
          {fileError && <p role="alert" data-testid="file-error" className="font-body-sm text-body-sm text-error">{fileError}</p>}
          {files.length > 0 && (
            <ul className="space-y-1" data-testid="file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 bg-surface-container-low rounded px-3 py-2 font-body-sm text-body-sm">
                  <span className="truncate">{f.name} <span className="text-slate-text">({(f.size / 1024).toFixed(0)} KB)</span></span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-error"><Icon name="close" className="text-[16px]" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="pt-space-xs">
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-space-xs bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest px-8 py-4 rounded hover:bg-charcoal-dark transition-all shadow-sm group disabled:opacity-60 disabled:cursor-not-allowed">
          <span>{isSubmitting ? 'Sending...' : 'Submit Inquiry'}</span>
          {!isSubmitting && <Icon name="arrow_forward" className="text-[18px] group-hover:translate-x-1 transition-transform" />}
        </button>
      </div>
      {status.kind === 'success' && (
        <div role="status" className="mt-space-sm p-4 bg-surface-container-high rounded text-on-surface" data-testid="inquiry-success">
          <div className="flex items-center gap-2 text-secondary"><Icon name="check_circle" className="text-[20px]" /><span className="font-label-md text-label-md uppercase tracking-wider">Inquiry Received</span></div>
          <p className="font-body-sm text-body-sm mt-1 text-slate-text">Thank you. We have received your enquiry (reference {status.id.slice(0, 8).toUpperCase()}) and will contact you.</p>
        </div>
      )}
      {status.kind === 'error' && (
        <div role="alert" className="mt-space-sm p-4 bg-error-container rounded text-on-error-container" data-testid="inquiry-error">
          <div className="flex items-center gap-2"><Icon name="error" className="text-[20px]" /><span className="font-label-md text-label-md uppercase tracking-wider">Could not send</span></div>
          <p className="font-body-sm text-body-sm mt-1">{status.message}</p>
        </div>
      )}
    </form>
  );
}
