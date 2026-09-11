const { facultyFromStudentId, FACULTY_BY_PREFIX } = require('./faculty');

const DEFAULT_PROGRAM_YEARS = {
  'Computer Science and IT': 4,
  'Economics & Management': 4,
  'Engineering & Technology': 4,
  'Medicine & Surgery': 6,
};

const KNOWN_FACULTIES = Object.keys(DEFAULT_PROGRAM_YEARS);

const FACULTY_ALIASES = {
  'computer science and it': 'Computer Science and IT',
  'computer science & it': 'Computer Science and IT',
  'computer science': 'Computer Science and IT',
  cs: 'Computer Science and IT',
  'economics & management': 'Economics & Management',
  'economics and management': 'Economics & Management',
  economics: 'Economics & Management',
  ba: 'Economics & Management',
  'engineering & technology': 'Engineering & Technology',
  'engineering and technology': 'Engineering & Technology',
  engineering: 'Engineering & Technology',
  en: 'Engineering & Technology',
  'medicine & surgery': 'Medicine & Surgery',
  'medicine and surgery': 'Medicine & Surgery',
  medicine: 'Medicine & Surgery',
  md: 'Medicine & Surgery',
};

/** Academic year flips in August (e.g. Aug 2026 → 2026–2027). */
function getCurrentAcademicYearStart(now = new Date()) {
  const y = now.getFullYear();
  const month = now.getMonth() + 1; // 1–12
  return month >= 8 ? y : y - 1;
}

function formatAcademicYearLabel(startYear) {
  const y = Number(startYear);
  if (!Number.isFinite(y)) return '—';
  return `${y}–${y + 1}`;
}

/**
 * Accepts 2026, "2026-2027", "2026–2027", "2026/2027".
 * @returns {number|null}
 */
function parseIntakeYearInput(raw) {
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

function normalizeStudentId(value) {
  return String(value || '').trim().toUpperCase();
}

function parseIntakeYearFromStudentId() {
  return getCurrentAcademicYearStart();
}

/**
 * Resolve intake year for directory row (defaults to current academic year if missing).
 * @returns {number} academic year start (e.g. 2026 for 2026–2027)
 */
function resolveAllowedIntakeYear(rawYear, { strict = true } = {}) {
  const current = getCurrentAcademicYearStart();
  if (rawYear == null || rawYear === '') return current;
  const y = parseIntakeYearInput(rawYear);
  if (!Number.isFinite(y) || y < 1990 || y > 2100) {
    if (strict) {
      throw new Error(
        `Invalid intake year. Use a valid year (e.g. ${current} or ${formatAcademicYearLabel(current)}).`
      );
    }
    return current;
  }
  return y;
}

function resolveProgramYears(faculty, yearsMap = {}) {
  const name = String(faculty || '').trim();
  if (name && Number.isFinite(Number(yearsMap[name]))) {
    return Math.max(4, Math.min(7, Number(yearsMap[name])));
  }
  if (name && Number.isFinite(Number(DEFAULT_PROGRAM_YEARS[name]))) {
    return Math.max(4, Math.min(7, DEFAULT_PROGRAM_YEARS[name]));
  }
  return 4;
}

/** Graduation / access end: 31 July of (intake_year + program_years). */
function computeExpiresAt(intakeYear, programYears) {
  const y = Number(intakeYear);
  const n = Number(programYears) || 4;
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return null;
  const endYear = y + n;
  return `${endYear}-07-31`;
}

function isDateExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return false;
  const end = new Date(`${String(expiresAt).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < now.getTime();
}

function normalizeFacultyName(value, yearsMap = null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const exact = KNOWN_FACULTIES.find((f) => f.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const alias = FACULTY_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  if (yearsMap && typeof yearsMap === 'object') {
    const hit = Object.keys(yearsMap).find((k) => k.toLowerCase() === raw.toLowerCase());
    if (hit) return hit;
  }
  return '';
}

function resolveFacultyName(row = {}) {
  return (
    normalizeFacultyName(row.faculty) ||
    facultyFromStudentId(row.student_id || row.studentId) ||
    ''
  );
}

/** Digits-only phone (Somalia-style), rejects Excel scientific notation. */
function normalizeDirectoryPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) throw new Error('phone_number is required.');
  if (/e[+\-]/i.test(raw)) {
    throw new Error(
      'Invalid phone (Excel scientific notation like 6.10E+08). Format the phone column as Text and re-enter digits.'
    );
  }
  let cleaned = raw.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('252')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  if (!/^\d{8,12}$/.test(cleaned)) {
    throw new Error('phone_number must be 8–12 digits (e.g. 0610000000).');
  }
  return `0${cleaned}`;
}

function validateDirectoryFullName(value, studentId) {
  const name = String(value || '').trim();
  if (!name || name.length < 2) {
    throw new Error('full_name is required (at least 2 characters).');
  }
  if (name.toLowerCase() === String(studentId || '').trim().toLowerCase()) {
    throw new Error('full_name cannot be the same as student_id.');
  }
  if (/^example\s+student$/i.test(name)) {
    throw new Error('Replace the template example row with a real student.');
  }
  return name;
}

function validateDirectoryEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('email is invalid.');
  }
  return email;
}

function validateDirectoryStudentId(value) {
  const student_id = normalizeStudentId(value);
  if (!student_id) throw new Error('student_id is required.');
  if (!/^[A-Z]{2}[A-Z0-9]{3,20}$/.test(student_id)) {
    throw new Error('student_id must look like CS2600001 (prefix + digits).');
  }
  return student_id;
}

function enrichDirectoryRow(row, yearsMap = {}) {
  const student_id = normalizeStudentId(row.student_id);
  const faculty = resolveFacultyName({ ...row, student_id });
  const intake_year =
    Number(row.intake_year) ||
    parseIntakeYearFromStudentId() ||
    getCurrentAcademicYearStart();
  const program_years = resolveProgramYears(faculty, yearsMap);
  const expires_at = row.expires_at || computeExpiresAt(intake_year, program_years);
  const expired = isDateExpired(expires_at);
  let access_status = String(row.access_status || 'active').trim().toLowerCase();
  if (expired && access_status !== 'blocked') access_status = 'expired';
  if (!access_status) access_status = expired ? 'expired' : 'active';

  return {
    ...row,
    student_id,
    faculty,
    intake_year,
    intake_label: formatAcademicYearLabel(intake_year),
    program_years,
    expires_at,
    access_status,
    is_expired: expired || access_status === 'expired' || access_status === 'blocked',
  };
}

function defaultFacultyYearsList() {
  const names = [...new Set(Object.values(FACULTY_BY_PREFIX))];
  return names.map((faculty) => ({
    faculty,
    program_years: DEFAULT_PROGRAM_YEARS[faculty] || 4,
  }));
}

module.exports = {
  DEFAULT_PROGRAM_YEARS,
  KNOWN_FACULTIES,
  normalizeStudentId,
  parseIntakeYearFromStudentId,
  resolveProgramYears,
  computeExpiresAt,
  isDateExpired,
  enrichDirectoryRow,
  defaultFacultyYearsList,
  resolveFacultyName,
  normalizeFacultyName,
  normalizeDirectoryPhone,
  validateDirectoryFullName,
  validateDirectoryEmail,
  validateDirectoryStudentId,
  getCurrentAcademicYearStart,
  formatAcademicYearLabel,
  parseIntakeYearInput,
  resolveAllowedIntakeYear,
};
