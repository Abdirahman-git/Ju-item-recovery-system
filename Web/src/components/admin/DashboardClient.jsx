'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { fetchDashboardData } from '@/lib/supabase';
import { computeCategoryBreakdown, computeDashboardKpis, buildKpiSparklines } from '@/lib/dashboardAnalytics';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { EMPTY_DASHBOARD } from '@/lib/adminWarmup';
import StatCard from './StatCard';
import RecentActivityTable from './RecentActivityTable';
import SystemHealthWidget from './SystemHealthWidget';
import ActionRequiredWidget from './ActionRequiredWidget';
import DashboardHeroBanner from './DashboardHeroBanner';
import DashboardTrendChart from './DashboardTrendChart';
import DashboardCategoryPanel from './DashboardCategoryPanel';
import DashboardQuickActions from './DashboardQuickActions';
import { AutoMatchCard } from './CampusTrendsBanner';

export default function DashboardClient() {
  const { setBadgeCounts } = useAdminBadges();
  const { setActions, clearActions, clearStats } = useAdminHeaderActions();
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const onSuccess = useCallback(
    (result) => {
      setBadgeCounts?.((prev) => ({
        ...(prev || {}),
        ...(result.badgeCounts || {}),
        contact: prev?.contact ?? result.badgeCounts?.contact ?? 0,
      }));
      setSparkPlayKey((k) => k + 1);
    },
    [setBadgeCounts]
  );

  const { data, error, refresh } = useBackgroundFetch('admin:dashboard', fetchDashboardData, {
    onSuccess,
    fallback: EMPTY_DASHBOARD,
  });

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setActions(
      <>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB] hover:shadow-sm"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, refresh]);

  useEffect(() => {
    clearStats();
    return () => clearStats();
  }, [clearStats]);

  const view = data ?? EMPTY_DASHBOARD;
  const { stats, health, actionItems, recentActivity, trendRows } = view;

  const kpiMeta = useMemo(
    () => computeDashboardKpis(stats, health, trendRows),
    [stats, health, trendRows]
  );

  const categories = useMemo(
    () =>
      computeCategoryBreakdown(
        trendRows.map((row) => ({ displayCategory: row.category, category: row.category })),
        6
      ),
    [trendRows]
  );

  const sparklines = useMemo(() => buildKpiSparklines(trendRows), [trendRows]);

  return (
    <div className="dashboard-page space-y-5">
      {error ? (
        <div className="rounded-[18px] border border-amber-200/60 bg-amber-50/50 px-4 py-2 text-sm text-amber-800">
          Could not refresh dashboard. Showing last saved data.
          <button type="button" onClick={refresh} className="ml-2 font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      <DashboardHeroBanner stats={stats} health={health} kpiMeta={kpiMeta} />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          label="Total Items"
          value={stats.totalItems}
          icon="package"
          trend={kpiMeta.totalItems.trend}
          trendDirection={kpiMeta.totalItems.trend < 0 ? 'down' : 'up'}
          trendLabel={kpiMeta.totalItems.trendLabel}
          subLabel={kpiMeta.totalItems.subLabel}
          sparkData={sparklines.totalItems}
          href="/admin/items"
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          label="Pending Reports"
          value={stats.pendingReports}
          icon="alert"
          urgent={kpiMeta.pendingReports.urgent}
          trendLabel={kpiMeta.pendingReports.trendLabel}
          sparkData={sparklines.pending}
          href="/admin/pending"
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          label="Successful Recoveries"
          value={stats.successfulRecoveries}
          icon="check"
          trend={kpiMeta.successfulRecoveries.trend}
          trendLabel={kpiMeta.successfulRecoveries.trendLabel}
          subLabel={kpiMeta.successfulRecoveries.subLabel}
          sparkData={sparklines.recoveries}
          href="/admin/returned"
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          label="Active Users"
          value={stats.activeUsers}
          icon="users"
          trendLabel={kpiMeta.activeUsers.trendLabel}
          subLabel={kpiMeta.activeUsers.subLabel}
          sparkData={sparklines.activeUsers}
          href="/admin/users"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
            <DashboardTrendChart trendRows={trendRows} />
            <DashboardCategoryPanel categories={categories} totalItems={stats.totalItems} />
          </div>
          <RecentActivityTable items={recentActivity} />
        </div>

        <div className="space-y-4">
          <SystemHealthWidget
            recoveryRate={health.recoveryRate}
            recovered={health.recovered}
            inVault={health.inVault}
            lostCount={health.lostCount ?? stats.lostCount ?? 0}
            foundCount={health.foundCount ?? stats.foundCount ?? 0}
          />
          <ActionRequiredWidget items={actionItems} />
          <DashboardQuickActions />
          <AutoMatchCard />
        </div>
      </div>
    </div>
  );
}
