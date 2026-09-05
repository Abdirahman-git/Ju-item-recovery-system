'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  deleteStudentDirectoryRow,
  deleteFacultyProgramYear,
  fetchFacultyProgramYears,
  fetchStudentDirectory,
  saveFacultyProgramYears,
  uploadStudentDirectoryRows,
  upsertStudentDirectoryRow,
} from '@/lib/supabase';
import { FACULTY_OPTIONS } from '@/lib/faculty';
import {
  formatAcademicYearLabel,
  getAllowedIntakeOptions,
  getCurrentAcademicYearStart,
  parseIntakeYearInput,
} from '@/lib/academicYear';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import StatCard from '@/components/admin/StatCard';

const PAGE_SIZE = 10;
const TABS = [
  { id: 'directory', label: 'Campus directory', icon: Users },
  { id: 'years', label: 'Faculty years', icon: GraduationCap },
];

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

const swalBase = {
  width: 'min(440px, calc(100vw - 2rem))',
  padding: '1.75em',
  confirmButtonText: 'OK',
  confirmButtonColor: '#1A56DB',
  backdrop: 'rgba(15, 23, 42, 0.55)',
  heightAuto: false,
  allowOutsideClick: true,
};

function bumpSwalZIndex() {
  if (typeof document === 'undefined') return;
  const container = document.querySelector('.swal2-container');
  if (container) container.style.zIndex = '20000';
}

function showSuccess(title, text) {
  return Swal.fire({
    ...swalBase,
    icon: 'success',
    iconColor: '#059669',
    title,
    text,
    didOpen: bumpSwalZIndex,
  });
}

function showError(title, text) {
  return Swal.fire({
    ...swalBase,
    icon: 'error',
    title,
    html: String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>'),
    didOpen: bumpSwalZIndex,
  });
}

function showWarning(title, text) {
  return Swal.fire({
    ...swalBase,
    icon: 'warning',
    title,
    html: String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>'),
    didOpen: bumpSwalZIndex,
  });
}

async function showConfirm({
  title,
  text,
  confirmText = 'Yes, remove',
  cancelText = 'Cancel',
  icon = 'warning',
}) {
  const result = await Swal.fire({
    ...swalBase,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#DC2626',
    cancelButtonColor: '#64748B',
    reverseButtons: true,
    focusCancel: true,
    didOpen: bumpSwalZIndex,
  });
  return result.isConfirmed;
}

function normalizeFacultyName(value, allowedNames = []) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const catalog = [...new Set([...FACULTY_OPTIONS, ...allowedNames])];
  const exact = catalog.find((f) => f.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  return FACULTY_ALIASES[raw.toLowerCase()] || '';
}

function validateCsvPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) throw new Error('phone_number is required');
  if (/e[+\-]/i.test(raw)) {
    throw new Error('phone looks like Excel scientific notation — format column as Text');
  }
  let cleaned = raw.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('252')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  if (!/^\d{8,12}$/.test(cleaned)) {
    throw new Error('phone_number must be 8–12 digits');
  }
  return `0${cleaned}`;
}

function validateCsvRow(row, index, existingIds = null, allowedFaculties = []) {
  const student_id = String(row.student_id || '').trim().toUpperCase();
  if (!student_id) throw new Error(`Row ${index + 2}: student_id is required`);
  if (!/^[A-Z]{2}[A-Z0-9]{3,20}$/.test(student_id)) {
    throw new Error(`Row ${index + 2} (${student_id}): invalid student_id format`);
  }

  // Duplicate first — clearer than intake/faculty errors for IDs already saved
  if (existingIds instanceof Set && existingIds.has(student_id)) {
    throw new Error(`Already in directory — duplicate rejected (${student_id})`);
  }

  const full_name = String(row.full_name || '').trim();
  if (!full_name || full_name.length < 2) {
    throw new Error(`Row ${index + 2} (${student_id}): full_name is required`);
  }
  if (/^example\s+student$/i.test(full_name)) {
    throw new Error(`Row ${index + 2}: replace the template example with a real student`);
  }

  const phone_number = validateCsvPhone(row.phone_number);
  const facultyRaw = String(row.faculty || '').trim();
  const faculty = normalizeFacultyName(facultyRaw, allowedFaculties);
  if (facultyRaw && !faculty) {
    const list = [...new Set([...FACULTY_OPTIONS, ...allowedFaculties])].join(', ');
    throw new Error(
      `Row ${index + 2} (${student_id}): unknown faculty "${facultyRaw}". Register under Faculty years, or use: ${list}`
    );
  }

  const currentAy = getCurrentAcademicYearStart();
  let intake_year = row.intake_year;
  if (intake_year == null || intake_year === '') intake_year = currentAy;
  else intake_year = parseIntakeYearInput(intake_year);
  if (!Number.isFinite(intake_year) || intake_year !== currentAy) {
    throw new Error(
      `Row ${index + 2} (${student_id}): intake_year must be ${currentAy} or ${formatAcademicYearLabel(currentAy)} (you wrote "${row.intake_year}")`
    );
  }

  const email = String(row.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Row ${index + 2} (${student_id}): invalid email`);
  }

  return {
    ...row,
    student_id,
    full_name,
    phone_number,
    faculty: faculty || facultyRaw,
    email: email || undefined,
    intake_year,
    status: String(row.status || 'pending').trim().toLowerCase() === 'activated' ? 'activated' : 'pending',
  };
}

function formatUploadErrors(errors = []) {
  if (!errors.length) return '';
  return errors
    .slice(0, 8)
    .map((e) => {
      const id = e.student_id ? ` ${e.student_id}` : '';
      return `• Row ${(e.index ?? 0) + 2}${id}: ${e.error}`;
    })
    .join('\n');
}

function parseCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const split = (line) => {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const alias = {
    student_id: ['student_id', 'id', 'studentid'],
    full_name: ['full_name', 'name', 'fullname'],
    phone_number: ['phone_number', 'phone', 'mobile'],
    faculty: ['faculty', 'department', 'college'],
    email: ['email'],
    intake_year: ['intake_year', 'year', 'cohort', 'intake'],
    status: ['status'],
  };

  const idx = {};
  Object.entries(alias).forEach(([key, names]) => {
    idx[key] = headers.findIndex((h) => names.includes(h));
  });
  if (idx.student_id < 0) throw new Error('CSV must include a student_id column.');

  return lines.slice(1).map((line) => {
    const cells = split(line);
    const get = (key) => (idx[key] >= 0 ? cells[idx[key]] || '' : '');
    const intakeRaw = get('intake_year');
    return {
      student_id: get('student_id'),
      full_name: get('full_name'),
      phone_number: get('phone_number'),
      faculty: get('faculty'),
      email: get('email'),
      // Keep raw string so "2026-2027" is not lost via Number() → NaN
      intake_year: intakeRaw || undefined,
      status: get('status') || 'pending',
    };
  });
}

function StatusPill({ student }) {
  if (student.is_expired || student.access_status === 'expired') {
    return (
      <span className="glass-badge inline-flex rounded-full border border-red-200/60 bg-red-500/10 px-2.5 py-1 text-[11px] font-black uppercase text-red-700">
        Expired
      </span>
    );
  }
  if (student.status === 'activated') {
    return (
      <span className="glass-badge inline-flex rounded-full border border-emerald-200/60 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-700">
        Activated
      </span>
    );
  }
  return (
    <span className="glass-badge inline-flex rounded-full border border-amber-200/60 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black uppercase text-amber-700">
      Pending
    </span>
  );
}

function buildSetupSparklines(students = []) {
  const n = Math.max(students.length, 1);
  const pending = students.filter((s) => s.status === 'pending' && !s.is_expired).length;
  const activated = students.filter((s) => s.status === 'activated' && !s.is_expired).length;
  const expired = students.filter((s) => s.is_expired || s.access_status === 'expired').length;
  const wave = (peak) =>
    [0.12, 0.18, 0.28, 0.45, 0.62, 0.78, 0.55, 0.4, 0.52, 0.7, 0.48, 0.32].map((v) =>
      Math.max(0.05, Math.min(0.95, v * (0.35 + (peak / n) * 0.9)))
    );
  return {
    total: wave(n),
    pending: wave(Math.max(pending, 1)),
    activated: wave(Math.max(activated, 1)),
    expired: wave(Math.max(expired, 1)),
  };
}

export default function SetupClient() {
  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const [tab, setTab] = useState('directory');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [facultyRows, setFacultyRows] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [sparkPlayKey, setSparkPlayKey] = useState(0);
  const emptyForm = () => ({
    student_id: '',
    full_name: '',
    phone_number: '',
    faculty: FACULTY_OPTIONS[0] || '',
    email: '',
    intake_year: getCurrentAcademicYearStart(),
  });

  const [form, setForm] = useState(emptyForm);
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newFacultyYears, setNewFacultyYears] = useState(4);
  const [facultyNameError, setFacultyNameError] = useState('');
  const [facultyYearsError, setFacultyYearsError] = useState('');
  const [facultyNameTouched, setFacultyNameTouched] = useState(false);
  const intakeOptions = useMemo(() => getAllowedIntakeOptions(), []);

  const registeredFacultyNames = useMemo(
    () => facultyRows.map((r) => r.faculty).filter(Boolean),
    [facultyRows]
  );

  const facultyAssignedCounts = useMemo(() => {
    const counts = {};
    students.forEach((s) => {
      const faculty = String(s.faculty || '').trim();
      if (!faculty) return;
      counts[faculty] = (counts[faculty] || 0) + 1;
    });
    return counts;
  }, [students]);

  const formFacultyOptions = useMemo(() => {
    const set = new Set([...FACULTY_OPTIONS, ...registeredFacultyNames]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [registeredFacultyNames]);

  const invalidFacultyYears = useMemo(
    () =>
      facultyRows.filter((row) => {
        const y = Number(row.program_years);
        return !Number.isFinite(y) || y < 4 || y > 7;
      }),
    [facultyRows]
  );

  const registerNameTrimmed = String(newFacultyName || '').trim();
  const canSaveFacultyYears =
    facultyRows.length > 0 &&
    invalidFacultyYears.length === 0 &&
    registerNameTrimmed.length > 0;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [dir, years] = await Promise.all([
        fetchStudentDirectory(),
        fetchFacultyProgramYears(),
      ]);
      setStudents(dir.students || []);
      setSummary(dir.summary || null);
      setFacultyRows(
        (years.rows || []).map((r) => ({
          faculty: r.faculty,
          program_years: Number(r.program_years) || 4,
        }))
      );
      setSparkPlayKey((k) => k + 1);
    } catch (e) {
      setFeedback({ tone: 'error', message: e.message || 'Could not load Setup data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session || session.role !== 'admin' || !isSuperAdmin) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [session, isSuperAdmin, loadAll]);

  const sparklines = useMemo(() => buildSetupSparklines(students), [students]);

  const counts = useMemo(
    () => ({
      total: summary?.total ?? students.length,
      pending: summary?.pending ?? 0,
      activated: summary?.activated ?? 0,
      expired: summary?.expired ?? 0,
    }),
    [summary, students.length]
  );

  const facultyOptions = useMemo(() => {
    const set = new Set(FACULTY_OPTIONS);
    students.forEach((s) => {
      const faculty = String(s.faculty || '').trim();
      if (faculty) set.add(faculty);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const expired = s.is_expired || s.access_status === 'expired';
      const faculty = String(s.faculty || '').trim();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'expired' && expired) ||
        (statusFilter === 'activated' && s.status === 'activated' && !expired) ||
        (statusFilter === 'pending' && s.status === 'pending' && !expired);
      const matchesFaculty =
        facultyFilter === 'all' ||
        (facultyFilter === 'unassigned' && !faculty) ||
        faculty === facultyFilter;
      const hay = `${s.student_id} ${s.full_name} ${faculty} ${s.phone_number || ''} ${s.email || ''}`.toLowerCase();
      return matchesStatus && matchesFaculty && (!q || hay.includes(q));
    });
  }, [students, search, statusFilter, facultyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSaveOne = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const savedId = String(form.student_id || '').trim().toUpperCase();
      if (!savedId) throw new Error('ID is required.');
      if (!String(form.full_name || '').trim()) throw new Error('Full name is required.');
      validateCsvPhone(form.phone_number);
      if (Number(form.intake_year) !== getCurrentAcademicYearStart()) {
        throw new Error(
          `Intake must be ${formatAcademicYearLabel(getCurrentAcademicYearStart())} only.`
        );
      }
      await upsertStudentDirectoryRow({
        ...form,
        student_id: savedId,
        phone_number: validateCsvPhone(form.phone_number),
        full_name: String(form.full_name || '').trim(),
      });
      setForm(emptyForm());
      setSearch('');
      setStatusFilter('all');
      setFacultyFilter('all');
      setPage(1);
      setFeedback({ tone: 'ok', message: `Saved ${savedId}. Form cleared for the next entry.` });
      await showSuccess('Saved', `${savedId} was added / updated in the directory.`);
      await loadAll();
    } catch (e) {
      const msg = e.message || 'Save failed.';
      setFeedback({ tone: 'error', message: msg });
      await showError('Could not save', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setSaving(true);
    setFeedback(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.length) throw new Error('CSV has no data rows.');

      const existingIds = new Set(
        students.map((s) => String(s.student_id || '').trim().toUpperCase()).filter(Boolean)
      );
      const seenInFile = new Set();
      const rows = [];
      const localErrors = [];
      const allowedFaculties = registeredFacultyNames;

      parsed.forEach((row, index) => {
        try {
          const id = String(row.student_id || '').trim().toUpperCase();
          if (id && seenInFile.has(id)) {
            throw new Error(`Duplicate in this CSV — already listed above (${id})`);
          }
          if (id) seenInFile.add(id);
          rows.push(validateCsvRow(row, index, existingIds, allowedFaculties));
        } catch (e) {
          localErrors.push({
            index,
            student_id: String(row?.student_id || '').trim().toUpperCase(),
            error: e.message,
          });
        }
      });

      if (!rows.length) {
        const detail = formatUploadErrors(localErrors) || 'No valid rows.';
        const allDup = localErrors.every((e) => /duplicate|already in directory/i.test(e.error || ''));
        throw Object.assign(
          new Error(
            allDup
              ? 'All rows are duplicates — already in the directory.'
              : 'All CSV rows failed validation.'
          ),
          { errors: localErrors, detail }
        );
      }

      const result = await uploadStudentDirectoryRows(rows);
      const failed = Number(result.failed || 0) + localErrors.length;
      const inserted = Number(result.inserted || 0);
      const allErrors = [...localErrors, ...(result.errors || [])];

      if (failed > 0) {
        const detail = formatUploadErrors(allErrors);
        const dupCount = allErrors.filter((e) =>
          /duplicate|already in directory/i.test(e.error || '')
        ).length;
        setFeedback({
          tone: 'error',
          message: `Uploaded ${inserted} row(s), ${failed} failed${dupCount ? ` (${dupCount} duplicate)` : ''}.`,
        });
        await showWarning(
          dupCount === failed && inserted === 0 ? 'Duplicate rejected' : 'Partial upload',
          inserted === 0 && dupCount === failed
            ? `No new rows saved. ${dupCount} ID(s) already in the directory.\n\n${detail}`
            : `Saved ${inserted} new row(s). ${failed} rejected${dupCount ? ` (${dupCount} already in directory)` : ''}.\n\n${detail}`
        );
      } else {
        setFeedback({
          tone: 'ok',
          message: `Uploaded ${inserted} row(s) successfully.`,
        });
        await showSuccess('Upload successful', `${inserted} new row(s) were imported into the directory.`);
      }
      await loadAll();
    } catch (e) {
      const detail = e.detail || formatUploadErrors(e.errors) || e.message || 'Upload failed.';
      setFeedback({ tone: 'error', message: e.message || 'Upload failed.' });
      await showError(
        /duplicate/i.test(e.message || '') ? 'Duplicate rejected' : 'Upload failed',
        detail
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId) => {
    const ok = await showConfirm({
      title: 'Remove from directory?',
      text: `${studentId} will be removed from the campus directory.`,
      confirmText: 'Yes, remove',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteStudentDirectoryRow(studentId);
      await showSuccess('Removed', `${studentId} was removed from the directory.`);
      await loadAll();
    } catch (e) {
      setFeedback({ tone: 'error', message: e.message || 'Delete failed.' });
      await showError('Could not remove', e.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveYears = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const name = String(newFacultyName || '').trim().replace(/\s+/g, ' ');
      if (!name) {
        setFacultyNameTouched(true);
        setFacultyNameError('Faculty name is required.');
        throw new Error('Faculty name is required before Save.');
      }

      // Existing faculty name → just save list. New name → validate & add first.
      const alreadyListed = facultyRows.some(
        (r) => r.faculty.toLowerCase() === name.toLowerCase()
      );
      let rowsToSave = facultyRows;
      if (!alreadyListed) {
        const nameErr = validateFacultyNameField(name);
        const yearsErr = validateFacultyYearsField(newFacultyYears);
        setFacultyNameError(nameErr);
        setFacultyYearsError(yearsErr);
        if (nameErr || yearsErr) {
          throw new Error(nameErr || yearsErr);
        }
        const years = Math.trunc(Number(newFacultyYears));
        rowsToSave = [...facultyRows, { faculty: name, program_years: years }];
        setFacultyRows(rowsToSave);
      } else {
        setFacultyNameError('');
      }

      const bad = rowsToSave.filter((row) => {
        const y = Number(row.program_years);
        return !Number.isFinite(y) || y < 4 || y > 7;
      });
      if (bad.length) {
        const names = bad.map((r) => `${r.faculty} (${r.program_years ?? 'empty'})`).join(', ');
        throw new Error(`Years must be 4–7 for every faculty. Fix: ${names}`);
      }

      const result = await saveFacultyProgramYears(rowsToSave);
      const locked = result?.enforce?.updated ?? 0;
      setNewFacultyName('');
      setNewFacultyYears(4);
      setFacultyNameError('');
      setFacultyYearsError('');
      setFacultyNameTouched(false);
      setFeedback({
        tone: 'ok',
        message:
          result?.message ||
          `Faculty years saved${locked ? ` — ${locked} expired account(s) locked` : ''}.`,
      });
      await showSuccess(
        'Saved',
        locked
          ? `Program years saved. ${locked} expired account(s) locked automatically.`
          : 'Program years saved. End dates updated automatically.'
      );
      await loadAll();
    } catch (e) {
      const msg = e.message || 'Could not save faculty years.';
      setFeedback({ tone: 'error', message: msg });
      await showError('Could not save', msg);
    } finally {
      setSaving(false);
    }
  };

  const validateFacultyNameField = (raw, { allowEmpty = false } = {}) => {
    const name = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!name) {
      return allowEmpty ? '' : 'Faculty name is required.';
    }
    if (name.length < 5) return 'Name must be at least 5 characters.';
    if (name.length > 80) return 'Name must be 80 characters or less.';
    if (/\d/.test(name)) {
      return 'Faculty name must be letters only — no numbers.';
    }
    // Letters + spaces / & - ' . only (e.g. Law & Sharia, Medicine & Surgery)
    if (!/^[A-Za-z][A-Za-z &/\-'.]*$/.test(name)) {
      return "Letters only. Allowed separators: space, & / - ' .";
    }
    const letterCount = (name.match(/[A-Za-z]/g) || []).length;
    if (letterCount < 4) {
      return 'Faculty name must include enough letters.';
    }
    // Require a real-looking name: at least two words (space or &)
    if (!/[\s&]/.test(name)) {
      return 'Use a full faculty name (e.g. Law & Sharia) — not a single word.';
    }
    if (facultyRows.some((r) => r.faculty.toLowerCase() === name.toLowerCase())) {
      return 'This faculty is already registered.';
    }
    return '';
  };

  const validateFacultyYearsField = (raw) => {
    const years = Number(raw);
    if (!Number.isFinite(years) || years < 4 || years > 7) {
      return 'Years must be between 4 and 7.';
    }
    return '';
  };

  const handleAddFaculty = async () => {
    setFacultyNameTouched(true);
    const name = String(newFacultyName || '').trim().replace(/\s+/g, ' ');
    const nameErr = validateFacultyNameField(name);
    const yearsErr = validateFacultyYearsField(newFacultyYears);
    setFacultyNameError(nameErr);
    setFacultyYearsError(yearsErr);
    if (nameErr || yearsErr) return;

    const years = Math.trunc(Number(newFacultyYears));
    setFacultyRows((prev) => [...prev, { faculty: name, program_years: years }]);
    setNewFacultyName('');
    setNewFacultyYears(4);
    setFacultyNameError('');
    setFacultyYearsError('');
    setFacultyNameTouched(false);
    setFeedback({
      tone: 'ok',
      message: `Added "${name}" (${years}y). Click Save faculty years to keep it.`,
    });
  };

  const handleRemoveFaculty = async (faculty) => {
    const assigned = facultyAssignedCounts[faculty] || 0;
    if (assigned > 0) {
      await showError(
        'Cannot remove faculty',
        `"${faculty}" has ${assigned} people in the directory. Move or remove them first (assigned must be 0).`
      );
      return;
    }

    const ok = await showConfirm({
      title: 'Remove faculty?',
      text: `Remove "${faculty}" from the faculty years list?`,
      confirmText: 'Yes, remove',
    });
    if (!ok) return;
    setSaving(true);
    try {
      setFacultyRows((prev) => prev.filter((r) => r.faculty !== faculty));
      try {
        await deleteFacultyProgramYear(faculty);
      } catch (e) {
        if (e?.message && /assigned|directory/i.test(e.message)) {
          throw e;
        }
        // May not exist in DB yet if never saved — local remove is enough
      }
      if (form.faculty === faculty) {
        setForm((prev) => ({ ...prev, faculty: FACULTY_OPTIONS[0] || '' }));
      }
      setFeedback({ tone: 'ok', message: `Removed "${faculty}".` });
      await showSuccess('Removed', `"${faculty}" was removed.`);
      await loadAll();
    } catch (e) {
      setFeedback({ tone: 'error', message: e.message || 'Could not remove faculty.' });
      await showError('Remove failed', e.message || 'Could not remove faculty.');
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const ay = getCurrentAcademicYearStart();
    const csv = `student_id,full_name,phone_number,faculty,email,intake_year,status\nCS${String(ay).slice(2)}00001,Example User,"0610000000",Computer Science and IT,example@student.jazeerauniversity.edu.so,${ay},pending\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ju-student-directory-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!session || session.role !== 'admin') {
    return (
      <div className="glass-card rounded-[28px] p-8 text-center">
        <Settings2 className="mx-auto text-[#1A56DB]" size={28} />
        <h2 className="mt-3 text-xl font-black text-slate-950">Admin only</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Sign in with an admin account to manage the campus directory.
        </p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="glass-card rounded-[28px] p-8 text-center">
        <Settings2 className="mx-auto text-[#1A56DB]" size={28} />
        <h2 className="mt-3 text-xl font-black text-slate-950">Super Admin only</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Campus directory Setup is limited to Super Admin (admin2@ju.edu.so).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass-card flex flex-col gap-3 border border-[#1A56DB]/15 bg-blue-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">Campus access control</p>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            Expiry runs automatically when you save faculty years, and when users log in. No manual
            step needed.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          disabled={loading || saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh list
        </button>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            feedback.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? 'bg-[#1A56DB] text-white shadow-lg shadow-blue-500/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'directory' ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={0}
              icon="users"
              value={counts.total}
              label="Total Directory"
              trendLabel={`${counts.activated} activated`}
              subLabel="Campus directory"
              sparkData={sparklines.total}
            />
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={1}
              icon="alert"
              value={counts.pending}
              label="Pending Activation"
              urgent={counts.pending > 0}
              trendLabel={counts.pending > 0 ? 'Not activated' : 'Queue clear'}
              sparkData={sparklines.pending}
            />
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={2}
              icon="check"
              value={counts.activated}
              label="Activated Accounts"
              trendLabel="Have app accounts"
              sparkData={sparklines.activated}
            />
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={3}
              icon="clock"
              value={counts.expired}
              label="Expired Access"
              urgent={counts.expired > 0}
              trendLabel={counts.expired > 0 ? 'Access locked' : 'None locked'}
              sparkData={sparklines.expired}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="glass-card overflow-hidden rounded-[28px] !p-0">
              <div className="flex flex-col gap-3 border-b border-white/50 bg-white/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search ID, name, faculty…"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]/40"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="activated">Activated</option>
                  <option value="expired">Expired</option>
                </select>
                <select
                  value={facultyFilter}
                  onChange={(e) => {
                    setFacultyFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 max-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  <option value="all">All faculties</option>
                  <option value="unassigned">Unassigned</option>
                  {facultyOptions.map((faculty) => (
                    <option key={faculty} value={faculty}>
                      {faculty}
                    </option>
                  ))}
                </select>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-[#1A56DB] px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20">
                  <Upload size={15} />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                >
                  <Download size={15} />
                  Template
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-white/40 bg-white/[0.12] text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Faculty / years</th>
                      <th className="px-4 py-3">Access</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                          Loading directory…
                        </td>
                      </tr>
                    ) : pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                          No people match your filters.
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((student) => (
                        <tr key={student.student_id} className="border-b border-white/30 last:border-b-0">
                          <td className="px-4 py-3">
                            <p className="text-sm font-black text-slate-900">{student.full_name}</p>
                            <p className="text-xs font-bold text-[#0759B8]">{student.student_id}</p>
                            <p className="text-xs text-slate-500">{student.phone_number || 'No phone'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">{student.faculty || '—'}</p>
                            <p className="text-xs text-slate-500">
                              Intake {student.intake_label || formatAcademicYearLabel(student.intake_year)} ·{' '}
                              {student.program_years || 4}y · ends {student.expires_at || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill student={student} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleDelete(student.student_id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-white/50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  {filtered.length} shown · page {page}/{totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveOne} className="glass-card space-y-3 rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#1A56DB]" />
                <h3 className="text-base font-black text-slate-950">Add / update</h3>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Upserts by ID. Intake is the current academic year only (
                {formatAcademicYearLabel(getCurrentAcademicYearStart())}) — no past or future.
              </p>
              {[
                ['student_id', 'ID', 'CS2600123'],
                ['full_name', 'Full name', 'Full name'],
                ['phone_number', 'Phone', '061…'],
                ['email', 'Email (optional)', 'name@…'],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                  <input
                    required={key === 'student_id' || key === 'full_name' || key === 'phone_number'}
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]/40"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Faculty</span>
                <select
                  value={form.faculty}
                  onChange={(e) => setForm((prev) => ({ ...prev, faculty: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  {formFacultyOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Academic year (intake)
                </span>
                <select
                  required
                  value={form.intake_year}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, intake_year: Number(e.target.value) }))
                  }
                  className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  {intakeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] text-sm font-black text-white shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="glass-card max-w-3xl space-y-4 rounded-[28px] p-5">
          <div>
            <h3 className="text-lg font-black text-slate-950">Faculty program years</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Fill Faculty name (required), set years (4–7), then Save. Save is blocked while the
              name is empty. Access ends on 31 July of (academic-year start + program years).
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-[#1A56DB]/35 bg-blue-50/40 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Register faculty
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <label className="block min-w-0 flex-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Faculty name
                </span>
                <input
                  value={newFacultyName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setNewFacultyName(next);
                    if (facultyNameError) {
                      setFacultyNameError(
                        next.trim() ? validateFacultyNameField(next, { allowEmpty: true }) : ''
                      );
                    }
                  }}
                  onBlur={() => {
                    // Only show error after user tried Add/Save, not on first blur of empty field
                    if (facultyNameTouched && !String(newFacultyName || '').trim()) {
                      setFacultyNameError('Faculty name is required.');
                    }
                  }}
                  placeholder="e.g. Law & Sharia"
                  aria-invalid={Boolean(facultyNameError)}
                  className={`mt-1 h-11 w-full rounded-2xl border bg-white px-3 text-sm font-semibold text-slate-800 outline-none ${
                    facultyNameError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-200 focus:border-[#1A56DB]/40'
                  }`}
                />
                {facultyNameError ? (
                  <p className="mt-1.5 text-xs font-semibold text-red-600" role="alert">
                    {facultyNameError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs font-medium text-slate-400">
                    Required for Save — letters only (e.g. Law & Sharia). No numbers.
                  </p>
                )}
              </label>
              <label className="block w-full sm:w-28">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Years
                </span>
                <input
                  type="number"
                  min={4}
                  max={7}
                  value={newFacultyYears}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setNewFacultyYears(Number.isFinite(next) ? next : '');
                    setFacultyYearsError(validateFacultyYearsField(next));
                  }}
                  onBlur={() => setFacultyYearsError(validateFacultyYearsField(newFacultyYears))}
                  aria-invalid={Boolean(facultyYearsError)}
                  className={`mt-1 h-11 w-full rounded-2xl border bg-white px-3 text-center text-sm font-black text-slate-900 ${
                    facultyYearsError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-200'
                  }`}
                />
                {facultyYearsError ? (
                  <p className="mt-1.5 text-xs font-semibold text-red-600" role="alert">
                    {facultyYearsError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs font-medium text-slate-400">4–7</p>
                )}
              </label>
              <button
                type="button"
                onClick={handleAddFaculty}
                disabled={saving}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[#1A56DB] px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 sm:mt-6"
              >
                <Plus size={16} />
                Add faculty
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {facultyRows.map((row, index) => {
              const assigned = facultyAssignedCounts[row.faculty] || 0;
              const canRemove = assigned === 0;
              const yearsNum = Number(row.program_years);
              const yearsInvalid =
                !Number.isFinite(yearsNum) || yearsNum < 4 || yearsNum > 7;
              return (
              <div
                key={row.faculty}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-black text-slate-900">{row.faculty}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center">
                    <span>Years</span>
                    <input
                      type="number"
                      min={4}
                      max={7}
                      value={row.program_years}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const value = raw === '' ? '' : Number(raw);
                        setFacultyRows((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, program_years: value } : item
                          )
                        );
                      }}
                      className={`h-10 w-20 rounded-xl border bg-white px-2 text-center font-black text-slate-900 ${
                        yearsInvalid
                          ? 'border-red-400'
                          : 'border-slate-200'
                      }`}
                    />
                    {yearsInvalid ? (
                      <span className="text-xs font-semibold text-red-600">Must be 4–7</span>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    disabled={saving || !canRemove}
                    title={
                      canRemove
                        ? 'Remove faculty'
                        : `Cannot remove — ${assigned} people are linked to this faculty`
                    }
                    onClick={() => handleRemoveFaculty(row.faculty)}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
              );
            })}
            {!facultyRows.length ? (
              <p className="text-sm font-medium text-slate-500">
                No faculties yet — register one above.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              disabled={saving || !canSaveFacultyYears}
              title={
                !registerNameTrimmed
                  ? 'Faculty name is required before Save'
                  : invalidFacultyYears.length
                    ? 'Fix years (must be 4–7, not 0) before saving'
                    : 'Save faculty years to the database'
              }
              onClick={handleSaveYears}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] px-5 text-sm font-black text-white shadow-lg shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save faculty years
            </button>
            {!registerNameTrimmed ? (
              <p className="text-xs font-semibold text-red-600" role="alert">
                Save blocked — Faculty name is required.
              </p>
            ) : invalidFacultyYears.length ? (
              <p className="text-xs font-semibold text-red-600" role="alert">
                Save blocked — years must be 4–7 (not 0). Fix:{' '}
                {invalidFacultyYears.map((r) => r.faculty).join(', ')}.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
