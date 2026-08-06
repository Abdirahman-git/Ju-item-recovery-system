'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, clearSession } from '@/lib/session';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const timer = window.setTimeout(() => {
      const isLogin = pathname === '/login';
      // Protect admin console — guests must sign in via /login
      if (!session && pathname?.startsWith('/admin')) {
        router.replace('/login');
      } else if (session && isLogin) {
        // /login always routes signed-in admins into the admin web
        router.replace('/admin');
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, session, pathname, router]);

  const setSession = useCallback((next) => {
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    router.replace('/login');
  }, [router]);

  return (
    <SessionContext.Provider value={{ session, setSession, logout, ready }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
