import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { siteConfig, whatsappUrl, mapsUrl } from '../../data/siteConfig';
import { homeFor, useAuth } from '../../context/AuthContext';

export const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Our Services' },
  // { to: '/projects', label: 'Our Projects' },
  { to: '/about', label: 'About Us' },
  { to: '/track-order', label: 'Track Order' },
];

const base = 'font-label-lg text-label-lg uppercase tracking-wider py-1 transition-colors';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);

  const doLogout = async () => { await logout(); navigate('/'); };
  const accountLabel = user ? (user.role === 'customer' ? 'My Account' : 'Admin Dashboard') : '';

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,24,27,0.03)]">

      {/* TOP INFORMATION BAR */}
      <div className="w-full bg-[#292d38] border-t-2 border-[#d4af37] text-white">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin min-h-8 flex items-center justify-between gap-4 text-[10px] sm:text-xs">

          {/* Left: Location and Phone */}
          <div className="flex items-center gap-3 sm:gap-6">

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[#d4af37] transition-colors"
            >
              <Icon name="location" className="text-[#d4af37]" />
              <span>{siteConfig.address}</span>
            </a>

            {siteConfig.phones
              .filter((p) => p.label !== 'Email')
              .slice(0, 1)
              .map((p) => (
                <a
                  key={p.display}
                  href={`tel:${p.display.replace(/\D/g, '')}`}
                  className="hidden sm:flex items-center gap-1.5 hover:text-[#d4af37] transition-colors"
                >
                  <Icon name="phone" className="text-[#d4af37]" />
                  <span>{p.display}</span>
                </a>
              ))}
          </div>

          {/* Right: Studio and WhatsApp */}
          <div className="flex items-center gap-3 sm:gap-6">
            <span className="hidden sm:block text-[#d4af37] tracking-wider">
              Atelier & Millwork Studio
            </span>

            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact us on WhatsApp"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold px-3 py-1.5 rounded transition-colors"
            >
              {/* WhatsApp icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M12.04 2a9.9 9.9 0 0 0-8.48 15.01L2.1 22l5.13-1.35A9.95 9.95 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.05.8.82-2.97-.2-.31A8.1 8.1 0 1 1 12.04 20.1Zm4.45-6.07c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.15 1.51.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
              </svg>

              <span>WhatsApp Us</span>
            </a>
          </div>

        </div>
      </div>

      <div className="h-20 max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin flex items-center justify-between">
        <Link to="/" className="flex items-center gap-space-sm group" aria-label={`${siteConfig.companyName} home`}>
          <img src="/images/brand-mark.png" alt="Auspak Interior logo" className="h-12 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm uppercase tracking-wider text-primary">AUSSPAK INTERIOR</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text">Islamabad</span>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-8" aria-label="Main navigation">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `${base} ${isActive ? 'text-primary font-semibold border-b border-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-space-sm">
          {user ? (
            <div className="hidden lg:flex items-center gap-space-sm">
              <Link to={homeFor(user.role)} className={`${base} text-on-surface-variant hover:text-on-surface`} data-testid="account-link">{accountLabel}</Link>
              <button type="button" onClick={doLogout} className={`${base} text-on-surface-variant hover:text-on-surface`}>Log out</button>
            </div>
          ) : (
            <Link to="/login" className={`hidden lg:inline ${base} text-on-surface-variant hover:text-on-surface`} data-testid="login-link">Log in</Link>
          )}
          <Link to="/contact" className="hidden sm:inline-flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest px-6 py-3 rounded hover:bg-charcoal-dark transition-all">
            Contact Us
          </Link>
          <button type="button" className="lg:hidden w-10 h-10 rounded border border-outline-variant flex items-center justify-center text-primary"
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? 'close' : 'menu'} className="text-[22px]" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden bg-surface border-t border-outline-variant/40 px-margin-mobile md:px-margin-tablet py-space-md flex flex-col gap-1" aria-label="Mobile navigation">
          {[...navItems, { to: '/contact', label: 'Contact Us', end: false }].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `${base} py-3 ${isActive ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
              {n.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <Link to={homeFor(user.role)} className={`${base} py-3 text-on-surface-variant`}>{accountLabel}</Link>
              <button type="button" onClick={doLogout} className={`${base} py-3 text-left text-on-surface-variant`}>Log out</button>
            </>
          ) : (
            <Link to="/login" className={`${base} py-3 text-on-surface-variant`}>Log in</Link>
          )}
        </nav>
      )}
    </header>
  );
}
