'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import StatCard from '@/components/admin/StatCard';
import {
  Archive,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { fetchArchivedItems, purgeArchivedItem, restoreArchivedItem, runAutoArchiveStaleItems } from '@/lib/supabase';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';
import { categoriesForFilter } from '@/lib/categories';
import { buildArchivedPageSparklines } from '@/lib/pageSparklines';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import { invalidateAdminCaches } from '@/lib/adminDataCache';
import ArchiveTrendsChart from '@/components/admin/archived/ArchiveTrendsChart';

const PAGE_SIZE = 8;

const TYPE_TABS = [
  { id: 'all', label: 'All Archived' },
  { id: 'LOST', label: 'Lost' },
];

function formatDate(value) {
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

function sortArchived(list, sortBy) {
  const rows = [...list];
  if (sortBy === 'oldest') return rows.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
  if (sortBy === 'name') return rows.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  if (sortBy === 'name-desc') return rows.sort((a, b) => (b.displayName || '').localeCompare(a.displayName || ''));
  return rows.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
}

function ItemThumb({ item }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl, item.id]);

  if (!item.imageUrl || failed) {
    const PlaceholderIcon = getItemPlaceholderIcon(
      item.displayName || item.itemName || item.item_name,
      item.displayCategory || item.category
    );
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 text-amber-700">
        <PlaceholderIcon size={22} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
      <SafeRemoteImage
        src={item.imageUrl}
        alt={item.displayName}
        fill
        className="object-cover"
        sizes="56px"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function DetailModal({ item, busy, onClose, onRestore, onDelete }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button type="button" className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose} aria-label="Close" />
      <div className="glass-modal relative flex max-h-[min(92vh,820px)] w-full max-w-5xl flex-col overflow-hidden sm:rounded-[28px]">
        <div className="relative shrink-0 overflow-hidden border-b border-white/60 px-5 py-4 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/20 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Archived record</p>
              <h3 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">{item.displayName}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Removed from the mobile app feed — restore anytime.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(300px,1.1fr)_minmax(0,1fr)]">
            <DetailPhotoPanel
              src={item.imageUrl}
              alt={item.displayName}
              emptyIcon={Archive}
              emptyLabel="No image archived"
              badge={{
                label: item.displayType,
                className:
                  item.displayType === 'FOUND'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700',
              }}
            />
            <section className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700/80">Archive reason</p>
                <p className="mt-1 text-sm font-bold text-amber-950">{item.displayReason}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Description</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.displayDescription}</p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ['Category', item.displayCategory],
                  ['Location', item.displayLocation],
                  ['Original reporter', item.displayOriginalReporter],
                  ['Reporter email', item.displayReporterEmail || 'Not recorded'],
                  ['Archived at', formatDate(item.archivedAt)],
                  ['Archived by', item.displayArchivedBy],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/50 px-4 py-3 sm:px-5">
          <button type="button" onClick={onClose} className="glass-button min-w-[90px] flex-1 rounded-2xl py-3 text-sm font-bold text-slate-600">
            Close
          </button>
          {onDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(item)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 size={16} />
              Delete
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onRestore(item)}
            className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF] disabled:opacity-60"
          >
            <RotateCcw size={16} />
            {busy ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestoreConfirmModal({ item, loading, onCancel, onConfirm }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB]">
          <RotateCcw size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Restore item?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">&ldquo;{item.displayName}&rdquo;</span> will return to live
          inventory and appear again in the mobile app.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? 'Working…' : 'Yes, restore'}
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
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Delete forever?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">&ldquo;{item.displayName}&rdquo;</span> will be permanently
          removed from the archive. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ArchivedItemsClient() {
  const router = useRouter();
  const { session, ready } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();

  const { data, error, refresh, patchData } = useBackgroundFetch('admin:archived', fetchArchivedItems, {
    fallback: [],
  });
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const [tab, setTab] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const sparklines = useMemo(() => buildArchivedPageSparklines(items), [items]);

  useEffect(() => {
    if (!ready) return;
    if (!isSuperAdmin) router.replace('/admin/items');
  }, [ready, isSuperAdmin, router]);

  // When Super Admin opens Archive, run Backend auto-archive then refresh list.
  useEffect(() => {
    if (!ready || !isSuperAdmin) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = await runAutoArchiveStaleItems();
        if (cancelled) return;
        if (result?.archived > 0) {
          invalidateAdminCaches('admin:archived', 'admin:items', 'admin:dashboard', 'admin:reports');
          await refresh();
          setToast({
            type: 'success',
            text: result.message || `Auto-archived ${result.archived} stale item(s).`,
          });
        }
      } catch {
        /* scheduler still runs on Backend; ignore UI trigger failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, isSuperAdmin, refresh]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const categories = useMemo(() => ['all', ...categoriesForFilter(items, 'displayCategory')], [items]);

  const counts = useMemo(
    () => ({
      all: items.length,
      LOST: items.filter((i) => i.displayType === 'LOST').length,
      FOUND: items.filter((i) => i.displayType === 'FOUND').length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const next = items.filter((item) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'LOST' && (item.displayType === 'LOST' || item.displayType === 'FOUND')) ||
        item.displayType === tab;
      const matchesCategory = category === 'all' || item.displayCategory === category;
      const haystack = [
        item.displayName,
        item.displayCategory,
        item.displayLocation,
        item.displayOriginalReporter,
        item.displayReason,
        item.refId,
      ]
        .join(' ')
        .toLowerCase();
      return matchesTab && matchesCategory && (!q || haystack.includes(q));
    });
    return sortArchived(next, sortBy);
  }, [items, tab, category, search, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [tab, category, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters = tab !== 'all' || category !== 'all' || sortBy !== 'newest' || search.trim() !== '';

  const resetFilters = () => {
    setTab('all');
    setCategory('all');
    setSortBy('newest');
    setSearch('');
    setPage(1);
  };

  const runRestore = useCallback(
    async (item) => {
      if (!item?.id) return;
      setBusyId(item.id);
      setToast(null);
      try {
        await restoreArchivedItem(item);
        patchData((current) => (Array.isArray(current) ? current.filter((row) => row.id !== item.id) : []));
        invalidateAdminCaches('admin:items', 'admin:dashboard', 'admin:reports', 'admin:my-items', 'admin:archived');
        setSelected(null);
        setRestoreTarget(null);
        setToast({ type: 'success', text: `"${item.displayName}" restored to live inventory.` });
        setSparkPlayKey((k) => k + 1);
      } catch (err) {
        setToast({ type: 'error', text: err?.message || 'Could not restore item.' });
      } finally {
        setBusyId(null);
      }
    },
    [patchData]
  );

  const runDelete = useCallback(
    async (item) => {
      if (!item?.id) return;
      setBusyId(item.id);
      setToast(null);
      try {
        await purgeArchivedItem(item);
        patchData((current) => (Array.isArray(current) ? current.filter((row) => row.id !== item.id) : []));
        invalidateAdminCaches('admin:reports', 'admin:archived');
        setSelected(null);
        setDeleteTarget(null);
        setToast({ type: 'success', text: `"${item.displayName}" permanently deleted from archive.` });
        setSparkPlayKey((k) => k + 1);
      } catch (err) {
        setToast({ type: 'error', text: err?.message || 'Could not delete archived item.' });
      } finally {
        setBusyId(null);
      }
    },
    [patchData]
  );

  const handleRefresh = useCallback(() => {
    refresh();
    setSparkPlayKey((k) => k + 1);
  }, [refresh]);

  useEffect(() => {
    setActions(
      <>
        <Link
          href="/admin/items"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
        >
          <Archive size={13} />
          <span className="hidden sm:inline">All Items</span>
        </Link>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB]"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh]);

  if (!ready || !isSuperAdmin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact info strip */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/70 px-3.5 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25">
          <Archive size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="text-sm font-black text-slate-950">Campus archive vault</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-white/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800">
              <ShieldAlert size={9} />
              Super Admin
            </span>
          </div>
          <p className="truncate text-[11px] font-medium text-slate-500">
            Off app feed · restore anytime · auto after 60 days · or All Items → Archive
          </p>
        </div>
      </div>

      {/* Stats with sparklines */}
      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="package"
          value={counts.all}
          label="Total Archived"
          trendLabel={`${counts.FOUND} found`}
          subLabel={`${counts.LOST} lost`}
          sparkData={sparklines.total}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="alert"
          value={counts.LOST}
          label="Lost Archived"
          trendLabel="Lost reports"
          subLabel="Vault lost items"
          sparkData={sparklines.lost}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="check"
          value={counts.FOUND}
          label="Found Archived"
          trendLabel="Found reports"
          subLabel="Vault found items"
          sparkData={sparklines.found}
        />
      </div>

      {toast ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="rounded-lg p-1 hover:bg-black/5" aria-label="Dismiss">
            <X size={16} />
          </button>
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

      {/* Filters — same layout as All Users */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex max-w-full overflow-x-auto rounded-[22px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-[14px] px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                tab === t.id ? 'glass-tab-active text-slate-900' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
              }`}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1 lg:min-w-[260px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, location..."
              className="glass-input h-10 w-full rounded-[18px] pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15 lg:w-[280px]"
            />
          </label>

          <label className="relative min-w-[140px]">
            <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input h-10 w-full appearance-none rounded-[18px] pl-9 pr-8 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All categories' : c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </label>

          <label className="relative min-w-[130px]">
            <ArrowUpDown size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input h-10 w-full appearance-none rounded-[18px] pl-9 pr-8 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </label>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="glass-button inline-flex h-10 items-center gap-1.5 rounded-[18px] px-3 text-xs font-bold text-slate-600 transition hover:text-[#1A56DB]"
            >
              <X size={14} />
              Reset
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleRefresh}
            className="glass-button flex h-10 w-10 items-center justify-center rounded-[18px] text-slate-500 transition hover:text-[#1A56DB]"
            aria-label="Refresh archived items"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Results */}
      {pageItems.length === 0 ? (
        <div className="glass-card flex min-h-[340px] flex-col items-center justify-center rounded-[28px] px-6 py-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 shadow-inner">
            <Archive size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-950">
            {items.length === 0 ? 'Archive is empty' : 'No matches for these filters'}
          </h3>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            {items.length === 0
              ? 'Items older than 60 days are auto-archived off the mobile feed. You can also archive manually from All Items.'
              : 'Try Reset, change type/category, or clear your search.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {items.length === 0 ? (
              <Link
                href="/admin/items"
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-amber-600/25 transition hover:bg-amber-700"
              >
                <Archive size={16} />
                Go to All Items
              </Link>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl bg-[#1A56DB] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/25"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-[28px] !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-amber-100/80 bg-gradient-to-r from-amber-50/80 via-white/40 to-transparent text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Item</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Reason</th>
                  <th className="px-4 py-4">Archived</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className="group border-b border-white/40 transition last:border-b-0 hover:bg-amber-50/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <ItemThumb item={item} />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-slate-900 group-hover:text-[#1A56DB]">
                            {item.displayName}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-slate-400">
                            <span>{item.refId}</span>
                            <span className="text-slate-300">·</span>
                            <span>{item.displayCategory}</span>
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin size={11} />
                              {item.displayLocation}
                            </span>
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                          item.displayType === 'FOUND'
                            ? 'border border-emerald-200/70 bg-emerald-50 text-emerald-700'
                            : 'border border-blue-200/70 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.displayType}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-4">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-600">{item.displayReason}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(item.archivedAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">by {item.displayArchivedBy}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="glass-button h-9 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-white"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => setRestoreTarget(item)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1A56DB] px-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-[#1E40AF] disabled:opacity-50"
                        >
                          <RotateCcw size={13} />
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => setDeleteTarget(item)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100/70 bg-amber-50/20 px-5 py-3">
            <p className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-black text-slate-800">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
              </span>{' '}
              of <span className="font-black text-slate-800">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${
                      page === pageNum
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                        : 'text-slate-600 hover:bg-white/70'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts below the table */}
      <ArchiveTrendsChart items={items} />

      <DetailModal
        item={selected}
        busy={busyId === selected?.id}
        onClose={() => setSelected(null)}
        onRestore={(item) => setRestoreTarget(item)}
        onDelete={(item) => setDeleteTarget(item)}
      />
      <RestoreConfirmModal
        item={restoreTarget}
        loading={busyId === restoreTarget?.id}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => runRestore(restoreTarget)}
      />
      <DeleteConfirmModal
        item={deleteTarget}
        loading={busyId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => runDelete(deleteTarget)}
      />
    </div>
  );
}
