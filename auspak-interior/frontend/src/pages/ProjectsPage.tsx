import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import DesignCard from '../components/projects/DesignCard';
import { ProjectsCTA } from '../components/projects/ProjectSections';
import { publicApi } from '../services/api';
import { useAsync } from '../hooks/useAsync';

const PAGE_SIZE = 9;
const pattern = [
  ['lg:col-span-8', 'h-[380px] md:h-[460px]'], ['lg:col-span-4', 'h-[380px] md:h-[460px]'],
  ['lg:col-span-4', 'h-[360px] md:h-[420px]'], ['lg:col-span-4', 'h-[360px] md:h-[420px]'], ['lg:col-span-4', 'h-[360px] md:h-[420px]'],
  ['lg:col-span-8', 'h-[380px] md:h-[460px]'], ['lg:col-span-4', 'h-[360px] md:h-[420px]'],
  ['lg:col-span-6', 'h-[360px] md:h-[420px]'], ['lg:col-span-6', 'h-[360px] md:h-[420px]'],
];

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);

  const cats = useAsync(() => publicApi.categories(), []);
  const list = useAsync(() => publicApi.designs({ category, q, page, page_size: PAGE_SIZE }), [category, q, page]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const allCount = cats.data?.reduce((n, c) => n + c.design_count, 0);

  const tab = (active: boolean) => `flex items-center gap-2 px-5 py-2.5 rounded text-label-md font-label-md uppercase tracking-wider transition-all duration-200 ${active ? 'bg-primary text-on-primary shadow-sm hover:bg-charcoal-dark' : 'bg-surface-container-low text-on-surface-variant hover:bg-alabaster-muted hover:text-on-surface'}`;

  return (
    <>
      <section className="relative w-full pt-8 pb-12 overflow-hidden">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-6">
            <Link to="/" className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text hover:text-primary transition-colors flex items-center gap-1"><Icon name="home" className="text-[14px]" />Home</Link>
            <span className="text-slate-text/40 text-xs">/</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">Our Projects</span>
          </nav>
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-alabaster-muted shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-secondary" /><span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-medium">Portfolio</span></div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary tracking-tight">Our Projects</h1>
            <p className="font-body-lg text-body-lg text-slate-text pt-1">Browse kitchens, wardrobes and interior doors. Projects marked "Sample project" show illustrative images until photographs of completed Auspak Interior work are added.</p>
          </div>
        </div>
      </section>

      <section className="sticky top-20 z-30 w-full bg-surface/90 backdrop-blur-md py-4">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter projects by category">
            <button type="button" role="tab" aria-selected={!category} className={tab(!category)} onClick={() => set({ category: '' })}>
              <span>All Projects</span>{allCount !== undefined && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-container-high text-slate-text">{allCount}</span>}
            </button>
            {cats.data?.filter((c) => c.design_count > 0).map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={category === c.slug} className={tab(category === c.slug)} onClick={() => set({ category: c.slug })}>
                <span>{c.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-container-high text-slate-text">{c.design_count}</span>
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() }); }} className="flex items-center gap-2" role="search">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="bg-alabaster-muted px-4 py-2.5 rounded text-body-sm font-body-sm focus:outline-none focus:ring-1 focus:ring-secondary w-44 md:w-56" />
            <button type="submit" aria-label="Search" className="w-10 h-10 rounded bg-primary text-on-primary flex items-center justify-center hover:bg-charcoal-dark"><Icon name="search" className="text-[18px]" /></button>
          </form>
        </div>
      </section>

      <section className="w-full py-10 bg-background">
        <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
          {list.loading && !list.data ? (
            <p className="text-center font-body-md text-slate-text py-16" role="status">Loading projects...</p>
          ) : list.error ? (
            <div className="text-center py-16 space-y-3" role="alert"><p className="font-body-md text-error">{list.error}</p><button type="button" onClick={list.reload} className="font-label-md uppercase tracking-widest text-secondary underline">Try again</button></div>
          ) : list.data && list.data.items.length === 0 ? (
            <p className="text-center font-body-md text-slate-text py-16" data-testid="empty-state">No projects found{q ? ` for "${q}"` : ''}.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter">
                {list.data?.items.map((d, i) => {
                  const useBento = !category && !q && list.data!.items.length === PAGE_SIZE;
                  const [span, height] = useBento ? pattern[i] : ['lg:col-span-4', 'h-[360px] md:h-[420px]'];
                  return <DesignCard key={d.id} design={d} span={span} height={height} />;
                })}
              </div>
              {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-4 mt-10" aria-label="Pagination">
                  <button type="button" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} className="px-5 py-2.5 rounded bg-surface-container-low font-label-md uppercase tracking-wider disabled:opacity-40">Previous</button>
                  <span className="font-label-md text-slate-text" data-testid="page-indicator">Page {page} of {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => set({ page: String(page + 1) })} className="px-5 py-2.5 rounded bg-surface-container-low font-label-md uppercase tracking-wider disabled:opacity-40">Next</button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
      <ProjectsCTA />
    </>
  );
}
