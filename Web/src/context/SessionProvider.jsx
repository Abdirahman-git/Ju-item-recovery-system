'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSession, clearSession } from '@/lib/session';

const SessionContext = createContext(null);

function hardNavigate(href) {
  if (typeof window === 'undefined') return;
  // Avoid Next App Router "action dispatched before initialization" races
  // (auth gates should be a full navigation anyway).
  window.location.assign(href);
}

export function SessionProvider({ children }) {
  // Always start null so SSR HTML matches the first client render.
  // localStorage is only available in the browser after mount.
  const [session, setSessionState] = useState(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionState(getSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;

    const isLogin = pathname === '/login';
    const isAdmin = pathname.startsWith('/admin');
    const isPortal = pathname.startsWith('/portal');

    if (!session) {
      if (isAdmin || isPortal) {
        hardNavigate('/login');
        return;
      }
    } else {
      if (isAdmin && session.role !== 'admin') {
        // Block regular users from admin area
        hardNavigate('/portal');
        return;
      }
      if (isLogin) {
        if (session.role === 'admin') {
          hardNavigate('/admin');
        } else {
          hardNavigate('/portal');
        }
      }
    }
  }, [ready, session, pathname]);

  useEffect(() => {
    const onExpired = () => {
      clearSession();
      setSessionState(null);
      if (pathname?.startsWith('/admin') || pathname?.startsWith('/portal')) {
        hardNavigate('/login?reason=session');
      }
    };
    window.addEventListener('ju-admin-session-expired', onExpired);
    return () => window.removeEventListener('ju-admin-session-expired', onExpired);
  }, [pathname]);

  const setSession = useCallback((next) => {
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    hardNavigate('/login');
  }, []);

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
