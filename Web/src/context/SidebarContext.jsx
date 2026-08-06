'use client';

import { createContext, useCallback, useContext, useState } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const openSidebar = useCallback(() => setOpen(true), []);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);
  const setPendingNav = useCallback((href) => setPendingHref(href), []);
  const clearPendingNav = useCallback(() => setPendingHref(null), []);

  return (
    <SidebarContext.Provider
      value={{
        open,
        toggle,
        close,
        openSidebar,
        collapsed,
        toggleCollapsed,
        pendingHref,
        setPendingNav,
        clearPendingNav,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
