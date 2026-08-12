function getLocalDateKey(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatWeekLabel(start, end) {
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function isKeyInRange(key, startKey, endKey) {
  if (!key || !startKey || !endKey) return false;
  return key >= startKey && key <= endKey;
}

export const TRACK_PERIODS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'last_30', label: 'Last 30 days' },
];

/** @deprecated use TRACK_PERIODS */
export const CLAIM_TRACK_PERIODS = TRACK_PERIODS;

function periodWindowDays(period) {
  if (period === 'monthly') return 28;
  if (period === 'last_30') return 30;
  return 7;
}

function percentChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function emptyBuckets(period) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  if (period === 'monthly') {
    const buckets = [];
    for (let week = 3; week >= 0; week -= 1) {
      const end = addDays(today, -week * 7);
      const start = addDays(end, -6);
      buckets.push({
        key: `w${4 - week}`,
        label: `W${4 - week}`,
        rangeLabel: formatWeekLabel(start, end),
        startKey: getLocalDateKey(start),
        endKey: getLocalDateKey(end),
        primary: 0,
        secondary: 0,
      });
    }
    return buckets;
  }

  const dayCount = period === 'last_30' ? 30 : 7;
  const buckets = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const key = getLocalDateKey(date);
    buckets.push({
      key,
      label: period === 'weekly' ? formatDayLabel(date) : offset % 5 === 0 || offset === 0 ? formatShortDate(date) : '',
      rangeLabel: formatShortDate(date),
      startKey: key,
      endKey: key,
      primary: 0,
      secondary: 0,
      isToday: key === todayKey,
    });
  }
  return buckets;
}

function getSourceSeriesConfig(sourceId) {
  switch (sourceId) {
    case 'inventory':
      return {
        title: 'Global Inventory',
        primaryLabel: 'Found',
        secondaryLabel: 'Lost',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} inventory records`,
      };
    case 'lost':
      return {
        title: 'Lost Reports',
        primaryLabel: 'Reported',
        secondaryLabel: 'Live',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} lost reports`,
      };
    case 'found':
      return {
        title: 'Found Reports',
        primaryLabel: 'Reported',
        secondaryLabel: 'Live',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} found reports`,
      };
    case 'returned':
      return {
        title: 'Returned Items',
        primaryLabel: 'Returned',
        secondaryLabel: 'Found type',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} reunions archived`,
      };
    case 'pending':
      return {
        title: 'Pending Reports',
        primaryLabel: 'Found',
        secondaryLabel: 'Lost',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} awaiting review`,
      };
    case 'drafts':
      return {
        title: 'Draft Items',
        primaryLabel: 'Found drafts',
        secondaryLabel: 'Lost drafts',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} unpublished drafts`,
      };
    case 'secure':
      return {
        title: 'Secure Found Holds',
        primaryLabel: 'Posted',
        secondaryLabel: 'Live',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} secure holds`,
      };
    case 'archived':
      return {
        title: 'Archived Items',
        primaryLabel: 'Found',
        secondaryLabel: 'Lost',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} vault records`,
      };
    case 'recycle':
      return {
        title: 'Deleted Records',
        primaryLabel: 'Deleted',
        secondaryLabel: 'Records',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} deleted entries`,
      };
    case 'contact':
      return {
        title: 'Contact Messages',
        primaryLabel: 'New',
        secondaryLabel: 'Read',
        primaryColor: '#1A56DB',
        secondaryColor: '#059669',
        footerNote: (rows) => {
          const neu = rows.filter((r) => String(r.status).toLowerCase() === 'new').length;
          const read = rows.filter((r) => String(r.status).toLowerCase() === 'read').length;
          const archived = rows.filter((r) => String(r.status).toLowerCase() === 'archived').length;
          return `${neu} new · ${read} read · ${archived} archived · ${rows.length} total`;
        },
      };
    case 'claims':
      return {
        title: 'Ownership Requests',
        primaryLabel: 'Submitted',
        secondaryLabel: 'Resolved',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) =>
          `${rows.filter((r) => String(r.status).toLowerCase() === 'pending').length} pending now · ${rows.length} total`,
      };
    case 'users':
      return {
        title: 'Registered Users',
        primaryLabel: 'Joined',
        secondaryLabel: 'Active',
        primaryColor: '#0D9488',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} users in registry`,
      };
    default:
      return {
        title: 'Report Trends',
        primaryLabel: 'Records',
        secondaryLabel: 'Active',
        primaryColor: '#14B8A6',
        secondaryColor: '#F97316',
        footerNote: (rows) => `${rows.length} records`,
      };
  }
}

function classifyRow(row, sourceId) {
  const status = String(row.status || '').toLowerCase();
  const type = String(row.type || '').toLowerCase();

  if (sourceId === 'claims') {
    return {
      primaryKey: row.dateKey,
      secondaryKey:
        status === 'approved' || status === 'rejected' ? row.reviewedDateKey || null : null,
      countPrimary: true,
      countSecondary: status === 'approved' || status === 'rejected',
    };
  }

  if (sourceId === 'contact') {
    return {
      primaryKey: status === 'new' ? row.dateKey : null,
      secondaryKey: status === 'read' ? row.dateKey : null,
      countPrimary: status === 'new',
      countSecondary: status === 'read',
    };
  }

  if (sourceId === 'users') {
    return {
      primaryKey: row.dateKey,
      secondaryKey: status === 'active' || status === 'admin' ? row.dateKey : null,
      countPrimary: true,
      countSecondary: status === 'active' || status === 'admin',
    };
  }

  if (sourceId === 'inventory' || sourceId === 'pending' || sourceId === 'drafts' || sourceId === 'archived') {
    const isFound = type === 'found';
    const isLost = type === 'lost';
    return {
      primaryKey: isFound ? row.dateKey : null,
      secondaryKey: isLost ? row.dateKey : null,
      countPrimary: isFound,
      countSecondary: isLost,
    };
  }

  if (sourceId === 'returned') {
    const isFound = type === 'found';
    return {
      primaryKey: row.dateKey,
      secondaryKey: isFound ? row.dateKey : null,
      countPrimary: true,
      countSecondary: isFound,
    };
  }

  if (sourceId === 'lost' || sourceId === 'found' || sourceId === 'secure') {
    const isLive = status === 'live';
    return {
      primaryKey: row.dateKey,
      secondaryKey: isLive ? row.dateKey : null,
      countPrimary: true,
      countSecondary: isLive,
    };
  }

  return {
    primaryKey: row.dateKey,
    secondaryKey: null,
    countPrimary: true,
    countSecondary: false,
  };
}

function fillBuckets(buckets, rows, sourceId) {
  rows.forEach((row) => {
    const flags = classifyRow(row, sourceId);
    buckets.forEach((bucket) => {
      if (flags.countPrimary && isKeyInRange(flags.primaryKey, bucket.startKey, bucket.endKey)) {
        bucket.primary += 1;
      }
      if (flags.countSecondary && isKeyInRange(flags.secondaryKey, bucket.startKey, bucket.endKey)) {
        bucket.secondary += 1;
      }
    });
  });
  return buckets;
}

function countInWindow(rows, sourceId, startKey, endKey, series) {
  return rows.reduce((count, row) => {
    const flags = classifyRow(row, sourceId);
    if (series === 'primary') {
      return flags.countPrimary && isKeyInRange(flags.primaryKey, startKey, endKey) ? count + 1 : count;
    }
    return flags.countSecondary && isKeyInRange(flags.secondaryKey, startKey, endKey) ? count + 1 : count;
  }, 0);
}

export function computeSourcePeriodStats(rows = [], sourceId = 'inventory', period = 'weekly') {
  const config = getSourceSeriesConfig(sourceId);
  const timeline = fillBuckets(emptyBuckets(period), rows, sourceId);
  const today = new Date();
  const windowDays = periodWindowDays(period);

  const currentStartKey = getLocalDateKey(addDays(today, -(windowDays - 1)));
  const todayKey = getLocalDateKey(today);
  const previousStartKey = getLocalDateKey(addDays(today, -(windowDays * 2 - 1)));
  const previousEndKey = getLocalDateKey(addDays(today, -windowDays));

  const primary = countInWindow(rows, sourceId, currentStartKey, todayKey, 'primary');
  const secondary = countInWindow(rows, sourceId, currentStartKey, todayKey, 'secondary');
  const previousPrimary = countInWindow(rows, sourceId, previousStartKey, previousEndKey, 'primary');
  const previousSecondary = countInWindow(rows, sourceId, previousStartKey, previousEndKey, 'secondary');

  // Chart compatibility aliases (submitted/resolved used by older UI)
  const chartTimeline = timeline.map((row) => ({
    ...row,
    submitted: row.primary,
    resolved: row.secondary,
  }));

  return {
    ...config,
    timeline: chartTimeline,
    primary,
    secondary,
    primaryTrend: percentChange(primary, previousPrimary),
    secondaryTrend: percentChange(secondary, previousSecondary),
    submitted: primary,
    resolved: secondary,
    submittedTrend: percentChange(primary, previousPrimary),
    resolvedTrend: percentChange(secondary, previousSecondary),
    totalRecords: rows.length,
    footerText: typeof config.footerNote === 'function' ? config.footerNote(rows) : '',
  };
}

/** Keep claims-specific helper for any leftover imports */
export function computeClaimPeriodStats(claims = [], period = 'weekly') {
  return computeSourcePeriodStats(claims, 'claims', period);
}

export function buildClaimsTimeline(claims = [], period = 'weekly') {
  return computeSourcePeriodStats(claims, 'claims', period).timeline;
}

export function getRecentClaimActivity(claims = [], limit = 4) {
  return [...claims]
    .sort((a, b) => String(b.dateKey || '').localeCompare(String(a.dateKey || '')))
    .slice(0, limit);
}
