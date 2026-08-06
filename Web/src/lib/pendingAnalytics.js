function parseReportDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toDayKey(today);
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function countReportsInRange(reports, startOffset, endOffset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let lost = 0;
  let found = 0;

  reports.forEach((report) => {
    const date = parseReportDate(report.reportedAt);
    if (!date) return;

    const reportDay = new Date(date);
    reportDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - reportDay) / 86400000);
    if (diffDays < startOffset || diffDays > endOffset) return;

    if (report.reportType === 'lost') lost += 1;
    if (report.reportType === 'found') found += 1;
  });

  return { lost, found, total: lost + found };
}

export function buildValidationTrend(reports = [], dayCount = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getTodayKey();

  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - 1 - index));
    const key = toDayKey(date);

    return {
      key,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
      rangeLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(date),
      total: 0,
      lost: 0,
      found: 0,
      isToday: key === todayKey,
    };
  });

  const byDay = new Map(days.map((day) => [day.key, day]));

  reports.forEach((report) => {
    const date = parseReportDate(report.reportedAt);
    if (!date) return;
    const key = toDayKey(date);
    const day = byDay.get(key);
    if (!day) return;

    day.total += 1;
    if (report.reportType === 'lost') day.lost += 1;
    if (report.reportType === 'found') day.found += 1;
  });

  const peak = Math.max(...days.map((day) => day.total), 1);
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const lostTotal = days.reduce((sum, day) => sum + day.lost, 0);
  const foundTotal = days.reduce((sum, day) => sum + day.found, 0);
  const busiestDay = days.reduce((best, day) => (day.total > best.total ? day : best), days[0]);

  const previousWeek = countReportsInRange(reports, dayCount, dayCount * 2 - 1);

  const timeline = days.map((day) => ({
    ...day,
    primary: day.found,
    secondary: day.lost,
  }));

  return {
    days,
    timeline,
    peak,
    total,
    lostTotal,
    foundTotal,
    busiestDay,
    activeDays: days.filter((day) => day.total > 0).length,
    lostTrend: percentChange(lostTotal, previousWeek.lost),
    foundTrend: percentChange(foundTotal, previousWeek.found),
    totalTrend: percentChange(total, previousWeek.total),
    previousWeek,
  };
}
