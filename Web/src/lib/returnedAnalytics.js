function parseReturnedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function buildMonthlyReturnPerformance(items = [], monthCount = 6) {
  const today = new Date();
  const buckets = [];

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const anchor = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    buckets.push({
      key: `${anchor.getFullYear()}-${anchor.getMonth()}`,
      label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(anchor).toUpperCase(),
      rangeLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(anchor),
      year: anchor.getFullYear(),
      month: anchor.getMonth(),
      total: 0,
      found: 0,
      lost: 0,
    });
  }

  items.forEach((item) => {
    const date = parseReturnedDate(item.returnedAt);
    if (!date) return;

    buckets.forEach((bucket) => {
      if (!isInMonth(date, bucket.year, bucket.month)) return;
      bucket.total += 1;
      if (item.displayType === 'LOST') bucket.lost += 1;
      else bucket.found += 1;
    });
  });

  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const current = buckets[buckets.length - 1]?.total || 0;
  const previous = buckets[buckets.length - 2]?.total || 0;
  const trend = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;

  return {
    buckets,
    total,
    currentMonth: current,
    trend,
    peak: Math.max(...buckets.map((bucket) => bucket.total), 1),
  };
}
