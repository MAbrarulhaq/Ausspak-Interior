import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import FavouriteButton from './FavouriteButton';
import type { DesignListItem } from '../../types';
import { mediaUrl } from '../../utils/media';

interface Props { design: DesignListItem; span?: string; height?: string; onFavouriteChange?: (fav: boolean) => void }

/** Clickable design card. Links to the design's own page (/projects/:slug). */
export default function DesignCard({ design, span = '', height = 'h-[360px] md:h-[420px]', onFavouriteChange }: Props) {
  const cover = design.cover_image;
  return (
    <article className={`${span} group relative bg-surface-container-lowest rounded overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300`} data-testid="project-card">
      <Link to={`/projects/${design.slug}`} className="flex flex-col justify-between h-full" aria-label={`View project: ${design.title}`}>
        <div className={`relative w-full ${height} overflow-hidden bg-surface-container-high`}>
          {cover ? (
            <img src={mediaUrl(cover.image_url)} alt={cover.alt_text || design.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-text font-label-md">No image yet</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark/70 via-charcoal-dark/10 to-transparent pointer-events-none" />
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="bg-primary/85 backdrop-blur-md text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 rounded">{design.category.name}</span>
            {design.is_demonstration && (
              <span className="bg-surface/85 backdrop-blur-md text-secondary font-label-sm text-label-sm uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />Sample project
              </span>
            )}
          </div>
          <div className="absolute bottom-5 right-5 opacity-90 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-2 bg-surface text-primary font-label-md text-label-md uppercase tracking-wider px-4 py-2 rounded shadow-md group-hover:bg-primary group-hover:text-on-primary transition-all duration-200">
              <span>View Project</span><Icon name="arrow_forward" className="text-[16px]" />
            </span>
          </div>
          <div className="absolute bottom-5 left-5 right-28 pointer-events-none">
            <h3 className="font-headline-md text-headline-md text-on-primary">{design.title}</h3>
            {design.style && <p className="font-body-sm text-body-sm text-surface-container-low line-clamp-1 mt-1 opacity-90">{design.style}</p>}
          </div>
        </div>
        <div className="p-5 flex items-center justify-between bg-surface-container-low text-slate-text font-label-sm text-label-sm">
          <span className="flex items-center gap-1.5"><Icon name="image" className="text-[15px] text-secondary" />{design.image_count} {design.image_count === 1 ? 'image' : 'images'}</span>
        </div>
      </Link>
      <FavouriteButton designId={design.id} initial={design.is_favourite} onChange={onFavouriteChange} className="absolute top-4 right-4 z-10" />
    </article>
  );
}
