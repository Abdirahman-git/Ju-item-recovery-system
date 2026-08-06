'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/context/SessionProvider';
import { BadgeContext, createBadgeHelpers } from '@/context/AdminBadgeContext';
import { AdminHeaderActionsProvider } from '@/context/AdminHeaderActionsContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import AdminNavProgress from '@/components/admin/AdminNavProgress';
import AdminDataWarmup from '@/components/admin/AdminDataWarmup';
import SiteFooter from '@/components/SiteFooter';

function AdminShell({ children, badgeCounts }) {
  const { open, close, collapsed } = useSidebar();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent">
      <AdminNavProgress />
      {open ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(320px,85vw)] shrink-0 transition-[width,transform] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          collapsed ? 'lg:w-[92px]' : 'lg:w-[280px]'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <AdminSidebar badgeCounts={badgeCounts} onNavigate={close} showClose onClose={close} />
      </aside>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 lg:px-6">{children}</main>
        <SiteFooter className="glass-header !border-t-white/50 !bg-white/35 !text-slate-500" />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const { session, ready } = useSession();
  const [badgeCounts, setBadgeCounts] = useState({ pending: 0, claims: 0 });
  const badgeApi = useMemo(() => {
    const helpers = createBadgeHelpers(setBadgeCounts);
    return {
      badgeCounts,
      setBadgeCounts: helpers.setBadgeCounts,
      bumpBadge: helpers.bumpBadge,
    };
  }, [badgeCounts]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <BadgeContext.Provider value={badgeApi}>
      <SidebarProvider>
        <AdminHeaderActionsProvider>
          <AdminDataWarmup />
          <AdminShell badgeCounts={badgeCounts}>{children}</AdminShell>
        </AdminHeaderActionsProvider>
      </SidebarProvider>
    </BadgeContext.Provider>
  );
}
