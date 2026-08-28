const FACULTY_BY_PREFIX = {
  CS: 'Computer Science and IT',
  MD: 'Medicine & Surgery',
  MS: 'Medicine & Surgery',
  EN: 'Engineering & Technology',
  ET: 'Engineering & Technology',
  BA: 'Economics & Management',
  EC: 'Economics & Management',
};

function facultyFromStudentId(studentId) {
  const id = String(studentId || '').trim().toUpperCase();
  const prefix = id.slice(0, 2);
  return FACULTY_BY_PREFIX[prefix] || '';
}

module.exports = { FACULTY_BY_PREFIX, facultyFromStudentId };
