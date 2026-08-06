'use client';

import { useEffect, useRef } from 'react';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import { warmupAdminData } from '@/lib/adminWarmup';

/** Loads all main admin data in the background once per session. */
export default function AdminDataWarmup() {
  const { setBadgeCounts } = useAdminBadges();
  const { session, ready } = useSession();
  const startedFor = useRef(null);

  useEffect(() => {
    if (!ready || !session?.email) return;
    const key = `${session.email}:${checkSuperAdmin(session) ? 'super' : 'admin'}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    warmupAdminData(setBadgeCounts, {
      includePrivilegedSources: checkSuperAdmin(session),
    });
  }, [ready, session, setBadgeCounts]);

  return null;
}
