'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Box,
  ClipboardList,
  Database,
  Download,
  FileText,
  Gift,
  Hourglass,
  Mail,
  RefreshCw,
  RotateCcw,
  Shield,
  Users,
} from 'lucide-react';
import { fetchSystemReportsData } from '@/lib/supabase';
import { buildReportsPageSparklinesFromRecords } from '@/lib/pageSparklines';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import StatCard from '@/components/admin/StatCard';
import ReportFiltersPanel from '@/components/admin/reports/ReportFiltersPanel';
import ClaimsTrackingChart from '@/components/admin/reports/ClaimsTrackingChart';
import CategoriesBreakdownPanel from '@/components/admin/reports/CategoriesBreakdownPanel';

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
  },
  categories: [],
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
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'joined', label: 'Joined' },
  ],
  inventory: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  lost: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  found: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  returned: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'recipient', label: 'Recipient' },
    { key: 'type', label: 'Type' },
    { key: 'returnedAt', label: 'Returned' },
  ],
  pending: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'reporter', label: 'Reporter' },
    { key: 'type', label: 'Type' },
    { key: 'reportedAt', label: 'Submitted' },
  ],
  claims: [
    { key: 'ref', label: 'Ref' },
    { key: 'item', label: 'Item' },
    { key: 'claimer', label: 'Claimer' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'status', label: 'Status' },
    { key: 'requestedAt', label: 'Requested' },
  ],
  drafts: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Saved' },
  ],
  secure: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Posted' },
  ],
  recycle: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Deleted Entity' },
    { key: 'category', label: 'Summary' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Deleted At' },
  ],
  archived: [
    { key: 'ref', label: 'Ref' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
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

function exportCsv(filename, columns, rows) {
  const header = columns.map((column) => column.label);
  const body = rows.map((row) => columns.map((column) => row[column.key] ?? ''));
  const csv = [header, ...body]
    .map((line) =>
      line
        .map((cell) => {
          const value = String(cell ?? '');
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportReportsCsv(view) {
  const rows = [
    ['JU LOFO — System Reports Export'],
    ['Generated', formatGeneratedAt(view.generatedAt)],
    [],
    ['Summary Metric', 'Value'],
    ['Total Users', view.summary.totalUsers],
    ['Total Items', view.summary.totalItems],
    ['Returned Items', view.summary.returnedItems],
    ['Pending Reports', view.summary.pendingReports],
    ['Ownership Claims', view.summary.totalClaims],
    ['Recovery Rate %', view.summary.recoveryRate],
    ['Contact Messages', view.summary.contactMessages ?? 0],
    ['Contact New', view.summary.contactNew ?? 0],
    ['Contact Read', view.summary.contactRead ?? 0],
    ['Contact Archived', view.summary.contactArchived ?? 0],
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ju-lofo-system-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ExportConfirmModal({ count, sourceLabel, summary = false, onCancel, onConfirm }) {
  const canExport = summary || count > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB] shadow-inner">
          <Download size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">
          {summary ? 'Export summary?' : 'Export report?'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {summary ? (
            <>Campus-wide summary metrics will be downloaded as a CSV file.</>
          ) : canExport ? (
            <>
              <span className="font-bold text-slate-700">{count.toLocaleString()}</span> row
              {count === 1 ? '' : 's'} from <span className="font-bold text-slate-700">{sourceLabel}</span> will be
              downloaded as a CSV file.
            </>
          ) : (
            <>No rows match your current filters. Adjust filters before exporting.</>
          )}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white"
          >
            Cancel
          </button>
          {canExport ? (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-2xl bg-[#1A56DB] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF]"
            >
              OK, Export
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
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
          Date range, status, search, and data source will return to defaults (Global Inventory · All time).
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
                    column.key === 'name' || column.key === 'item' ? 'min-w-[180px]' : 'whitespace-nowrap'
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
                  const isStatus = column.key === 'status' || column.key === 'role';
                  const isType = column.key === 'type';
                  const value = isStatus ? formatStatusLabel(raw) : raw;
                  const wrapCell = column.key === 'name' || column.key === 'item' || column.key === 'email' || column.key === 'location';

                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3.5 text-slate-800 ${
                        wrapCell ? 'min-w-[140px] max-w-[240px] whitespace-normal font-semibold' : 'whitespace-nowrap font-medium'
                      } ${column.key === 'ref' ? 'font-mono text-xs text-slate-500' : ''}`}
                    >
                      {isStatus ? (
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
    from: DEFAULT_RANGE.from,
    to: DEFAULT_RANGE.to,
    search: '',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmSummaryExport, setConfirmSummaryExport] = useState(false);
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
  const { summary, categories, dataSources, records, generatedAt } = view;

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

  const statusOptions = useMemo(() => buildStatusOptions(allRows), [allRows]);

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

  const categoriesAreFiltered = useMemo(
    () =>
      ['inventory', 'lost', 'found', 'drafts', 'secure', 'pending', 'returned', 'recycle', 'archived'].includes(
        filters.sourceId
      ) && filteredRows.length > 0,
    [filters.sourceId, filteredRows.length]
  );

  const SelectedIcon = SOURCE_ICONS[filters.sourceId] || Database;

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
      from: range.from,
      to: range.to,
      search: '',
    });
  }

  async function handleRunReport() {
    setRunning(true);
    setFilters((current) => ({ ...current, search: searchDraft.trim() }));
    try {
      await refresh();
      replaySparklines();
    } finally {
      setRunning(false);
      document.getElementById('report-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleSourceChange(sourceId) {
    updateFilters({ sourceId, status: 'all' });
  }

  function jumpToSource(sourceId) {
    setQuickRange('all_time');
    setSearchDraft('');
    setFilters({
      sourceId,
      status: 'all',
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
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextSearch = searchDraft.trim();
        if (current.search === nextSearch) return current;
        return { ...current, search: nextSearch };
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const handleExportSummary = useCallback(() => {
    exportReportsCsv(view);
    setConfirmSummaryExport(false);
  }, [view]);

  const handleExportSelected = useCallback(() => {
    if (!selectedSource || filteredRows.length === 0) return;
    exportCsv(
      `ju-lofo-${selectedSource.id}-report-${new Date().toISOString().slice(0, 10)}.csv`,
      columns,
      filteredRows
    );
    setConfirmExport(false);
  }, [selectedSource, columns, filteredRows]);

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
        <button
          type="button"
          onClick={() => setConfirmSummaryExport(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Summary CSV</span>
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh]);

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
          trendLabel={`${summary.lostItems} lost · ${summary.foundItems} found`}
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
          searchQuery={searchDraft}
          onSearchChange={setSearchDraft}
          onSearchKeyDown={(event) => {
            if (event.key === 'Enter') handleRunReport();
          }}
          onRunReport={handleRunReport}
          running={running}
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
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmExport(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1A56DB] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-[#1648c7]"
                >
                  <Download size={15} />
                  Export CSV
                </button>
              </div>
            </div>

            <ReportTable columns={columns} rows={filteredRows} onResetFilters={() => setConfirmReset(true)} loading={running} />

            <p className="mt-3 text-right text-xs font-semibold text-slate-400">
              Updated {formatGeneratedAt(generatedAt)}
            </p>
          </section>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.65fr_0.85fr]">
        <ClaimsTrackingChart
          rows={allRows}
          sourceId={filters.sourceId}
          sourceLabel={selectedSource?.label}
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

      {confirmExport ? (
        <ExportConfirmModal
          count={filteredRows.length}
          sourceLabel={selectedSource?.label || 'Report'}
          onCancel={() => setConfirmExport(false)}
          onConfirm={handleExportSelected}
        />
      ) : null}

      {confirmSummaryExport ? (
        <ExportConfirmModal
          count={0}
          sourceLabel=""
          summary
          onCancel={() => setConfirmSummaryExport(false)}
          onConfirm={handleExportSummary}
        />
      ) : null}

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
