'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Box,
  ClipboardList,
  Database,
  FileText,
  Gift,
  Hourglass,
  Mail,
  RefreshCw,
  RotateCcw,
  Shield,
  Users,
} from 'lucide-react';
import { collectCategoriesFromItems, resolveSystemCategories } from '@/lib/categories';
import { enrichContributorsWithUsers, fetchSystemReportsData } from '@/lib/supabase';
import { buildReportsPageSparklinesFromRecords } from '@/lib/pageSparklines';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import StatCard from '@/components/admin/StatCard';
import ItemThumbnail from '@/components/admin/ItemThumbnail';
import ReportFiltersPanel from '@/components/admin/reports/ReportFiltersPanel';
import ReportExportMenu, { SummaryExportMenu } from '@/components/admin/reports/ReportExportMenu';
import ClaimsTrackingChart from '@/components/admin/reports/ClaimsTrackingChart';
import CategoriesBreakdownPanel from '@/components/admin/reports/CategoriesBreakdownPanel';
import TopContributorsPanel from '@/components/admin/reports/TopContributorsPanel';

const CONTRIBUTOR_SOURCES = new Set(['inventory', 'lost', 'found', 'drafts', 'secure', 'pending']);

function fieldsFromPosterKey(key = '') {
  if (key.startsWith('email:')) return { posterEmail: key.slice(6), studentId: '—' };
  if (key.startsWith('sid:')) return { posterEmail: '', studentId: key.slice(4) };
  return { posterEmail: '', studentId: '—' };
}

function aggregateContributorsFromRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.posterKey || row.reporter || 'unknown';
    if (!map.has(key)) {
      const fromKey = fieldsFromPosterKey(key);
      map.set(key, {
        key,
        name: row.reporter || 'Unknown',
        faculty: row.faculty || 'Unassigned',
        studentId: row.studentId && row.studentId !== '—' ? row.studentId : fromKey.studentId,
        email: row.posterEmail || fromKey.posterEmail || '',
        count: 0,
        lost: 0,
        found: 0,
      });
    }
    const entry = map.get(key);
    entry.count += 1;
    if (entry.faculty === 'Unassigned' && row.faculty) entry.faculty = row.faculty;
    if ((!entry.studentId || entry.studentId === '—') && row.studentId && row.studentId !== '—') {
      entry.studentId = row.studentId;
    }
    if (!entry.email && row.posterEmail) entry.email = row.posterEmail;
    const type = String(row.type || '').toLowerCase();
    if (type === 'found') entry.found += 1;
    else entry.lost += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function getLocalDateKey(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getQuickRangeDates(preset) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  if (preset === 'all_time') {
    return { from: '', to: '' };
  }

  if (preset === 'today') {
    return { from: todayKey, to: todayKey };
  }

  if (preset === 'this_week') {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { from: getLocalDateKey(start), to: todayKey };
  }

  if (preset === 'last_7') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: getLocalDateKey(start), to: todayKey };
  }

  if (preset === 'last_30') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: getLocalDateKey(start), to: todayKey };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: getLocalDateKey(start), to: todayKey };
}

function formatFilterDate(value) {
  if (!value) return 'Any';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(`${value}T12:00:00`)
    );
  } catch {
    return value;
  }
}

function rowStatusKey(row) {
  const value = String(row.status || '').toLowerCase();
  if (value === 'active') return 'active';
  if (value === 'pending') return 'pending';
  if (value === 'admin') return 'admin';
  return value;
}

function filterReportRows(rows, filters) {
  return rows.filter((row) => {
    if (filters.status !== 'all' && rowStatusKey(row) !== filters.status) {
      return false;
    }

    if (filters.faculty && filters.faculty !== 'all') {
      if (String(row.faculty || 'Unassigned') !== filters.faculty) {
        return false;
      }
    }

    if (filters.category && filters.category !== 'all') {
      if (String(row.category || 'Other') !== filters.category) {
        return false;
      }
    }

    if (filters.from || filters.to) {
      if (!row.dateKey) return false;
      if (filters.from && row.dateKey < filters.from) return false;
      if (filters.to && row.dateKey > filters.to) return false;
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const hit = Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term));
      if (!hit) return false;
    }

    return true;
  });
}

function buildStatusOptions(rows = []) {
  const values = new Set();
  rows.forEach((row) => {
    const key = rowStatusKey(row);
    if (key) values.add(key);
  });

  const labelMap = {
    live: 'Live',
    draft: 'Draft',
    pending_review: 'Pending review',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    active: 'Active',
    admin: 'Admin',
    new: 'New',
    read: 'Read',
    archived: 'Archived',
  };

  return [
    { value: 'all', label: 'All statuses' },
    ...Array.from(values)
      .sort()
      .map((value) => ({ value, label: labelMap[value] || formatStatusLabel(value) })),
  ];
}

const DEFAULT_RANGE = getQuickRangeDates('all_time');

const EMPTY_REPORTS = {
  summary: {
    totalUsers: 0,
    students: 0,
    admins: 0,
    approvedStudents: 0,
    pendingStudents: 0,
    totalItems: 0,
    lostItems: 0,
    foundItems: 0,
    returnedItems: 0,
    pendingReports: 0,
    draftItems: 0,
    secureItems: 0,
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    recoveryRate: 0,
    maxUserActivityCount: 0,
    maxUserActivityName: '—',
    maxUserActivityMeta: 'No item posts yet',
  },
  categories: [],
  faculties: [],
  topContributors: [],
  dataSources: [],
  records: {},
  generatedAt: null,
};

const SOURCE_ICONS = {
  users: Users,
  inventory: Box,
  lost: FileText,
  found: Box,
  returned: Gift,
  pending: Hourglass,
  claims: ClipboardList,
  drafts: FileText,
  secure: Shield,
  recycle: Database,
  archived: Archive,
  contact: Mail,
};

const REPORT_COLUMNS = {
  users: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'joined', label: 'Joined' },
  ],
  inventory: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  lost: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  found: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  returned: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'recipient', label: 'Recipient' },
    { key: 'type', label: 'Type' },
    { key: 'returnedAt', label: 'Returned' },
  ],
  pending: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'reporter', label: 'Reporter' },
    { key: 'type', label: 'Type' },
    { key: 'reportedAt', label: 'Submitted' },
  ],
  claims: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'item', label: 'Item' },
    { key: 'claimer', label: 'Claimer' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'status', label: 'Status' },
    { key: 'requestedAt', label: 'Requested' },
  ],
  drafts: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Saved' },
  ],
  secure: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Posted' },
  ],
  recycle: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Deleted Entity' },
    { key: 'category', label: 'Summary' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Deleted At' },
  ],
  archived: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'reason', label: 'Reason' },
    { key: 'archivedBy', label: 'Archived By' },
    { key: 'reportedAt', label: 'Archived' },
  ],
  contact: [
    { key: 'name', label: 'Sender' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'subject', label: 'Subject' },
    { key: 'item', label: 'Item' },
    { key: 'place', label: 'Campus place' },
    { key: 'status', label: 'Status' },
    { key: 'submittedAt', label: 'Submitted' },
  ],
};

function formatGeneratedAt(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function formatStatusLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'live') return 'Live';
  if (normalized === 'draft') return 'Draft';
  if (normalized === 'pending_review') return 'Pending Review';
  if (normalized === 'returned') return 'Returned';
  if (normalized === 'archived') return 'Archived';
  if (normalized === 'deleted') return 'Deleted';
  if (normalized === 'pending') return 'Pending';
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'active') return 'Active';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'new') return 'New';
  if (normalized === 'read') return 'Read';
  return value || '—';
}

function statusTone(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'active' || normalized === 'approved' || normalized === 'live' || normalized === 'read') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (
    normalized === 'pending' ||
    normalized === 'pending_review' ||
    normalized === 'draft' ||
    normalized === 'new'
  ) {
    return 'bg-amber-50 text-amber-700';
  }
  if (normalized === 'rejected') return 'bg-red-50 text-red-600';
  if (normalized === 'deleted') return 'bg-red-50 text-red-600';
  if (normalized === 'admin') return 'bg-violet-50 text-violet-700';
  if (normalized === 'archived') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
}

function ResetConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-inner">
          <RotateCcw size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">Reset filters?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Date range, status, faculty, category, search, and data source will return to defaults (Global Inventory · All time).
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
          >
            Yes, reset
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportItemPhoto({ row }) {
  if (row.isSecure) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600"
        title="Secure hold — photo hidden"
      >
        <span className="text-lg font-black leading-none">!</span>
      </div>
    );
  }

  const itemType = String(row.type || row.reportType || '').toLowerCase() === 'found' ? 'found' : 'lost';

  return <ItemThumbnail src={row.imageUrl} alt={row.name || row.item || 'Item photo'} itemType={itemType} />;
}

function ReportTable({ columns, rows, onResetFilters, loading = false }) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
        <p className="text-base font-extrabold text-slate-700">No records match these filters</p>
        <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
          Try &quot;All time&quot;, change the data source or status, or clear your search.
        </p>
        {onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1648c7]"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[20px] bg-white/75 backdrop-blur-[2px]">
          <RefreshCw size={18} className="animate-spin text-[#1A56DB]" />
          <span className="text-sm font-bold text-slate-600">Refreshing report...</span>
        </div>
      ) : null}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 ${
                    column.key === 'imageUrl'
                      ? 'w-[72px]'
                      : column.key === 'name' || column.key === 'item'
                        ? 'min-w-[180px]'
                        : 'whitespace-nowrap'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 transition hover:bg-blue-50/40 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                }`}
              >
                {columns.map((column) => {
                  const raw = row[column.key] ?? '—';
                  const isPhoto = column.key === 'imageUrl';
                  const isStatus = column.key === 'status' || column.key === 'role';
                  const isType = column.key === 'type';
                  const value = isStatus ? formatStatusLabel(raw) : raw;
                  const wrapCell =
                    column.key === 'name' ||
                    column.key === 'item' ||
                    column.key === 'email' ||
                    column.key === 'location' ||
                    column.key === 'faculty' ||
                    column.key === 'reporter';

                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3.5 text-slate-800 ${
                        isPhoto
                          ? 'w-[72px]'
                          : wrapCell
                            ? 'min-w-[140px] max-w-[240px] whitespace-normal font-semibold'
                            : 'whitespace-nowrap font-medium'
                      }`}
                    >
                      {isPhoto ? (
                        <ReportItemPhoto row={row} />
                      ) : isStatus ? (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${statusTone(raw)}`}>
                          {value}
                        </span>
                      ) : isType ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                            String(raw).toLowerCase() === 'found'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {value}
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemReportsClient() {
  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();

  const [quickRange, setQuickRange] = useState('all_time');
  const [filters, setFilters] = useState({
    sourceId: 'inventory',
    status: 'all',
    faculty: 'all',
    category: 'all',
    from: DEFAULT_RANGE.from,
    to: DEFAULT_RANGE.to,
    search: '',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const fetchReports = useCallback(
    () => fetchSystemReportsData({ includePrivilegedSources: isSuperAdmin }),
    [isSuperAdmin]
  );

  const { data, error, refresh } = useBackgroundFetch(
    isSuperAdmin ? 'admin:reports:super' : 'admin:reports',
    fetchReports,
    { fallback: EMPTY_REPORTS }
  );

  const view = data ?? EMPTY_REPORTS;
  const { summary, categories, topContributors, dataSources, records, generatedAt } = view;

  const sparklines = useMemo(() => buildReportsPageSparklinesFromRecords(records), [records]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const replaySparklines = useCallback(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const selectedSource = useMemo(
    () => dataSources.find((source) => source.id === filters.sourceId) || dataSources[0] || null,
    [dataSources, filters.sourceId]
  );

  const columns = REPORT_COLUMNS[filters.sourceId] || REPORT_COLUMNS.users;
  const allRows = records[filters.sourceId] || [];

  const filteredRows = useMemo(() => filterReportRows(allRows, filters), [allRows, filters]);

  const facultyOptions = useMemo(() => {
    const values = new Set();
    allRows.forEach((row) => {
      const faculty = String(row.faculty || '').trim();
      if (faculty) values.add(faculty);
    });
    return [
      { value: 'all', label: 'All faculties' },
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    ];
  }, [allRows]);

  const statusOptions = useMemo(() => buildStatusOptions(allRows), [allRows]);

  const showCategoryFilter = useMemo(
    () => (REPORT_COLUMNS[filters.sourceId] || []).some((column) => column.key === 'category'),
    [filters.sourceId]
  );

  const categoryOptions = useMemo(() => {
    const fromRows = collectCategoriesFromItems(allRows, 'category');
    const list = resolveSystemCategories({ forAdmin: true, extras: fromRows });
    return [
      { value: 'all', label: 'All categories' },
      ...list.map((value) => ({ value, label: value })),
    ];
  }, [allRows]);

  const sourceOptions = useMemo(
    () =>
      dataSources.map((source) => ({
        value: source.id,
        label: `${source.label} (${source.count.toLocaleString()})`,
        icon: SOURCE_ICONS[source.id] || Database,
      })),
    [dataSources]
  );

  const filteredCategories = useMemo(() => {
    if (!filteredRows.length || filters.sourceId === 'users' || filters.sourceId === 'claims' || filters.sourceId === 'contact') {
      return categories.slice(0, 8);
    }
    const map = {};
    filteredRows.forEach((row) => {
      const name = row.category || 'Other';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [filteredRows, filters.sourceId, categories]);

  const categoryTotalItems = useMemo(
    () => filteredCategories.reduce((sum, row) => sum + row.count, 0),
    [filteredCategories]
  );

  const filteredContributors = useMemo(() => {
    if (!CONTRIBUTOR_SOURCES.has(filters.sourceId)) {
      return topContributors || [];
    }
    if (!filteredRows.length) return [];
    return aggregateContributorsFromRows(filteredRows);
  }, [filteredRows, filters.sourceId, topContributors]);

  const contributorTotalPosts = useMemo(
    () => filteredContributors.reduce((sum, row) => sum + row.count, 0),
    [filteredContributors]
  );

  const registeredUsersForIdentity = useMemo(
    () =>
      (records.users || []).map((row) => ({
        name: row.name,
        email: row.email,
        student_id: row.studentId,
        studentId: row.studentId,
        faculty: row.faculty,
        role: row.role === 'Admin' ? 'admin' : 'user',
      })),
    [records.users]
  );

  const displayContributors = useMemo(
    () => enrichContributorsWithUsers(filteredContributors, registeredUsersForIdentity),
    [filteredContributors, registeredUsersForIdentity]
  );

  const categoriesAreFiltered = useMemo(
    () =>
      ['inventory', 'lost', 'found', 'drafts', 'secure', 'pending', 'returned', 'recycle', 'archived'].includes(
        filters.sourceId
      ) && filteredRows.length > 0,
    [filters.sourceId, filteredRows.length]
  );

  const contributorsAreFiltered = useMemo(
    () => CONTRIBUTOR_SOURCES.has(filters.sourceId) && filteredRows.length > 0,
    [filters.sourceId, filteredRows.length]
  );

  const SelectedIcon = SOURCE_ICONS[filters.sourceId] || Database;

  const exportMetaLines = useMemo(
    () =>
      [
        `${filteredRows.length} of ${allRows.length} rows`,
        `${formatFilterDate(filters.from)} → ${formatFilterDate(filters.to)}`,
        filters.status === 'all' ? 'All statuses' : formatStatusLabel(filters.status),
        filters.faculty === 'all' ? 'All faculties' : filters.faculty,
        showCategoryFilter
          ? filters.category === 'all'
            ? 'All categories'
            : filters.category
          : null,
        filters.search ? `Search: "${filters.search}"` : null,
      ].filter(Boolean),
    [filteredRows.length, allRows.length, filters, showCategoryFilter]
  );

  function updateFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleQuickRange(preset) {
    const range = getQuickRangeDates(preset);
    setQuickRange(preset);
    updateFilters({ from: range.from, to: range.to });
  }

  function resetFilters() {
    const range = getQuickRangeDates('all_time');
    setQuickRange('all_time');
    setSearchDraft('');
    setFilters({
      sourceId: 'inventory',
      status: 'all',
      faculty: 'all',
      category: 'all',
      from: range.from,
      to: range.to,
      search: '',
    });
  }

  function handleSourceChange(sourceId) {
    updateFilters({ sourceId, status: 'all', faculty: 'all', category: 'all' });
  }

  function jumpToSource(sourceId) {
    setQuickRange('all_time');
    setSearchDraft('');
    setFilters({
      sourceId,
      status: 'all',
      faculty: 'all',
      category: 'all',
      from: '',
      to: '',
      search: '',
    });
    requestAnimationFrame(() => {
      document.getElementById('report-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  useEffect(() => {
    if (dataSources.length && !dataSources.some((source) => source.id === filters.sourceId)) {
      updateFilters({ sourceId: dataSources[0].id });
    }
  }, [dataSources, filters.sourceId]);

  useEffect(() => {
    if (filters.status !== 'all' && !statusOptions.some((option) => option.value === filters.status)) {
      updateFilters({ status: 'all' });
    }
  }, [filters.sourceId, statusOptions, filters.status]);

  useEffect(() => {
    if (filters.faculty !== 'all' && !facultyOptions.some((option) => option.value === filters.faculty)) {
      updateFilters({ faculty: 'all' });
    }
  }, [filters.sourceId, facultyOptions, filters.faculty]);

  useEffect(() => {
    if (!showCategoryFilter && filters.category !== 'all') {
      updateFilters({ category: 'all' });
    }
  }, [showCategoryFilter, filters.category]);

  useEffect(() => {
    if (filters.category !== 'all' && !categoryOptions.some((option) => option.value === filters.category)) {
      updateFilters({ category: 'all' });
    }
  }, [filters.sourceId, categoryOptions, filters.category]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextSearch = searchDraft.trim();
        if (current.search === nextSearch) return current;
        return { ...current, search: nextSearch };
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const handleRefresh = useCallback(async () => {
    await refresh();
    replaySparklines();
  }, [refresh, replaySparklines]);

  useEffect(() => {
    setActions(
      <>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB] hover:shadow-sm"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <SummaryExportMenu view={view} formatGeneratedAt={formatGeneratedAt} />
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh, view]);

  return (
    <div className="w-full space-y-5 pb-6">
      {error ? (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-2 text-sm text-amber-800">
          Could not refresh system reports. Showing last saved data.
          <button type="button" onClick={refresh} className="ml-2 font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          active={filters.sourceId === 'users'}
          onClick={() => jumpToSource('users')}
          label="Campus Users"
          value={summary.totalUsers}
          icon="users"
          trendLabel={`${summary.approvedStudents} approved`}
          subLabel={`${summary.pendingStudents} pending`}
          sparkData={sparklines.users}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          active={filters.sourceId === 'inventory'}
          onClick={() => jumpToSource('inventory')}
          label="Total Inventory"
          value={summary.totalItems}
          icon="package"
          trendLabel={`${summary.lostItems} lost · ${summary.foundItems} holds`}
          subLabel={
            summary.maxUserActivityCount > 0
              ? `Most active: ${summary.maxUserActivityName} (${summary.maxUserActivityCount})`
              : undefined
          }
          sparkData={sparklines.inventory}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          active={filters.sourceId === 'returned'}
          onClick={() => jumpToSource('returned')}
          label="Successful Returns"
          value={summary.returnedItems}
          icon="check"
          trend={summary.recoveryRate > 0 ? `${summary.recoveryRate}%` : undefined}
          trendLabel="Recovery rate"
          sparkData={sparklines.returned}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          active={filters.sourceId === 'pending' || filters.sourceId === 'claims'}
          onClick={() => jumpToSource('pending')}
          label="Needs Action"
          value={summary.pendingReports + summary.pendingClaims}
          icon="alert"
          urgent={summary.pendingReports + summary.pendingClaims > 0}
          trendLabel={`${summary.pendingReports} reports · ${summary.pendingClaims} claims`}
          sparkData={sparklines.action}
        />
      </div>

      <div id="report-filters" className="report-workspace overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.07)]">
        <ReportFiltersPanel
          quickRange={quickRange}
          onQuickRange={handleQuickRange}
          dateFrom={filters.from}
          dateTo={filters.to}
          onDateFrom={(value) => {
            setQuickRange('custom');
            updateFilters({ from: value });
          }}
          onDateTo={(value) => {
            setQuickRange('custom');
            updateFilters({ to: value });
          }}
          sourceOptions={sourceOptions}
          sourceValue={filters.sourceId}
          onSourceChange={handleSourceChange}
          statusOptions={statusOptions}
          statusValue={filters.status}
          onStatusChange={(status) => updateFilters({ status })}
          facultyOptions={facultyOptions}
          facultyValue={filters.faculty}
          onFacultyChange={(faculty) => updateFilters({ faculty })}
          showCategoryFilter={showCategoryFilter}
          categoryOptions={categoryOptions}
          categoryValue={filters.category}
          onCategoryChange={(category) => updateFilters({ category })}
          searchQuery={searchDraft}
          onSearchChange={setSearchDraft}
        />

        {selectedSource ? (
          <section id="report-results" className="relative z-10 border-t border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
                  <SelectedIcon size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-950">{selectedSource.label}</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">{selectedSource.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      `${filteredRows.length} of ${allRows.length} rows`,
                      `${formatFilterDate(filters.from)} → ${formatFilterDate(filters.to)}`,
                      filters.status === 'all' ? 'All statuses' : formatStatusLabel(filters.status),
                      filters.faculty === 'all' ? 'All faculties' : filters.faculty,
                      showCategoryFilter
                        ? filters.category === 'all'
                          ? 'All categories'
                          : filters.category
                        : null,
                      filters.search ? `"${filters.search}"` : null,
                    ]
                      .filter(Boolean)
                      .map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                        >
                          {chip}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Reset
                </button>
                <ReportExportMenu
                  disabled={filteredRows.length === 0}
                  filename={`ju-lofo-${selectedSource.id}-report-${new Date().toISOString().slice(0, 10)}`}
                  title={selectedSource.label}
                  subtitle={selectedSource.description}
                  generatedAt={generatedAt}
                  metaLines={exportMetaLines}
                  columns={columns}
                  rows={filteredRows}
                  formatStatusLabel={formatStatusLabel}
                  buttonLabel="Export report"
                />
              </div>
            </div>

            <ReportTable columns={columns} rows={filteredRows} onResetFilters={() => setConfirmReset(true)} />

            <p className="mt-3 text-right text-xs font-semibold text-slate-400">
              Updated {formatGeneratedAt(generatedAt)}
            </p>
          </section>
        ) : null}
      </div>

      <div className="space-y-4">
        <ClaimsTrackingChart
          rows={allRows}
          sourceId={filters.sourceId}
          sourceLabel={selectedSource?.label}
        />

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <TopContributorsPanel
            contributors={displayContributors}
            title={
              contributorsAreFiltered ? 'Filtered Top Contributors' : 'Top Contributors'
            }
            subtitle="Most item reports by person across campus inventory"
            totalPosts={contributorTotalPosts || summary.totalItems}
            filtered={contributorsAreFiltered}
          />

          <CategoriesBreakdownPanel
            categories={filteredCategories}
            title={
              filters.sourceId === 'inventory' || filters.sourceId === 'lost' || filters.sourceId === 'found'
                ? 'Filtered Categories'
                : 'Inventory by Category'
            }
            subtitle={
              categoriesAreFiltered
                ? 'Based on current report filters'
                : 'Breakdown of items across campus categories'
            }
            totalItems={categoryTotalItems || filteredRows.length || summary.totalItems}
            onViewAll={() => jumpToSource('inventory')}
          />
        </div>
      </div>

      {confirmReset ? (
        <ResetConfirmModal
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetFilters();
            setConfirmReset(false);
          }}
        />
      ) : null}
    </div>
  );
}
