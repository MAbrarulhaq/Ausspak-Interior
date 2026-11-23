import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import ContactForm from '../components/ui/ContactForm';
import { hasRealPhone, mapsUrl, siteConfig, whatsappUrl } from '../data/siteConfig';
import { publicApi } from '../services/api';
import { useAsync } from '../hooks/useAsync';

const labelCls = 'font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-1';

export default function ContactPage() {
  const info = useAsync(() => publicApi.contact(), []).data;
  const waLink = info?.whatsapp_link ?? whatsappUrl();
  const waNumber = info?.whatsapp_number ?? (siteConfig.whatsappNumber ? `+${siteConfig.whatsappNumber}` : siteConfig.whatsappPlaceholderLabel);
  const address = info?.address ?? siteConfig.address;
  const facebook = info?.facebook_url ?? siteConfig.facebookUrl;
  return (
    <>
      <section className="w-full max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin pt-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-6">
          <Link to="/" className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text hover:text-primary flex items-center gap-1"><Icon name="home" className="text-[14px]" />Home</Link>
          <span className="text-slate-text/40 text-xs">/</span>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">Contact Us</span>
        </nav>
      </section>
      <section className="w-full max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin pb-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl">
          <div className="lg:col-span-7 bg-surface p-space-md sm:p-space-lg lg:p-space-xl rounded-lg shadow-md">
            <div className="mb-space-lg">
              <span className="font-label-md text-label-md uppercase tracking-widest text-secondary font-semibold block mb-space-xs">GET IN TOUCH</span>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-xs">Let's Discuss Your Project</h1>
              <p className="font-body-md text-body-md text-slate-text">Fill in your details below and our team will get in touch with you to discuss your interior requirements.</p>
            </div>
            <ContactForm />
          </div>

          <div className="lg:col-span-5 space-y-gutter">
            <div className="bg-surface-container-low p-space-md sm:p-space-lg rounded-lg space-y-space-md">
              <div>
                <span className={labelCls}>Company Details</span>
                <h2 className="font-headline-sm text-headline-sm text-primary">Auspak Interior</h2>
              </div>
              <div className="flex gap-3">
                <Icon name="location_on" className="text-[22px] text-secondary mt-0.5" />
                <div><span className={labelCls}>Address</span><p className="font-body-md text-body-md text-on-surface">{address}</p></div>
              </div>
              <div className="flex gap-3">
                <Icon name="call" className="text-[22px] text-secondary mt-0.5" />
                <div>
                  <span className={labelCls}>Phone</span>
                  {siteConfig.phones.map((p) => (
                    <p key={p.label} className="font-body-md text-body-md text-on-surface">
                      {hasRealPhone(p.tel) ? <a className="hover:text-secondary" href={`tel:${p.tel}`}>{p.display}</a> : p.display}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Icon name="chat" className="text-[22px] text-secondary mt-0.5" />
                <div>
                  <span className={labelCls}>WhatsApp</span>
                  <p className="font-body-sm text-body-sm text-slate-text mb-2">{waNumber}</p>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-link"
                    className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest px-5 py-3 rounded hover:bg-charcoal-dark transition-colors">
                    <Icon name="chat" className="text-[18px]" />Chat on WhatsApp<Icon name="open_in_new" className="text-[14px]" />
                  </a>
                </div>
              </div>
              {info?.email && (
                <div className="flex gap-3">
                  <Icon name="chat" className="text-[22px] text-secondary mt-0.5" />
                  <div><span className={labelCls}>Email</span><a className="font-body-md text-body-md text-on-surface hover:text-secondary" href={`mailto:${info.email}`}>{info.email}</a></div>
                </div>
              )}
              <div className="flex gap-3">
                <Icon name="schedule" className="text-[22px] text-secondary mt-0.5" />
                <div><span className={labelCls}>Business Hours</span><p className="font-body-md text-body-md text-slate-text">[Business hours to be added]</p></div>
              </div>
              <div className="flex gap-3">
                <Icon name="open_in_new" className="text-[22px] text-secondary mt-0.5" />
                <div><span className={labelCls}>Facebook</span>
                  <a className="font-body-md text-body-md text-on-surface hover:text-secondary underline" href={facebook} target="_blank" rel="noopener noreferrer">Auspak Interior on Facebook</a></div>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-charcoal-dark min-h-[260px] flex" id="location">
              <img src="/images/about-contact-background.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              <div className="relative z-10 p-space-md flex flex-col justify-between w-full">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-surface">Location</span>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-label-sm text-label-sm uppercase tracking-widest text-surface hover:text-secondary-fixed">Open in Google Maps<Icon name="arrow_outward" className="text-[14px]" /></a>
                </div>
                <div className="bg-surface/95 backdrop-blur rounded p-4 flex items-start gap-3">
                  <Icon name="pin_drop" className="text-[24px] text-secondary" />
                  <div><p className="font-label-md text-label-md uppercase tracking-wider text-primary">Auspak Interior</p><p className="font-body-sm text-body-sm text-slate-text">Main Service Road, Golra Road, opposite G-11/1, Islamabad</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
