import { setAdminCache } from '@/lib/adminDataCache';
import {
  fetchAdminUsers,
  fetchContactMessages,
  fetchDashboardData,
  fetchDraftInventoryItems,
  fetchPendingItemClaims,
  fetchPendingReports,
  fetchAllInventoryItems,
  fetchReturnedItems,
  fetchSystemReportsData,
} from '@/lib/supabase';

/** Prefetch main admin pages into memory so navigation is instant. */
export function warmupAdminData(onBadges, { includePrivilegedSources = false } = {}) {
  fetchDashboardData()
    .then(async (result) => {
      setAdminCache('admin:dashboard', result);
      let contactNew = 0;
      if (includePrivilegedSources) {
        try {
          const messages = await fetchContactMessages();
          setAdminCache('admin:contact-messages', messages);
          contactNew = messages.filter((m) => m.status === 'new').length;
        } catch {
          contactNew = 0;
        }
      }
      onBadges?.({
        ...(result.badgeCounts || { pending: 0, claims: 0 }),
        contact: contactNew,
      });
    })
    .catch(() => {});

  fetchPendingReports()
    .then(({ combined }) => setAdminCache('admin:pending', combined))
    .catch(() => {});

  fetchAdminUsers()
    .then((users) => setAdminCache('admin:users', users))
    .catch(() => {});

  fetchPendingItemClaims()
    .then((claims) => setAdminCache('admin:claims', claims))
    .catch(() => {});

  fetchAllInventoryItems()
    .then((items) => setAdminCache('admin:items', items))
    .catch(() => {});

  fetchSystemReportsData({ includePrivilegedSources })
    .then((reports) =>
      setAdminCache(includePrivilegedSources ? 'admin:reports:super' : 'admin:reports', reports)
    )
    .catch(() => {});

  fetchReturnedItems()
    .then((items) => setAdminCache('admin:returned', items))
    .catch(() => {});

  fetchDraftInventoryItems()
    .then((items) => setAdminCache('admin:drafts', items))
    .catch(() => {});
}

export const EMPTY_DASHBOARD = {
  stats: {
    totalItems: 0,
    lostCount: 0,
    foundCount: 0,
    pendingReports: 0,
    pendingUsers: 0,
    successfulRecoveries: 0,
    activeUsers: 0,
    claimsCount: 0,
  },
  health: { recoveryRate: 0, recovered: 0, inVault: 0, lostCount: 0, foundCount: 0 },
  actionItems: [
    { title: 'All caught up', subtitle: 'No urgent tasks right now', href: '/admin', icon: 'check' },
  ],
  recentActivity: [],
  trendRows: [],
  badgeCounts: { pending: 0, claims: 0, contact: 0 },
};
