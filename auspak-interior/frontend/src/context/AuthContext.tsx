import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TOKEN_KEY, UNAUTHORIZED_EVENT, authApi } from '../services/api';
import type { Role, TokenResponse, User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (d: { full_name: string; email: string; phone?: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  isStaff: boolean;
  isAdmin: boolean;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return;
    authApi.me().then(setUser).catch(() => sessionStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onExpired);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onExpired);
  }, []);

  const accept = useCallback((r: TokenResponse) => { sessionStorage.setItem(TOKEN_KEY, r.access_token); setUser(r.user); return r.user; }, []);
  const value = useMemo<AuthState>(() => ({
    user, loading,
    login: async (email, password) => accept(await authApi.login(email, password)),
    signup: async (d) => accept(await authApi.signup(d)),
    logout: async () => { try { await authApi.logout(); } catch { /* the token is discarded either way */ } sessionStorage.removeItem(TOKEN_KEY); setUser(null); },
    isStaff: user?.role === 'staff' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
  }), [user, loading, accept]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

export const homeFor = (role: Role) => (role === 'customer' ? '/account' : '/admin');
