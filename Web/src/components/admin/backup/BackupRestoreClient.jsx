'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  HardDrive,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  AlertTriangle,
  UserRound,
  X,
} from 'lucide-react';
import {
  fetchRecycleBinItems,
  purgeRecycleBinItem,
  restoreRecycleBinItem,
} from '@/lib/supabase';
import { invalidateAdminCaches } from '@/lib/adminDataCache';
import { normalizeImageUrl, resolveItemImageUrl } from '@/lib/itemImage';
import { buildRecyclePageSparklines } from '@/lib/pageSparklines';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import ItemThumbnail from '@/components/admin/ItemThumbnail';
import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import StatCard from '@/components/admin/StatCard';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'user', label: 'Users' },
  { id: 'lost_item', label: 'Lost' },
  { id: 'found_item', label: 'Found' },
  { id: 'contact_message', label: 'Contact' },
];

const ENTITY_LABEL = {
  user: 'User',
  lost_item: 'Lost item',
  found_item: 'Found item',
  claim: 'Claim',
  returned_item: 'Returned',
  contact_message: 'Contact message',
};

function formatWhen(value) {
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

function getPayload(item) {
  let payload = item?.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload && typeof payload === 'object' ? payload : null;
}

function getPayloadRow(item) {
  const payload = getPayload(item);
  if (!payload) return null;
  if (payload.row && typeof payload.row === 'object') return payload.row;
  // Older / storage snapshots sometimes stored the item fields at the payload root.
  if (payload.itemName || payload.item_name || payload.imageURI || payload.imageuri || payload.image_url) {
    return payload;
  }
  return null;
}

function getRecycleImageUrl(item) {
  const row = getPayloadRow(item);
  const payload = getPayload(item);
  return (
    resolveItemImageUrl(row) ||
    resolveItemImageUrl(payload) ||
    normalizeImageUrl(payload?.imageUrl) ||
    normalizeImageUrl(item?.imageUrl) ||
    null
  );
}

function getRecycleItemType(item) {
  const payload = getPayload(item);
  if (item?.entityType === 'found_item' || payload?.itemType === 'found') return 'found';
  if (item?.entityType === 'lost_item' || payload?.itemType === 'lost') return 'lost';
  return null;
}

function matchesRecycleSearch(item, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;

  const row = getPayloadRow(item) || {};
  const haystack = [
    item.title,
    item.summary,
    item.deletedBy,
    item.entityType,
    item.entityId,
    ENTITY_LABEL[item.entityType],
    row.itemName,
    row.item_name,
    row.category,
    row.location,
    row.description,
    row.email,
    row.name,
    row.ownerName,
    row.finderName,
    row.phnum,
    row.phone,
    row.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

function sortRecycleItems(list, sortBy) {
  const rows = [...list];
  if (sortBy === 'oldest') {
    return rows.sort((a, b) => String(a.deletedAt || '').localeCompare(String(b.deletedAt || '')));
  }
  if (sortBy === 'name') {
    return rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }
  if (sortBy === 'name-desc') {
    return rows.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
  }
  return rows.sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));
}

function DetailField({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{String(value)}</p>
    </div>
  );
}

function RecycleDetailModal({ item, busy, onClose, onRestore, onPurge }) {
  if (!item) return null;

  const row = getPayloadRow(item);
  const imageUrl = getRecycleImageUrl(item);
  const itemType = getRecycleItemType(item);
  const isUser = item.entityType === 'user';
  const isContact = item.entityType === 'contact_message';

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/40 px-4 py-5 backdrop-blur-md">
      <div className="glass-modal flex max-h-[min(92vh,820px)] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
          <div className="min-w-0">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
              {ENTITY_LABEL[item.entityType] || item.entityType}
            </span>
            <h3 className="mt-2 truncate text-xl font-black text-slate-950">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Deleted {formatWhen(item.deletedAt)}
              {item.deletedBy ? ` · by ${item.deletedBy}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(300px,1.1fr)_minmax(0,1fr)]">
          <div className="min-h-[300px] border-b border-slate-100 p-4 lg:min-h-0 lg:border-b-0 lg:border-r lg:border-slate-100">
            {isUser ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-400">
                <UserRound size={48} strokeWidth={1.5} />
                <p className="text-sm font-semibold">User account</p>
              </div>
            ) : isContact ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-400">
                <Mail size={48} strokeWidth={1.5} />
                <p className="text-sm font-semibold">Contact message</p>
              </div>
            ) : (
              <DetailPhotoPanel
                src={imageUrl}
                alt={item.title}
                badge={{
                  label: itemType === 'found' ? 'Found' : 'Lost',
                  className:
                    itemType === 'found'
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-rose-500/90 text-white',
                }}
                emptyLabel={itemType ? 'No photo on this report' : 'No image'}
              />
            )}
          </div>

          <div className="space-y-3 overflow-y-auto p-5">
            {isUser ? (
              <>
                <DetailField label="Name" value={row?.name || item.title} />
                <DetailField label="Email" value={row?.email} />
                <DetailField label="Role" value={row?.role} />
                <DetailField label="Phone" value={row?.phone || row?.phnum} />
                <DetailField label="Student ID" value={row?.student_id || row?.studentId || row?.id_number} />
              </>
            ) : isContact ? (
              <>
                <DetailField
                  label="Sender"
                  value={`${row?.first_name || ''} ${row?.last_name || ''}`.trim() || item.title}
                />
                <DetailField label="Email" value={row?.email} />
                <DetailField label="Phone" value={row?.phone} />
                <DetailField label="Subject" value={row?.subject || item.summary} />
                <DetailField label="Message" value={row?.message} />
                <DetailField label="Status" value={row?.status} />
              </>
            ) : (
              <>
                <DetailField label="Item name" value={row?.itemName || row?.item_name || item.title} />
                <DetailField label="Category" value={row?.category} />
                <DetailField label="Location" value={row?.location} />
                <DetailField
                  label="Description"
                  value={row?.description}
                />
                <DetailField
                  label={itemType === 'found' ? 'Date found' : 'Date lost'}
                  value={
                    row?.dateFound ||
                    row?.date_found ||
                    row?.dateLost ||
                    row?.date_lost ||
                    row?.reportDate
                  }
                />
                <DetailField
                  label={itemType === 'found' ? 'Finder' : 'Owner'}
                  value={row?.finderName || row?.ownerName || row?.owner_name}
                />
                <DetailField label="Email" value={row?.email} />
                <DetailField label="Phone" value={row?.phnum || row?.phone} />
                <DetailField label="Status" value={row?.status} />
              </>
            )}
            {!row ? (
              <p className="text-sm text-amber-700">Snapshot details were not saved for this entry.</p>
            ) : null}
          </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200/70 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="glass-button rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onPurge}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={14} />
            Delete forever
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRestore}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, loading, destructive, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            destructive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {destructive ? <Trash2 size={24} /> : <RotateCcw size={24} />}
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white disabled:opacity-60 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildPurgeConfirm(item, step = 1) {
  const isUser = item.entityType === 'user';
  const name = item.entryTitle || item.title || (isUser ? 'this user' : 'this item');

  if (step === 1) {
    return {
      type: 'purge',
      step: 1,
      id: item.id,
      entityType: item.entityType,
      entryTitle: name,
      title: 'Delete forever?',
      message: `This deleted record “${name}” will be removed permanently.`,
      confirmText: 'Continue',
      destructive: true,
    };
  }

  return {
    type: 'purge',
    step: 2,
    id: item.id,
    entityType: item.entityType,
    entryTitle: name,
    title: 'Are you sure?',
    message: isUser
      ? `Are you sure you want to permanently delete this user “${name}”? This cannot be undone.`
      : `Are you sure you want to permanently delete this item “${name}”? This cannot be undone.`,
    confirmText: isUser ? 'Yes, delete user' : 'Yes, delete item',
    destructive: true,
  };
}

function ResultBanner({ state, onClose }) {
  if (!state) return null;
  const ok = state.type === 'success';
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
        ok ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800' : 'border-amber-200 bg-amber-50/80 text-amber-900'
      }`}
    >
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">{state.title}</p>
        <p className="mt-0.5 text-sm leading-5 opacity-90">{state.message}</p>
      </div>
      <button type="button" onClick={onClose} className="text-xs font-bold underline">
        Dismiss
      </button>
    </div>
  );
}

export default function BackupRestoreClient() {
  const router = useRouter();
  const { session, ready } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();
  const [items, setItems] = useState([]);
  const [binAvailable, setBinAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [banner, setBanner] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const loadBin = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecycleBinItems();
      setBinAvailable(result.available !== false);
      setItems(result.items || []);
      setSparkPlayKey((k) => k + 1);
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Could not load deleted records',
        message: error?.message || 'Check your connection and try Refresh.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isSuperAdmin) {
      router.replace('/admin/items');
      return;
    }
    loadBin();
  }, [ready, isSuperAdmin, router, loadBin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      clearActions();
      return undefined;
    }
    setActions(
      <button
        type="button"
        onClick={loadBin}
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB]"
      >
        <RefreshCw size={13} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    );
    return () => clearActions();
  }, [setActions, clearActions, loadBin, isSuperAdmin]);

  const counts = useMemo(() => {
    const c = { all: items.length, user: 0, lost_item: 0, found_item: 0, contact_message: 0 };
    items.forEach((item) => {
      if (c[item.entityType] != null) c[item.entityType] += 1;
    });
    return c;
  }, [items]);

  const itemCount = counts.lost_item + counts.found_item;
  const sparklines = useMemo(() => buildRecyclePageSparklines(items), [items]);

  const filteredItems = useMemo(() => {
    const byType =
      entityFilter === 'all' ? items : items.filter((item) => item.entityType === entityFilter);
    const bySearch = byType.filter((item) => matchesRecycleSearch(item, search));
    return sortRecycleItems(bySearch, sortBy);
  }, [items, entityFilter, search, sortBy]);

  const hasActiveFilters = entityFilter !== 'all' || Boolean(search.trim()) || sortBy !== 'newest';

  const runRestore = async (id) => {
    setBusyId(id);
    try {
      await restoreRecycleBinItem(id);
      setItems((prev) => prev.filter((row) => row.id !== id));
      setSparkPlayKey((k) => k + 1);
      setDetailItem(null);
      invalidateAdminCaches(
        'admin:users',
        'admin:items',
        'admin:dashboard',
        'admin:reports',
        'admin:drafts',
        'admin:contact-messages'
      );
      setBanner({ type: 'success', title: 'Restored', message: 'The record is back in the live system.' });
    } catch (error) {
      setBanner({ type: 'error', title: 'Restore failed', message: error?.message || 'Could not restore.' });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  const runPurge = async (id) => {
    setBusyId(id);
    try {
      await purgeRecycleBinItem(id);
      setItems((prev) => prev.filter((row) => row.id !== id));
      setSparkPlayKey((k) => k + 1);
      setDetailItem(null);
      setBanner({ type: 'success', title: 'Permanently deleted', message: 'This deleted record cannot be recovered.' });
    } catch (error) {
      setBanner({ type: 'error', title: 'Delete failed', message: error?.message || 'Could not purge entry.' });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  if (!ready || !isSuperAdmin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ResultBanner state={banner} onClose={() => setBanner(null)} />

      <section className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={0}
              icon="package"
              value={counts.all}
              label="Total Deleted"
              trendLabel={`${itemCount} items`}
              subLabel={`${counts.user} users · ${counts.contact_message} contact`}
              sparkData={sparklines.total}
            />
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={1}
              icon="users"
              value={counts.user}
              label="Deleted Users"
              trendLabel="Accounts removed"
              subLabel="Can be restored"
              sparkData={sparklines.users}
            />
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={2}
              icon="laptop"
              value={itemCount}
              label="Deleted Inventory"
              trendLabel="Lost & found"
              subLabel="Can be restored"
              sparkData={sparklines.inventory}
            />
            <StatCard
              compact
              playKey={sparkPlayKey}
              sparkIndex={3}
              icon="clock"
              value={counts.contact_message}
              label="Contact Messages"
              trendLabel="LOFO desk inbox"
              subLabel="Can be restored"
              sparkData={sparklines.contact}
            />
          </div>

          {!binAvailable ? (
            <div className="glass-card rounded-[24px] border-amber-200/70 bg-amber-50/50 p-5">
              <p className="text-sm font-black text-amber-900">Deleted records unavailable</p>
              <p className="mt-1 text-sm text-amber-800/90">
                Could not reach storage. Check Supabase connection, then refresh this page.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-[24px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
              {FILTER_TABS.map((filterTab) => {
                const active = entityFilter === filterTab.id;
                const count = counts[filterTab.id] ?? 0;
                return (
                  <button
                    key={filterTab.id}
                    type="button"
                    onClick={() => setEntityFilter(filterTab.id)}
                    className={`shrink-0 rounded-[18px] px-4 py-2.5 text-sm font-black transition sm:px-5 ${
                      active
                        ? 'bg-white text-[#1A56DB] shadow-sm'
                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
                    }`}
                  >
                    {filterTab.label}
                    <span className={`ml-2 text-xs font-bold ${active ? 'text-[#1A56DB]/70' : 'text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[220px] flex-1 xl:min-w-[280px] xl:w-[380px]">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, category, location, email..."
                  className="glass-input h-12 w-full rounded-[24px] pl-11 pr-4 text-base text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
                />
              </label>
              <label className="relative min-w-[190px]">
                <ArrowUpDown size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort deleted records"
                  className="glass-input h-12 w-full appearance-none rounded-[24px] pl-11 pr-10 text-base font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
                >
                  <option value="newest">Newest deleted</option>
                  <option value="oldest">Oldest deleted</option>
                  <option value="name">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </label>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setEntityFilter('all');
                    setSearch('');
                    setSortBy('newest');
                  }}
                  className="glass-button inline-flex h-12 items-center gap-1.5 rounded-[24px] px-4 text-sm font-bold text-slate-600 hover:text-[#1A56DB]"
                >
                  <X size={15} />
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="glass-card overflow-hidden rounded-[24px] !p-0">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200/70 px-5 py-4">
              <div>
                <h2 className="text-base font-black text-slate-950">Recently deleted</h2>
                <p className="mt-1 text-sm text-slate-500">Restore a user or item you removed by mistake.</p>
              </div>
              {!loading && items.length > 0 ? (
                <p className="text-xs font-bold text-slate-400">
                  Showing {filteredItems.length} of {items.length}
                </p>
              ) : null}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-16 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Loading deleted records…
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <HardDrive size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No deleted records</p>
                <p className="mt-1 text-sm text-slate-500">Deleted users, items, and contact messages will appear here.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Search size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No matching entries</p>
                <p className="mt-1 text-sm text-slate-500">
                  {entityFilter === 'contact_message'
                    ? 'Delete a message from Contact Messages to see it here. Then refresh this page.'
                    : 'Try another search or clear filters.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const imageUrl = getRecycleImageUrl(item);
                  const itemType = getRecycleItemType(item);
                  const isUser = item.entityType === 'user';
                  const isContact = item.entityType === 'contact_message';

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        {isUser ? (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <UserRound size={18} />
                          </div>
                        ) : isContact ? (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
                            <Mail size={18} />
                          </div>
                        ) : (
                          <ItemThumbnail src={imageUrl} alt={item.title} itemType={itemType} />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                              {ENTITY_LABEL[item.entityType] || item.entityType}
                            </span>
                            <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.summary ? `${item.summary} · ` : ''}
                            Deleted {formatWhen(item.deletedAt)}
                            {item.deletedBy ? ` · by ${item.deletedBy}` : ''}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-[#1A56DB]">Tap for full details</p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() =>
                            setConfirm({
                              type: 'restore',
                              id: item.id,
                              title: `Restore “${item.title}”?`,
                              message: 'This record will return to the live admin lists.',
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => setConfirm(buildPurgeConfirm(item, 1))}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

      {detailItem ? (
        <RecycleDetailModal
          item={detailItem}
          busy={busyId === detailItem.id}
          onClose={() => setDetailItem(null)}
          onRestore={() =>
            setConfirm({
              type: 'restore',
              id: detailItem.id,
              title: `Restore “${detailItem.title}”?`,
              message: 'This record will return to the live admin lists.',
            })
          }
          onPurge={() => setConfirm(buildPurgeConfirm(detailItem, 1))}
        />
      ) : null}

      {confirm ? (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmText={
            confirm.type === 'purge'
              ? confirm.confirmText || 'Delete forever'
              : 'Restore'
          }
          destructive={confirm.destructive}
          loading={busyId === confirm.id}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === 'purge') {
              if (confirm.step === 1) {
                setConfirm(buildPurgeConfirm(confirm, 2));
                return;
              }
              runPurge(confirm.id);
              return;
            }
            runRestore(confirm.id);
          }}
        />
      ) : null}
    </div>
  );
}
