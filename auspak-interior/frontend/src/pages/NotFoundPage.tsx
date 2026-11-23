import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin py-space-xl text-center space-y-space-md">
      <p className="font-label-md text-label-md uppercase tracking-widest text-secondary">Error 404</p>
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Page not found</h1>
      <p className="font-body-md text-slate-text">The page you are looking for does not exist.</p>
      <Link to="/" className="inline-flex items-center bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest px-6 py-3 rounded hover:bg-charcoal-dark transition-colors">Go to Home</Link>
    </section>
  );
}
