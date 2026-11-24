import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { siteConfig } from '../../data/siteConfig';
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
