import { computeSourcePeriodStats } from './claimsTimeline';

function toSortTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function buildDashboardTrendRows(lostItems = [], foundItems = []) {
  const rawDate = (item) =>
    item.created_at ||
    item.date_reported ||
    item.dateLost ||
    item.dateFound ||
    item.date_lost ||
    item.date_found ||
    item.reported_at;

  const mapRow = (item, type) => {
    const dateValue = rawDate(item);
    const dateKey = dateValue
      ? new Date(new Date(dateValue).getTime() - new Date(dateValue).getTimezoneOffset() * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      : null;

    return {
      id: `${type}-${item.id}`,
      type: type === 'found' ? 'Found' : 'Lost',
      status: String(item.status || 'live').toLowerCase(),
      dateKey,
      category: item.category || 'Other',
    };
  };

  return [
    ...lostItems.map((item) => mapRow(item, 'lost')),
    ...foundItems.map((item) => mapRow(item, 'found')),
  ];
}

export function computeCategoryBreakdown(items = [], limit = 6) {
  const counts = {};
  items.forEach((item) => {
    const name = item.displayCategory || item.category || 'Other';
    counts[name] = (counts[name] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function computeDashboardKpis(stats, health, trendRows = []) {
  const weekly = computeSourcePeriodStats(trendRows, 'inventory', 'weekly');
  const thisWeek = weekly.primary + weekly.secondary;
  const lastWeek = Math.max(
    countInPreviousWindow(trendRows, 'inventory', 'weekly', 'primary') +
      countInPreviousWindow(trendRows, 'inventory', 'weekly', 'secondary'),
    0
  );
  const itemsTrend = percentDelta(thisWeek, lastWeek);

  const foundShare =
    stats.totalItems > 0 ? Math.round((stats.foundCount / stats.totalItems) * 100) : 0;

  return {
    totalItems: {
      trend: itemsTrend,
      trendLabel: `${thisWeek} new this week`,
      subLabel: `${stats.foundCount || 0} found · ${stats.lostCount || 0} lost`,
    },
    pendingReports: {
      trendLabel: stats.pendingReports > 0 ? 'Awaiting admin review' : 'Queue is clear',
      urgent: stats.pendingReports > 0,
    },
    successfulRecoveries: {
      trend: health.recoveryRate,
      trendLabel: `${health.recoveryRate}% recovery rate`,
      subLabel: `${health.recovered} returned to owners`,
    },
    activeUsers: {
      trendLabel: `${stats.pendingUsers || 0} pending approval`,
      subLabel: 'Approved campus students',
    },
    weekly,
    foundShare,
  };
}

/** 7-day sparkline series for KPI cards (medicines.html style) */
export function buildKpiSparklines(trendRows = []) {
  const weekly = computeSourcePeriodStats(trendRows, 'inventory', 'weekly');
  const timeline = weekly.timeline;

  return {
    totalItems: timeline.map((d) => d.primary + d.secondary),
    pending: timeline.map((d) => d.secondary),
    recoveries: timeline.map((d) => d.primary),
    activeUsers: timeline.map((d) => d.primary + d.secondary),
  };
}

function percentDelta(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function countInPreviousWindow(rows, sourceId, period, series) {
  const today = new Date();
  const windowDays = period === 'monthly' ? 28 : period === 'last_30' ? 30 : 7;
  const previousStart = new Date(today);
  previousStart.setDate(previousStart.getDate() - (windowDays * 2 - 1));
  const previousEnd = new Date(today);
  previousEnd.setDate(previousEnd.getDate() - windowDays);

  const startKey = toDateKey(previousStart);
  const endKey = toDateKey(previousEnd);

  return rows.reduce((count, row) => {
    const key = row.dateKey;
    if (!key || key < startKey || key > endKey) return count;
    if (sourceId === 'inventory') {
      if (series === 'primary' && row.type === 'Found') return count + 1;
      if (series === 'secondary' && row.type === 'Lost') return count + 1;
    }
    return count;
  }, 0);
}

function toDateKey(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function formatRelativeTime(value) {
  if (!value) return 'Recently';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Recently';

  const diffMs = Date.now() - time;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(time));
}

export { toSortTimestamp };
