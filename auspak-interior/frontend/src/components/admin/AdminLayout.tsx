import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import './admin.css';

interface NavItem { to: string; label: string; icon: string; end?: boolean; badge?: number | null; tone?: 'gold' | 'light' }

const badgeTone = { gold: 'bg-amber-700/80 text-amber-100', light: 'bg-amber-300 text-amber-950' } as const;

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  // Counts for the sidebar badges. If the request fails the badges are simply not shown.
  const { data: summary } = useAsync(() => adminApi.summary(), [pathname]);
  useEffect(() => { setOpen(false); }, [pathname]);

  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Staff';
  const items: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: 'dashboard_customize', end: true },
    { to: '/admin/orders', label: 'Orders', icon: 'receipt', badge: summary?.total_orders, tone: 'gold' },
    { to: '/admin/enquiries', label: 'Enquiries', icon: 'architecture', badge: summary?.new_enquiries, tone: 'light' },
    { to: '/admin/notifications', label: 'Notifications', icon: 'bell' },
    ...(isAdmin ? [
      { to: '/admin/designs', label: 'Gallery / Projects', icon: 'image' },
      { to: '/admin/users', label: 'Users / Staff', icon: 'group' },
    ] : []),
  ];
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between gap-3 px-3.5 py-2.5 border-l-[3px] text-sm font-medium transition-colors ${isActive
      ? 'bg-[#121518] text-amber-300 border-amber-400 rounded-r-lg shadow-inner'
      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg'}`;

  const search = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    nav(v ? `/admin/orders?q=${encodeURIComponent(v)}` : '/admin/orders');
  };

  return (
    <div className="min-h-screen bg-surface lg:pl-72" data-testid="admin-layout">
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-hidden="true" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#191d21] text-white flex flex-col justify-between border-r border-[#262b30] shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full invisible lg:visible lg:translate-x-0'}`}>
        <div className="flex flex-col min-h-0">
          <div className="px-6 pt-7 pb-6 border-b border-white/[0.08] relative">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="admin-brand-dot w-2.5 h-2.5 bg-amber-400 rounded-[999px]" />
              <span className="font-headline-md text-xl font-bold tracking-tight text-white">AUSPAK</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">{roleLabel}</span>
            </div>
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-neutral-400 mt-2">Islamabad workshop</p>
            <button type="button" className="lg:hidden absolute top-5 right-4 w-9 h-9 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.05]" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="close" className="text-[18px]" /></button>
          </div>
          <nav aria-label="Admin navigation" className="flex flex-col gap-1.5 px-3 pt-6 overflow-y-auto" onClick={() => setOpen(false)}>
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={link} aria-label={i.label}>
                <span className="flex items-center gap-3"><Icon name={i.icon} className="text-[20px]" />{i.label}</span>
                {i.badge ? <span aria-hidden="true" className={`text-[11px] font-semibold px-2 py-0.5 rounded-[999px] ${badgeTone[i.tone ?? 'gold']}`}>{i.badge}</span> : null}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 m-3.5 bg-[#121518] rounded-xl border border-white/[0.08]">
          <Link to="/" className="md:hidden flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.08] text-sm text-neutral-300 hover:text-white"><Icon name="open_in_new" className="text-[16px]" />View website</Link>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Signed in</span>
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[999px] bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-[999px] h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-200 truncate">{user?.full_name}</p>
          <p className="text-[11px] text-neutral-400 mt-1">{roleLabel} account</p>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-[#e8e4db] px-4 sm:px-8 flex items-center gap-3 sm:gap-5">
          <button type="button" className="lg:hidden w-10 h-10 shrink-0 rounded border border-[#e8e4db] bg-white flex items-center justify-center" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" className="text-[20px]" /></button>
          <form onSubmit={search} role="search" className="flex-1 min-w-0 max-w-xl flex items-center gap-2.5 text-slate-text">
            <Icon name="search" className="text-[20px]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Global search" placeholder="Search orders by number, name or phone..." className="w-full min-w-0 bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-slate-text/70 focus:outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-3 sm:gap-5 shrink-0">
            <Link to="/" className="hidden md:inline-flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant hover:text-primary"><Icon name="open_in_new" className="text-[18px]" />View website</Link>
            <div className="hidden sm:flex items-center gap-3 pl-5 border-l border-[#e8e4db]" data-testid="admin-user">
              <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center"><Icon name="person" className="text-[18px]" /></span>
              <span className="leading-tight">
                <span className="block font-label-lg text-[12px] font-bold uppercase tracking-wider text-primary max-w-[11rem] truncate">{user?.full_name}</span>
                <span className="block font-label-sm text-label-sm uppercase tracking-wider text-secondary">{user?.role}</span>
              </span>
            </div>
            <button type="button" aria-label="Log out" onClick={async () => { await logout(); nav('/'); }} className="flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-error hover:opacity-80"><Icon name="logout" className="text-[18px]" /><span className="hidden sm:inline">Log out</span></button>
          </div>
        </header>
        <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10"><Outlet /></main>
      </div>
    </div>
  );
}
