import { useState } from 'react';
import Icon from '../ui/Icon';
import { testimonials } from '../../data/testimonials';

export default function TestimonialSlider() {
  const [i, setI] = useState(0);
  const n = testimonials.length;
  const go = (d: number) => setI((v) => (v + d + n) % n);
  const t = testimonials[i];
  const arrow = 'absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-surface text-primary shadow-md hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center z-10';
  return (
    <section className="w-full bg-surface-container-low py-space-xl" aria-roledescription="carousel" aria-label="Customer testimonials">
      <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-2">Testimonials</span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">What Our Customers Say</h2>
        </div>
        <div className="relative max-w-4xl mx-auto px-6 md:px-0">
          <button type="button" aria-label="Previous testimonial" onClick={() => go(-1)} className={`${arrow} left-0 md:-left-6`}><Icon name="chevron_left" className="text-[24px]" /></button>
          <button type="button" aria-label="Next testimonial" onClick={() => go(1)} className={`${arrow} right-0 md:-right-6`}><Icon name="chevron_right" className="text-[24px]" /></button>
          <figure key={t.id} className="bg-surface rounded-lg shadow-md px-10 md:px-20 py-12 text-center space-y-6" aria-live="polite" data-testid="testimonial">
            <span className="inline-block font-label-sm text-label-sm uppercase tracking-widest text-secondary bg-alabaster-muted px-3 py-1 rounded">Review</span>
            <div className="flex justify-center gap-1 text-secondary">{Array.from({ length: 5 }).map((_, k) => <Icon key={k} name="star" filled className="text-[18px]" />)}</div>
            <blockquote className="font-headline-sm text-headline-sm text-primary italic">“{t.quote}”</blockquote>
            <figcaption className="font-label-md text-label-md uppercase tracking-wider text-slate-text">{t.name} · {t.note}</figcaption>
          </figure>
          <div className="flex justify-center items-center gap-2 mt-6" role="tablist" aria-label="Choose testimonial">
            {testimonials.map((x, k) => (
              <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={`Show testimonial ${k + 1}`} onClick={() => setI(k)}
                className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-secondary' : 'w-2 bg-outline-variant'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
