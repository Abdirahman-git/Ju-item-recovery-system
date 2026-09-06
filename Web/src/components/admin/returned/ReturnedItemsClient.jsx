'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import {
  Archive,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { deleteReturnedItem, fetchReturnedItems } from '@/lib/supabase';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';
import { buildReturnedPageSparklines } from '@/lib/pageSparklines';
import StatCard from '@/components/admin/StatCard';
import { categoriesForFilter } from '@/lib/categories';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { invalidateAdminCaches } from '@/lib/adminDataCache';
import MonthlyReturnPerformance from '@/components/admin/returned/MonthlyReturnPerformance';

const PAGE_SIZE = 6;

const TYPE_TABS = [
  { id: 'all', label: 'All Items' },
];

function formatDate(value, options = {}) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatSubmittedAt(item) {
  if (item?.submittedAt) return formatDateTime(item.submittedAt);

  const datePart = item?.dateReported ? formatDate(item.dateReported) : '';
  const timePart = item?.timeReported ? String(item.timeReported).slice(0, 5) : '';

  if (datePart && datePart !== 'Not recorded' && timePart) return `${datePart} · ${timePart}`;
  if (datePart && datePart !== 'Not recorded') return datePart;
  if (timePart) return timePart;
  return 'Not recorded';
}

function daysBetween(start, end = new Date()) {
  const date = new Date(start);
  if (!start || Number.isNaN(date.getTime())) return null;
  const diff = Math.max(0, end.getTime() - date.getTime());
  return Math.max(1, Math.round(diff / 86_400_000));
}

function sortReturnedItems(list, sortBy) {
  const rows = [...list];
  if (sortBy === 'oldest') {
    return rows.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
  }
  if (sortBy === 'name') {
    return rows.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }
  if (sortBy === 'recipient') {
    return rows.sort((a, b) => (a.displayRecipient || '').localeCompare(b.displayRecipient || ''));
  }
  return rows.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
}

function csvEscape(value) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function ReturnedImage({ item }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl, item.id]);

  if (!item.imageUrl || failed) {
    const PlaceholderIcon = getItemPlaceholderIcon(
      item.displayName || item.itemName,
      item.displayCategory || item.category
    );
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <PlaceholderIcon size={21} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
      <SafeRemoteImage
        src={item.imageUrl}
        alt={item.displayName}
        fill
        className="object-cover"
        sizes="48px"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ReceiptModal({ item, onClose }) {
  if (!item) return null;

  const submittedLabel = formatSubmittedAt(item);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close receipt"
      />

      <div className="glass-modal relative flex max-h-[min(92vh,820px)] w-full max-w-6xl flex-col overflow-hidden sm:rounded-[28px]">
        <div className="relative shrink-0 overflow-hidden border-b border-white/60 px-5 py-4 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1A56DB]">Return Receipt</p>
              <h3 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-[1.7rem]">
                {item.displayName}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Archived handover record for this item.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/80"
              aria-label="Close receipt"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(360px,1.2fr)_minmax(0,1fr)]">
            <DetailPhotoPanel
              src={item.imageUrl}
              alt={item.displayName}
              emptyIcon={getItemPlaceholderIcon(
                item.displayName || item.itemName,
                item.displayCategory || item.category
              )}
              emptyLabel="No image archived"
              badge={{
                label: 'Reunited',
                className: 'border-slate-200/80 bg-white text-slate-800',
              }}
            />

            <section className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:max-h-full">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A56DB]/10 text-[#1A56DB]">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Submitted</p>
                    <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-800">{submittedLabel}</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-3.5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700/80">Returned</p>
                    <p className="mt-1 whitespace-nowrap text-sm font-bold text-emerald-900">
                      {formatDateTime(item.returnedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Description</p>
                <p className="mt-2 break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                  {item.displayDescription}
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ['Type', item.displayType],
                  ['Category', item.displayCategory],
                  ['Location', item.displayLocation],
                  ['Returned to', item.displayRecipient],
                  ['ID', item.displayRecipientId || 'Not recorded'],
                  ['Original reporter', item.displayOriginalReporter],
                  ['Reporter email', item.displayReporterEmail || 'Not recorded'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportConfirmModal({ count, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB] shadow-inner">
          <Download size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">Export archive?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {count.toLocaleString()} returned item{count === 1 ? '' : 's'} will be downloaded as a CSV file.
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
            className="flex-1 rounded-2xl bg-[#1A56DB] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF]"
          >
            OK, Export
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ item, loading, onCancel, onConfirm }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Delete returned record?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">{item.displayName}</span> will be removed from Returned
          Items and moved to Deleted Records.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Delete
          </button>
        </div>
        <p className="mt-3 text-xs font-medium text-slate-400">{item.refId}</p>
      </div>
    </div>
  );
}

export default function ReturnedItemsClient() {
  const { session } = useSession();
  const { setActions, clearActions } = useAdminHeaderActions();
  const { data, error, refresh, patchData } = useBackgroundFetch('admin:returned', fetchReturnedItems, {
    fallback: [],
  });
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const [tab, setTab] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const foundCount = items.length;
  const lostCount = 0;
  const categories = useMemo(() => ['all', ...categoriesForFilter(items, 'displayCategory')], [items]);
  const tabCounts = {
    all: items.length,
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const next = items.filter((item) => {
      const matchesCategory = category === 'all' || item.displayCategory === category;
      const haystack = [
        item.displayName,
        item.displayCategory,
        item.displayLocation,
        item.displayRecipient,
        item.displayRecipientId,
        item.displayOriginalReporter,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      return matchesCategory && matchesSearch;
    });

    return sortReturnedItems(next, sortBy);
  }, [items, category, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const avgDays = items.length
    ? Math.round(items.reduce((sum, item) => sum + (daysBetween(item.returnedAt) || 1), 0) / items.length)
    : 0;

  const sparklines = useMemo(() => buildReturnedPageSparklines(items), [items]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
    setSparkPlayKey((k) => k + 1);
  }, [refresh]);

  const exportCsv = useCallback(() => {
    const header = [
      'Item',
      'Type',
      'Category',
      'Returned To',
      'ID',
      'Original Reporter',
      'Submitted',
      'Date Returned',
      'Location',
    ];
    const rows = filtered.map((item) => [
      item.displayName,
      item.displayType,
      item.displayCategory,
      item.displayRecipient,
      item.displayRecipientId,
      item.displayOriginalReporter,
      formatSubmittedAt(item),
      formatDateTime(item.returnedAt),
      item.displayLocation,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ju-returned-items.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const requestExport = useCallback(() => {
    setConfirmExport(true);
  }, []);

  const confirmExportCsv = useCallback(() => {
    setConfirmExport(false);
    exportCsv();
  }, [exportCsv]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setToast(null);
    try {
      await deleteReturnedItem(deleteTarget, {
        deletedBy: session?.email || session?.userName || null,
      });
      patchData((current) =>
        Array.isArray(current) ? current.filter((row) => row.id !== deleteTarget.id) : []
      );
      invalidateAdminCaches('admin:reports', 'admin:dashboard', 'admin:backup');
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      setToast({ type: 'success', text: `"${deleteTarget.displayName}" moved to Deleted Records.` });
      setSparkPlayKey((k) => k + 1);
    } catch (err) {
      setToast({ type: 'error', text: err?.message || 'Could not delete returned record.' });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, patchData, selected, session]);

  useEffect(() => {
    setActions(
      <>
        <button
          type="button"
          onClick={requestExport}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Export Archive</span>
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB]"
          aria-label="Refresh returned items"
        >
          <RefreshCw size={13} />
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh, requestExport]);

  return (
    <div className="w-full space-y-5">
      {toast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      {error && items.length === 0 ? (
        <div className="glass-card rounded-[24px] border-red-200/60 bg-red-50/40 p-6 text-center">
          <p className="font-semibold text-red-700">{error}</p>
          <button type="button" onClick={refresh} className="mt-3 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white">
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="check"
          label="Total Returned"
          value={items.length}
          trendLabel="All found / returned"
          subLabel="Reunited with owners"
          sparkData={sparklines.total}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="clock"
          label="Avg. Archive Age"
          value={items.length ? `${avgDays} Days` : '0 Days'}
          trendLabel="Campus archive"
          subLabel="Since return date"
          sparkData={sparklines.archive}
        />
      </div>

      <section>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-[24px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
            {TYPE_TABS.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => {
                  setTab(tabItem.id);
                  setPage(1);
                }}
                className={`shrink-0 rounded-[18px] px-4 py-2.5 text-sm font-black transition sm:px-5 ${
                  tab === tabItem.id
                    ? 'glass-tab-active text-slate-900'
                    : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
                }`}
              >
                {tabItem.label} ({tabCounts[tabItem.id]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 xl:w-[420px]">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by item, recipient or reporter..."
                className="glass-input h-12 w-full rounded-[24px] pl-11 pr-4 text-base text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
              />
            </label>
            <label className="relative min-w-[200px]">
              <Filter size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="glass-input h-12 w-full appearance-none rounded-[24px] pl-11 pr-10 text-base font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
            </label>
            <label className="relative min-w-[190px]">
              <ArrowUpDown size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setPage(1);
                }}
                aria-label="Sort returned items"
                className="glass-input h-12 w-full appearance-none rounded-[24px] pl-11 pr-10 text-base font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Item A–Z</option>
                <option value="recipient">Recipient A–Z</option>
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              className="glass-button flex h-12 w-12 shrink-0 items-center justify-center rounded-[24px] text-slate-500 transition hover:text-[#1A56DB]"
              aria-label="Refresh returned items"
            >
              <RefreshCw size={19} />
            </button>
          </div>
        </div>
      </section>

      <section className="glass-card overflow-hidden rounded-[24px] !p-0">
        <div className="hidden grid-cols-[1.7fr_1.2fr_1.1fr_1fr_0.8fr_0.8fr] border-b border-white/60 px-5 py-4 text-[11px] font-black uppercase tracking-wide text-slate-400 lg:grid">
          <span>Item Detail</span>
          <span>Returned To</span>
          <span>Original Reporter</span>
          <span>Dates</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {pageItems.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
              <Archive size={30} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {items.length > 0 && search.trim()
                ? `No match for “${search.trim()}”`
                : 'No returned items yet'}
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {items.length > 0 && search.trim()
                ? 'Clear the search box to see all returned items, or refresh after an approval.'
                : 'Completed ownership approvals will appear here as archived return records.'}
            </p>
            {items.length > 0 && search.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white"
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-white/60">
            {pageItems.map((item) => (
              <article
                key={item.refId}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelected(item);
                  }
                }}
                className="grid cursor-pointer gap-4 px-5 py-4 transition hover:bg-white/35 focus-visible:bg-blue-50/35 focus-visible:outline-none lg:grid-cols-[1.7fr_1.2fr_1.1fr_1fr_0.8fr_0.8fr] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ReturnedImage item={item} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{item.displayName}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {item.displayCategory}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.displayRecipient}</p>
                  <p className="text-xs text-slate-500">{item.displayRecipientId || 'ID not recorded'}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{item.displayOriginalReporter}</p>
                  <p className="truncate text-xs text-[#1A56DB]">{item.displayReporterEmail || item.displayLocation}</p>
                </div>
                <div className="flex items-start gap-2 text-sm font-semibold text-slate-600">
                  <Calendar size={15} className="mt-0.5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p>{formatDate(item.returnedAt)}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      Submitted {formatSubmittedAt(item)}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-700">
                    <CheckCircle2 size={12} />
                    Reunited
                  </span>
                </div>
                <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(item);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white/55 px-3 py-2 text-xs font-black text-[#1A56DB] transition hover:bg-blue-50"
                  >
                    <Eye size={14} />
                    Receipt
                  </button>
                  <button
                    type="button"
                    disabled={deleting && deleteTarget?.id === item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(item);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 px-5 py-4">
            <p className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filtered.length}</span> returned items
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 4) }, (_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${
                      currentPage === pageNum
                        ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <MonthlyReturnPerformance items={items} />

      <ReceiptModal item={selected} onClose={() => setSelected(null)} />
      <DeleteConfirmModal
        item={deleteTarget}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
      {confirmExport ? (
        <ExportConfirmModal
          count={filtered.length}
          onCancel={() => setConfirmExport(false)}
          onConfirm={confirmExportCsv}
        />
      ) : null}
    </div>
  );
}
