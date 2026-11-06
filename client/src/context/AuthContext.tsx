import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { api } from '@/api/client';
import type { LoginResponse, MeResponse, Role, Utilisateur } from '@/types/api';

interface AuthContextValue {
  user: Utilisateur | null;
  loading: boolean;
  login: (matricule: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const { data } = await api.get<MeResponse>('/auth/me');
        if (!annule) setUser(data.user);
      } catch {
        if (!annule) setUser(null);
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('rsi:unauthorized', handler);
    return () => window.removeEventListener('rsi:unauthorized', handler);
  }, []);

  const login = useCallback(async (matricule: string, motDePasse: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      matricule, mot_de_passe: motDePasse,
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  }, []);

  const hasRole = useCallback((role: Role) => user?.role === role, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, hasRole }),
    [user, loading, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}