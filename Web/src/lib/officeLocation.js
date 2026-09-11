/** Canonical hold / visit office label (replaces legacy "Campus Security Office"). */
export const STUDENT_AFFAIRS_OFFICE = 'Student Affairs office';

export function normalizeOfficeLocation(value, fallback = STUDENT_AFFAIRS_OFFICE) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (/^campus\s+security\s+office$/i.test(raw)) return STUDENT_AFFAIRS_OFFICE;
  return raw;
}
