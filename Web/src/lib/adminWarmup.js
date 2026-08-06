import { setAdminCache } from '@/lib/adminDataCache';
import {
  fetchAdminUsers,
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
    .then((result) => {
      setAdminCache('admin:dashboard', result);
      onBadges?.(result.badgeCounts);
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
  badgeCounts: { pending: 0, claims: 0 },
};
