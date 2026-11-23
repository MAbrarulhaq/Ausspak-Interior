import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

/** Redirects to the login page when logged out; shows an access message when the role is not allowed. */
export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="p-space-xl text-center font-body-md text-slate-text">Loading...</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!roles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto p-space-xl text-center space-y-space-sm" data-testid="forbidden">
        <h1 className="font-headline-md text-headline-md text-primary">You do not have access to this page</h1>
        <p className="font-body-md text-slate-text">Your account type cannot open this area.</p>
        <div className="flex justify-center gap-6">
          <Link to="/" className="inline-block font-label-md text-label-md uppercase tracking-widest text-secondary">Go to Home</Link>
          <button type="button" onClick={() => logout()} className="font-label-md text-label-md uppercase tracking-widest text-slate-text">Log out</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
