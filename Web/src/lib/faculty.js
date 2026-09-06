export const FACULTY_BY_PREFIX = {
  CS: 'Computer Science and IT',
  MD: 'Medicine & Surgery',
  MS: 'Medicine & Surgery',
  EN: 'Engineering & Technology',
  ET: 'Engineering & Technology',
  BA: 'Economics & Management',
  EC: 'Economics & Management',
};

/** JU student IDs: known faculty prefix + 5–8 digits (e.g. CS1300704, ET1300673). */
export function isValidJuStudentId(studentId) {
  const id = String(studentId || '').trim().toUpperCase();
  if (!id || id === '—' || id === '?' || id === '-') return false;
  if (!/^[A-Z]{2}\d{5,8}$/.test(id)) return false;
  const prefix = id.slice(0, 2);
  if (!FACULTY_BY_PREFIX[prefix]) return false;
  const digits = id.slice(2);
  if (/^0+$/.test(digits)) return false;
  return true;
}

export function facultyFromStudentId(studentId) {
  const id = String(studentId || '').trim().toUpperCase();
  const prefix = id.slice(0, 2);
  return FACULTY_BY_PREFIX[prefix] || '';
}

export function resolveFaculty({ faculty, studentId } = {}) {
  const named = String(faculty || '').trim();
  if (named) return named;
  return facultyFromStudentId(studentId) || 'Unassigned';
}

export const FACULTY_OPTIONS = [
  ...new Set(Object.values(FACULTY_BY_PREFIX)),
];
