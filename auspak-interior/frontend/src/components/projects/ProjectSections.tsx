import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';

/** Shared "have a similar project?" call to action. Every button goes to /contact. */
export function ProjectsCTA({ title = 'Have a Similar Project in Mind?' }: { title?: string }) {
  return (
    <section className="w-full py-16 bg-background">
      <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
        <div className="relative w-full bg-primary-container text-on-primary rounded-xl p-8 md:p-14 overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-primary tracking-tight">{title}</h2>
              <p className="font-body-lg text-body-lg text-primary-fixed-dim max-w-xl">
                Contact Auspak Interior to discuss your requirements for a kitchen, wardrobe or interior doors.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-secondary text-on-secondary hover:bg-secondary-fixed hover:text-on-secondary-fixed font-label-md text-label-md uppercase tracking-widest px-7 py-4 rounded transition-all shadow-md">
                <Icon name="calendar_month" className="text-[18px]" /><span>Request a Consultation</span>
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-surface-container-high/15 hover:bg-surface-container-high/25 text-on-primary font-label-md text-label-md uppercase tracking-widest px-7 py-4 rounded transition-colors">
                <Icon name="chat" className="text-[18px]" /><span>WhatsApp Studio Direct</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
