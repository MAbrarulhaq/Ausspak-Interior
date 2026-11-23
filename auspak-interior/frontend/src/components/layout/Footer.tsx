import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import { services } from '../../data/services';
import { navItems } from './Header';
import { siteConfig } from '../../data/siteConfig';

export default function Footer() {
  const link = 'font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors';
  return (
    <footer className="w-full bg-surface-container-low">
      <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin pt-space-xl pb-space-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter mb-space-xl">
          <div className="lg:col-span-4 space-y-space-md">
            <span className="font-headline-sm text-headline-sm uppercase tracking-wider text-primary">AUSPAK INTERIOR</span>
            <p className="font-body-md text-body-md text-slate-text max-w-sm">
              Spanish-style kitchens, custom kitchens, modern wardrobes and interior doors, made to your requirements in Islamabad.
            </p>
            <div className="pt-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-space-xs">Visit Us</span>
              <p className="font-body-sm text-body-sm text-on-surface">{siteConfig.address}</p>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-space-sm">
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-primary">Our Services</h4>
            <ul className="space-y-space-xs">
              {services.map((s) => (
                <li key={s.slug}><Link className={link} to={`/services#${s.slug}`}>{s.title}</Link></li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2 space-y-space-sm">
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-primary">Navigation</h4>
            <ul className="space-y-space-xs">
              {navItems.map((n) => (<li key={n.to}><Link className={link} to={n.to}>{n.label}</Link></li>))}
              <li><Link className={link} to="/contact">Contact Us</Link></li>
            </ul>
          </div>
          <div className="lg:col-span-3 space-y-space-sm">
            <h4 className="font-label-md text-label-md uppercase tracking-widest text-primary">Contact</h4>
            <div className="space-y-space-xs font-body-sm text-body-sm">
              {siteConfig.phones.map((p) => (
                <p key={p.label} className="text-on-surface-variant">{p.label}: <span className="text-on-surface">{p.display}</span></p>
              ))}
              <p className="pt-space-xs">
                <Link to="/contact" className="inline-flex items-center gap-space-xs font-label-md text-label-md uppercase tracking-wider text-secondary hover:text-on-surface transition-colors">
                  <Icon name="chat" className="text-[16px]" />WhatsApp Us
                </Link>
              </p>
            </div>
            <div className="pt-space-sm flex items-center gap-space-md text-on-surface-variant">
              <a href={siteConfig.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-label-sm text-label-sm uppercase tracking-widest">Facebook</a>
            </div>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider gap-space-sm">
          <p>© {new Date().getFullYear()} Auspak Interior. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
