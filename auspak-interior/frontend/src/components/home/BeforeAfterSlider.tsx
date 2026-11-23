import { useRef, useState } from 'react';
import Icon from '../ui/Icon';

export default function BeforeAfterSlider() {
  const ref = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPct(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <section className="w-full bg-surface-container py-space-xl">
      <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
        <div className="max-w-2xl mb-12">
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-2">Before and After</span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Interior Transformation</h2>
          <p className="font-body-md text-body-md text-slate-text mt-3">From an empty space to a finished interior. Drag the slider to compare.</p>
        </div>
        <div className="relative w-full max-w-5xl mx-auto rounded overflow-hidden select-none shadow-xl bg-surface">
          <div ref={ref} className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden cursor-ew-resize touch-none"
            role="slider" tabIndex={0} aria-label="Before and after comparison" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
            onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') setPct((p) => Math.max(0, p - 5)); if (e.key === 'ArrowRight') setPct((p) => Math.min(100, p + 5)); }}>
            <img className="absolute inset-0 w-full h-full object-cover pointer-events-none" src="/images/before-after-after.jpg" alt="Illustrative image of a finished kitchen" />
            <div className="absolute top-4 right-4 bg-primary/80 backdrop-blur-md px-3 py-1 rounded text-surface font-label-sm text-label-sm uppercase tracking-wider z-10 pointer-events-none">After (illustrative)</div>
            <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
              <img className="absolute inset-0 w-full h-full object-cover" src="/images/before-after-before.jpg" alt="Illustrative image of an unfinished kitchen space" />
              <div className="absolute top-4 left-4 bg-charcoal-dark/90 backdrop-blur-md px-3 py-1 rounded text-surface font-label-sm text-label-sm uppercase tracking-wider z-10">Before (illustrative)</div>
            </div>
            <div className="absolute top-0 bottom-0 -ml-0.5 w-1 bg-surface z-20 flex items-center justify-center pointer-events-none shadow-[0_0_12px_rgba(0,0,0,0.4)]" style={{ left: `${pct}%` }}>
              <div className="w-10 h-10 rounded-full bg-surface text-primary flex items-center justify-center shadow-lg"><Icon name="compare_arrows" className="text-[20px] text-secondary" /></div>
            </div>
          </div>
          <div className="p-4 bg-surface text-center">
            <p className="font-body-sm text-body-sm text-slate-text">Auspak Interior projects.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
