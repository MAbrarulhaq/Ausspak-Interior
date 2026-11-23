import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import DesignCard from '../components/projects/DesignCard';
import FavouriteButton from '../components/projects/FavouriteButton';
import { ProjectsCTA } from '../components/projects/ProjectSections';
import { publicApi, statusOf } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { mediaUrl } from '../utils/media';

export default function ProjectDetailPage() {
  const { slug = '' } = useParams();
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [slug]);
  const { data: design, loading, error, reload } = useAsync(() => publicApi.design(slug), [slug]);
  const related = useAsync(async () => {
    if (!design) return [];
    const page = await publicApi.designs({ category: design.category.slug, page_size: 6 });
    return page.items.filter((d) => d.slug !== design.slug).slice(0, 3);
  }, [design?.slug]);

  if (loading && !design) return <p className="p-space-xl text-center font-body-md text-slate-text" role="status">Loading project...</p>;

  if (!design) {
    const missing = error && /not found/i.test(error);
    return (
      <section className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin py-space-xl text-center space-y-space-md">
        <Icon name="search_off" className="text-[48px] text-secondary mx-auto" />
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">{missing ? 'Project not found' : 'Could not load this project'}</h1>
        <p className="font-body-md text-slate-text">{missing ? 'We could not find a project at this address. It may have been moved or removed.' : error}</p>
        <div className="flex justify-center gap-3">
          {!missing && <button type="button" onClick={reload} className="px-6 py-3 border border-outline-variant rounded font-label-md uppercase tracking-widest">Try again</button>}
          <Link to="/projects" className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest px-6 py-3 rounded hover:bg-charcoal-dark"><Icon name="chevron_left" className="text-[18px]" />Back to Projects</Link>
        </div>
      </section>
    );
  }

  const images = design.images;
  const img = images[index];
  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <>
      <section className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 mb-6">
          <Link to="/" className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text hover:text-primary flex items-center gap-1"><Icon name="home" className="text-[14px]" />Home</Link>
          <span className="text-slate-text/40 text-xs">/</span>
          <Link to="/projects" className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text hover:text-primary">Our Projects</Link>
          <span className="text-slate-text/40 text-xs">/</span>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">{design.title}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 rounded bg-primary text-on-primary">{design.category.name}</span>
            {design.is_demonstration && <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-secondary" />Sample project</span>}
          </div>
          <div className="flex items-center gap-3">
            <FavouriteButton designId={design.id} initial={design.is_favourite} className="border border-outline-variant" />
            <Link to="/projects" className="inline-flex items-center gap-2 border border-outline-variant text-primary font-label-md text-label-md uppercase tracking-widest px-5 py-2.5 rounded hover:bg-surface-container transition-colors"><Icon name="chevron_left" className="text-[18px]" />Back to Projects</Link>
          </div>
        </div>

        {img ? (
          <div className="relative w-full h-[320px] md:h-[560px] rounded overflow-hidden bg-charcoal-dark shadow-inner" data-testid="hero-image">
            <img key={img.id} src={mediaUrl(img.image_url)} alt={img.alt_text || design.title} className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 bg-charcoal-dark/75 backdrop-blur-md px-3 py-1.5 rounded text-on-primary font-label-sm text-label-sm flex items-center gap-2">
              <Icon name="photo_camera" className="text-[16px] text-secondary" /><span>Image {index + 1} of {images.length}{design.is_demonstration ? ' (illustrative)' : ''}</span>
            </div>
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous image" onClick={() => step(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/85 hover:bg-surface text-primary flex items-center justify-center shadow-md"><Icon name="chevron_left" className="text-[22px]" /></button>
                <button type="button" aria-label="Next image" onClick={() => step(1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/85 hover:bg-surface text-primary flex items-center justify-center shadow-md"><Icon name="chevron_right" className="text-[22px]" /></button>
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-[240px] rounded bg-surface-container-high flex items-center justify-center text-slate-text font-body-md" data-testid="no-images">No images have been added to this project yet.</div>
        )}

        {images.length > 1 && (
          <div className="space-y-2 mt-4">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-slate-text block">More Images</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((im, i) => (
                <button key={im.id} type="button" onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`} aria-current={i === index}
                  className={`rounded overflow-hidden h-20 md:h-24 bg-surface-container-high transition-transform hover:scale-[1.02] ${i === index ? 'ring-2 ring-secondary' : 'opacity-60 hover:opacity-100'}`}>
                  <img src={mediaUrl(im.image_url)} alt={im.alt_text} loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-10 pb-space-lg">
          <div className="md:col-span-7 space-y-4">
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">{design.title}</h1>
            <p className="font-body-md text-body-md text-slate-text leading-relaxed whitespace-pre-line">{design.description}</p>
            {design.is_demonstration && (
              <div className="p-4 bg-alabaster-muted rounded">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-1">Demonstration content</span>
                <p className="font-body-sm text-body-sm text-on-surface">The images on this page are illustrative placeholders. They are not photographs of a completed Auspak Interior customer project.</p>
              </div>
            )}
          </div>
          <div className="md:col-span-5 flex flex-col justify-between bg-surface-container-low p-5 rounded space-y-4">
            <div>
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary block pb-2">Project Details</span>
              <dl className="space-y-2.5 font-body-sm text-body-sm">
                <div className="flex justify-between gap-4 py-1"><dt className="text-slate-text">Category:</dt><dd className="font-medium text-primary text-right">{design.category.name}</dd></div>
                {design.style && <div className="flex justify-between gap-4 py-1"><dt className="text-slate-text">Style:</dt><dd className="font-medium text-primary text-right">{design.style}</dd></div>}
                <div className="flex justify-between gap-4 py-1"><dt className="text-slate-text">Materials and finishes:</dt><dd className="font-medium text-primary text-right">Chosen with you during consultation</dd></div>
              </dl>
            </div>
            <Link to={`/contact?design=${encodeURIComponent(design.slug)}`} className="w-full py-3 px-4 bg-primary hover:bg-charcoal-dark text-on-primary font-label-md text-label-md uppercase tracking-widest rounded flex items-center justify-center gap-2 transition-colors">
              <span>Inquire About This Design</span><Icon name="chat" className="text-[16px]" />
            </Link>
          </div>
        </div>
      </section>

      {related.data && related.data.length > 0 && (
        <section className="w-full py-10 bg-surface-container-low" aria-labelledby="related-title">
          <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
            <h2 id="related-title" className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-8">Related Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">{related.data.map((d) => <DesignCard key={d.id} design={d} height="h-[300px]" />)}</div>
          </div>
        </section>
      )}
      <ProjectsCTA />
    </>
  );
}
