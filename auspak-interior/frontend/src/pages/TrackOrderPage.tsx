import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Icon from '../components/ui/Icon';
import OrderResult from '../components/tracking/OrderResult';
import { trackSchema, type TrackForm, normalizePhone } from '../utils/validation';
import { publicApi } from '../services/api';
import type { TrackingResult } from '../types';
import axios from 'axios';

const input = 'w-full bg-alabaster-muted/70 pl-11 pr-4 py-3.5 rounded font-body-md text-body-md text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary transition-all';

export default function TrackOrderPage() {
  const [order, setOrder] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<{ kind: 'notfound' | 'other'; message: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TrackForm>({ resolver: zodResolver(trackSchema), defaultValues: { order_number: '', phone: '' } });

  const onSubmit = async (v: TrackForm) => {
    setError(null); setOrder(null);
    try {
      setOrder(await publicApi.track(v.order_number.trim(), normalizePhone(v.phone)));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError({ kind: 'notfound', message: 'We could not find an order matching this order number and phone number. Please check both and try again.' });
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError({ kind: 'other', message: 'Too many attempts. Please wait a few minutes and try again.' });
      } else if (axios.isAxiosError(err) && !err.response) {
        setError({ kind: 'other', message: 'Cannot reach the server. Please check your connection and try again.' });
      } else {
        setError({ kind: 'other', message: 'Something went wrong while looking up your order. Please try again.' });
      }
    }
  };

  return (
    <>
      <section className="w-full relative overflow-hidden pt-8 pb-space-lg bg-surface">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-6">
            <Link to="/" className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text hover:text-primary flex items-center gap-1"><Icon name="home" className="text-[14px]" />Home</Link>
            <span className="text-slate-text/40 text-xs">/</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">Track Order</span>
          </nav>
          <div className="max-w-3xl space-y-space-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm uppercase tracking-widest">
              <Icon name="tune" className="text-[14px]" />Order Tracking
            </div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight">Track Your Order</h1>
            <p className="font-body-lg text-body-lg text-slate-text">Check the progress of your kitchen, wardrobe or interior door order using your Order ID and registered phone number.</p>
          </div>
        </div>
      </section>

      <section className="w-full pb-space-xl">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin space-y-space-lg">
          <div className="relative bg-surface-container-lowest rounded-xl shadow-xl p-space-md md:p-space-xl">
            <div className="flex items-start md:items-center gap-space-sm p-3.5 mb-space-lg rounded bg-alabaster-muted text-on-surface-variant">
              <Icon name="verified_user" className="text-secondary text-[22px]" />
              <p className="font-body-sm text-body-sm text-slate-text"><strong className="text-primary font-medium">Privacy:</strong> Order details are shown only when both your Order ID and your registered phone number match.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-md" aria-label="Order tracking form">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
                <div className="md:col-span-5 space-y-space-xs">
                  <label htmlFor="order_number" className="block font-label-sm text-label-sm uppercase tracking-widest text-slate-text font-semibold">Order ID</label>
                  <div className="relative"><Icon name="tag" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-text/70 text-[20px]" />
                    <input id="order_number" type="text" autoComplete="off" placeholder="e.g. AUS-7K3F9QXM" className={input} aria-invalid={!!errors.order_number} {...register('order_number')} /></div>
                  {errors.order_number && <p role="alert" className="font-body-sm text-body-sm text-error">{errors.order_number.message}</p>}
                </div>
                <div className="md:col-span-4 space-y-space-xs">
                  <label htmlFor="phone" className="block font-label-sm text-label-sm uppercase tracking-widest text-slate-text font-semibold">Registered Phone Number</label>
                  <div className="relative"><Icon name="phone_iphone" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-text/70 text-[20px]" />
                    <input id="phone" type="tel" autoComplete="off" placeholder="e.g. 0300 1234567" className={input} aria-invalid={!!errors.phone} {...register('phone')} /></div>
                  {errors.phone && <p role="alert" className="font-body-sm text-body-sm text-error">{errors.phone.message}</p>}
                </div>
                <div className="md:col-span-3 md:pt-[26px]">
                  <button type="submit" disabled={isSubmitting} className="w-full h-[52px] bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-widest px-6 rounded flex items-center justify-center gap-2 hover:bg-charcoal-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Checking...' : <>Track Order <Icon name="arrow_forward" className="text-[18px]" /></>}
                  </button>
                </div>
              </div>
            </form>
            <p className="mt-space-md font-body-sm text-body-sm text-slate-text">
              For your privacy, order details are shown only when the order number and the phone number registered on the order both match.
            </p>
          </div>

          {error && (
            <div role="alert" className="p-space-lg bg-surface-container-lowest rounded-xl shadow-md border-l-4 border-error flex flex-col md:flex-row items-start gap-space-md" data-testid="track-error">
              <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center shrink-0"><Icon name="search_off" className="text-[26px]" /></div>
              <div className="space-y-space-xs flex-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{error.kind === 'notfound' ? 'Order not found' : 'Could not check your order'}</h3>
                <p className="font-body-md text-body-md text-slate-text">{error.message}</p>
                <Link to="/contact" className="inline-block font-label-md text-label-md uppercase tracking-wider text-primary font-semibold hover:text-secondary">Contact Us for help →</Link>
              </div>
            </div>
          )}
          {order && <OrderResult order={order} />}
        </div>
      </section>
    </>
  );
}
