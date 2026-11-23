import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import DesignCard from '../projects/DesignCard';
import { publicApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';

export default function FeaturedProjects() {
  const { data } = useAsync(() => publicApi.designs({ page_size: 4 }), []);
  if (!data || data.items.length === 0) return null; // nothing to feature yet (or the API is unavailable): hide the section
  return (
    <section className="w-full max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin py-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-12">
        <div className="max-w-2xl">
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-2">Our Work</span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Featured Projects</h2>
          <p className="font-body-md text-body-md text-slate-text mt-3">Open any project to see its details and images.</p>
        </div>
        <Link to="/projects" className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-widest text-primary hover:text-secondary transition-colors">
          View All Projects <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {data.items.map((d) => <DesignCard key={d.id} design={d} height="h-[360px]" />)}
      </div>
    </section>
  );
}
