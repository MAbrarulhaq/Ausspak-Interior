
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

const input =
  'w-full bg-white border border-stone-200 pl-12 pr-4 py-4 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-stone-400 outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all duration-200';

export default function TrackOrderPage() {
  const [order, setOrder] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<{
    kind: 'notfound' | 'other';
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrackForm>({
    resolver: zodResolver(trackSchema),
    defaultValues: { order_number: '', phone: '' },
  });

  const onSubmit = async (v: TrackForm) => {
    setError(null);
    setOrder(null);

    try {
      setOrder(
        await publicApi.track(v.order_number.trim(), normalizePhone(v.phone)),
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError({
          kind: 'notfound',
          message:
            'We could not find an order matching this order number and phone number. Please check both and try again.',
        });
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError({
          kind: 'other',
          message:
            'Too many attempts. Please wait a few minutes and try again.',
        });
      } else if (axios.isAxiosError(err) && !err.response) {
        setError({
          kind: 'other',
          message:
            'Cannot reach the server. Please check your connection and try again.',
        });
      } else {
        setError({
          kind: 'other',
          message:
            'Something went wrong while looking up your order. Please try again.',
        });
      }
    }
  };

  return (
    <>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-[#f7f6f3]">
        {/* Decorative background */}
        <div className="absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
        <div className="absolute right-[15%] bottom-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin pt-7 pb-16 md:pb-20">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-12">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-slate-text/70 hover:text-primary transition-colors font-label-sm text-label-sm"
            >
              <Icon name="home" className="text-[15px]" />
              Home
            </Link>

            <Icon name="chevron_right" className="text-[14px] text-slate-text/30" />

            <span className="font-label-sm text-label-sm text-primary font-semibold">
              Track Order
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-secondary/20 shadow-sm mb-6">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                <span className="font-label-sm text-label-sm uppercase tracking-[0.16em] text-primary font-semibold">
                  Order Tracking
        </span>
              </div>

              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary leading-[1.08] tracking-tight max-w-2xl">
                Your order.
                <span className="block text-secondary mt-1">
                  Your peace of mind.
                </span>
              </h1>

              <p className="font-body-lg text-body-lg text-slate-text/80 mt-6 max-w-xl leading-relaxed">
                From craftsmanship to delivery, keep track of your interior project
                and know exactly where things stand.
              </p>

              <div className="flex flex-wrap gap-5 mt-8">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-stone-200">
                    <Icon
                      name="verified_user"
                      className="text-[17px] text-secondary"
                    />
                  </div>
                  <span className="font-body-sm text-body-sm text-slate-text">
                    Secure tracking
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-stone-200">
                    <Icon name="schedule" className="text-[17px] text-secondary" />
                  </div>
                  <span className="font-body-sm text-body-sm text-slate-text">
                    Real-time status
                  </span>
                </div>
              </div>
            </div>

            {/* Right decorative tracking illustration */}
            <div className="lg:col-span-5">
              <div className="relative max-w-md mx-auto lg:ml-auto">
                <div className="absolute inset-4 bg-secondary/10 rounded-3xl rotate-3" />

                <div className="relative rounded-3xl bg-white p-6 md:p-8 shadow-xl shadow-primary/5 border border-white">
                  <div className="flex items-center justify-between mb-7">
                    <div>
                      <p className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text/60">
                        Project journey
                      </p>
                      <h3 className="font-headline-sm text-headline-sm text-primary mt-1">
                        From workshop to home
                      </h3>
                    </div>

                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-secondary">
                      <Icon name="local_shipping" className="text-[23px]" />
                    </div>
                  </div>

                  <div className="space-y-0">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-secondary">
                          <Icon name="check_circle" className="text-[20px]" />
                        </div>
                        <div className="w-px h-12 bg-secondary/40" />
                      </div>

                      <div className="pt-1 pb-5">
                        <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                          Step 01
                        </p>
                        <p className="font-body-md text-body-md font-semibold text-primary mt-1">
                          Order confirmed
                        </p>
                        <p className="font-body-sm text-body-sm text-slate-text/70 mt-1">
                          Your project is registered
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-secondary">
                          <Icon name="design_services" className="text-[20px]" />
                        </div>
                        <div className="w-px h-12 bg-stone-200" />
                      </div>

                      <div className="pt-1 pb-5">
                        <p className="font-label-sm text-label-sm text-slate-text/50 uppercase tracking-wider">
                          Step 02
                        </p>
                        <p className="font-body-md text-body-md font-semibold text-primary mt-1">
                          Production & preparation
                        </p>
                        <p className="font-body-sm text-body-sm text-slate-text/70 mt-1">
                          Crafted with attention to detail
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-stone-400">
                          <Icon name="local_shipping" className="text-[20px]" />
                        </div>
                      </div>

                      <div className="pt-1">
                        <p className="font-label-sm text-label-sm text-slate-text/50 uppercase tracking-wider">
                          Step 03
                        </p>
                        <p className="font-body-md text-body-md font-semibold text-primary mt-1">
                          Ready for delivery
                        </p>
                        <p className="font-body-sm text-body-sm text-slate-text/70 mt-1">
                          Bringing your vision home
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 p-4 rounded-xl bg-[#f8f7f4] border border-stone-100 flex items-center gap-3">
                    <Icon name="info" className="text-[18px] text-secondary" />
                    <p className="font-body-sm text-body-sm text-slate-text/80">
                      Enter your order details below to see your actual progress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRACKING FORM SECTION */}
      <section className="w-full py-12 md:py-16 bg-white">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
          <div className="max-w-5xl mx-auto">
            {/* Section heading */}
            <div className="text-center mb-8 md:mb-10">
              <span className="font-label-sm text-label-sm uppercase tracking-[0.18em] text-secondary font-semibold">
                Tracking portal
              </span>

              <h2 className="font-headline-sm text-headline-sm md:text-3xl text-primary mt-3">
                Find your order
              </h2>

              <p className="font-body-md text-body-md text-slate-text/70 mt-3 max-w-xl mx-auto">
                Enter your order number and registered phone number to get your
                latest order update.
              </p>
            </div>

            {/* Form card */}
            <div className="bg-[#fbfaf8] border border-stone-200 rounded-2xl md:rounded-3xl p-5 md:p-9 shadow-[0_15px_50px_rgba(31,31,31,0.05)]">
              {/* Privacy */}
              <div className="flex items-start gap-4 p-4 md:p-5 rounded-xl bg-white border border-stone-200 mb-7">
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary shrink-0">
                  <Icon
                    name="verified_user"
                    className="text-[21px] text-secondary"
                  />
                </div>

                <div>
                  <p className="font-label-md text-label-md text-primary font-semibold">
                    Your information is protected
                  </p>
                  <p className="font-body-sm text-body-sm text-slate-text/75 mt-1 leading-relaxed">
                    We verify your Order ID and registered phone number before
                    displaying any order information. Your details remain private.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-6"
                aria-label="Order tracking form"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Order ID */}
                  <div className="space-y-2">
                    <label
                      htmlFor="order_number"
                      className="block font-label-sm text-label-sm uppercase tracking-[0.12em] text-primary font-semibold"
                    >
                      Order ID
                    </label>

                    <div className="relative">
                      <Icon
                        name="tag"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-text/50 text-[20px]"
                      />

                      <input
                        id="order_number"
                        type="text"
                        autoComplete="off"
                        placeholder="e.g. AUS-7K3F9QXM"
                        className={input}
                        aria-invalid={!!errors.order_number}
                        {...register('order_number')}
                      />
                    </div>

                    {errors.order_number && (
                      <p role="alert" className="font-body-sm text-body-sm text-error">
                        {errors.order_number.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="block font-label-sm text-label-sm uppercase tracking-[0.12em] text-primary font-semibold"
                    >
                      Registered Phone Number
                    </label>

                    <div className="relative">
                      <Icon
                        name="phone_iphone"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-text/50 text-[20px]"
                      />

                      <input
                        id="phone"
                        type="tel"
                        autoComplete="off"
                        placeholder="e.g. 0300 1234567"
                        className={input}
                        aria-invalid={!!errors.phone}
                        {...register('phone')}
                      />
                    </div>

                    {errors.phone && (
                      <p role="alert" className="font-body-sm text-body-sm text-error">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full min-h-[56px] bg-primary text-white font-label-md text-label-md uppercase tracking-[0.14em] px-6 py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-charcoal-dark transition-all duration-200 shadow-lg shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Icon name="refresh" className="text-[18px] animate-spin" />
                      Checking your order...
                    </>
                  ) : (
                    <>
                      Track My Order
                      <Icon
                        name="arrow_forward"
                        className="text-[19px] transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Footer note */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-stone-200">
                <div className="flex items-center gap-2 text-slate-text/60">
                  <Icon name="lock" className="text-[15px]" />
                  <span className="font-body-sm text-body-sm">
                    Secure order verification
                  </span>
                </div>

                <Link
                  to="/contact"
                  className="font-label-sm text-label-sm text-primary hover:text-secondary transition-colors flex items-center gap-1.5"
                >
                  Need help?
                  <Icon name="arrow_outward" className="text-[15px]" />
                </Link>
              </div>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="mt-8 p-6 md:p-7 bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col md:flex-row items-start gap-4"
              data-testid="track-error"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-error flex items-center justify-center shrink-0">
                <Icon name="search_off" className="text-[24px]" />
              </div>

              <div className="space-y-2 flex-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {error.kind === 'notfound'
                    ? 'Order not found'
                    : 'Could not check your order'}
                </h3>

                <p className="font-body-md text-body-md text-slate-text">
                  {error.message}
                </p>

                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1 font-label-md text-label-md uppercase tracking-wider text-primary font-semibold hover:text-secondary transition-colors pt-2"
                >
                  Contact us for help
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
            </div>
          )}

          {/* Order result */}
          {order && (
            <div className="mt-8">
              <OrderResult order={order} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
