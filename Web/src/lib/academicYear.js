/** Academic year flips in August (e.g. Aug 2026 → 2026–2027). */

export function getCurrentAcademicYearStart(now = new Date()) {
  const y = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? y : y - 1;
}

export function formatAcademicYearLabel(startYear) {
  const y = Number(startYear);
  if (!Number.isFinite(y)) return '—';
  return `${y}–${y + 1}`;
}

/**
 * Accepts 2026, "2026-2027", "2026–2027", "2026/2027".
 * @returns {number|null}
 */
export function parseIntakeYearInput(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);

  const s = String(raw).trim();
  if (!s) return null;

  const range = s.match(/^(\d{4})\s*[-–—/]\s*(\d{4})$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && end === start + 1) return start;
    return null;
  }

  const y = Number(s);
  return Number.isFinite(y) ? Math.trunc(y) : null;
}

/** Allowed academic years for directory rows (past cohorts up to future cohorts). */
export function getAllowedIntakeOptions(now = new Date()) {
  const current = getCurrentAcademicYearStart(now);
  const options = [];
  // From 6 years in the past to 3 years in the future
  for (let start = current - 6; start <= current + 3; start++) {
    options.push({
      value: start,
      label: formatAcademicYearLabel(start),
    });
  }
  return options;
}
