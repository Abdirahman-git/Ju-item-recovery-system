'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

/** Thin top bar — instant feedback while a new admin page loads. */
export default function AdminNavProgress() {
  const pathname = usePathname();
  const { clearPendingNav } = useSidebar();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    clearPendingNav();
    setVisible(true);
    setProgress(18);

    const t1 = window.setTimeout(() => setProgress(62), 80);
    const t2 = window.setTimeout(() => setProgress(88), 220);
    const t3 = window.setTimeout(() => setProgress(100), 380);
    const t4 = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 520);
    // Failsafe if a soft-nav hangs mid-transition
    const t5 = window.setTimeout(() => clearPendingNav(), 2500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(t5);
    };
  }, [pathname, clearPendingNav]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-[#2563EB] via-[#1A56DB] to-[#6366F1] shadow-[0_0_10px_rgba(26,86,219,0.55)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
