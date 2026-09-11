'use client';

import PortalNavbar from '@/components/portal/PortalNavbar';
import PortalMobileNav from '@/components/portal/PortalMobileNav';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionProvider';
import { fetchPortalNotifications } from '@/lib/portal';

export default function PortalShell({ children }) {
  const { session, ready } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!ready || !session?.email) return;
    const loadNotes = async () => {
      try {
        const notes = await fetchPortalNotifications(session.email);
        setUnreadCount(notes.filter((n) => !n.isRead).length);
      } catch {
        /* ignore */
      }
    };
    loadNotes();
    const timer = setInterval(loadNotes, 30000);
    return () => clearInterval(timer);
  }, [ready, session?.email]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900 antialiased pb-28 lg:pb-6">
      <PortalSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadCount}
      />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[280px]">
        <PortalNavbar
          onOpenSidebar={() => setSidebarOpen(true)}
          unreadCount={unreadCount}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
        <PortalMobileNav />
      </div>
    </div>
  );
}
