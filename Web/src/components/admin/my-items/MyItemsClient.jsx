'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import ItemNamePlaceholder from '@/components/admin/ItemNamePlaceholder';
import Link from 'next/link';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { deleteInventoryItem, fetchAllInventoryItems } from '@/lib/supabase';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';
import { getAdminCacheData, setAdminCache, invalidateAdminCaches } from '@/lib/adminDataCache';
import { buildMyItemsPageSparklines } from '@/lib/pageSparklines';
import StatCard from '@/components/admin/StatCard';
import { categoriesForFilter } from '@/lib/categories';
import { filterInventoryItems, getInventoryCardMeta, sortInventoryItems } from '@/lib/inventory';
import { isSecureFoundItem, ITEM_STATUS, normalizeItemStatus } from '@/lib/itemStatus';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { id: 'all', label: 'All Items' },
  { id: 'secure', label: 'Secure' },
  { id: 'lost', label: 'Lost' },
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function formatReportDate(value) {
  if (!value) return 'Recently reported';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'Recently reported';
  }
}

function clampText(text, max = 110) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;
}

function isAdminCreatedItem(item, session) {
  if (!session) return false;
  const email = normalize(session.email);
  const name = normalize(session.userName);
  const studentId = normalize(session.studentId);
  const itemEmails = [item.email, item.userId, item.userid, item.ownerEmail, item.finderEmail].map(normalize);
  const itemNames = [item.ownerName, item.owner_name, item.finderName, item.finder_name].map(normalize);
  const itemIds = [item.student_id, item.studentId].map(normalize);

  return (
    (email && itemEmails.includes(email)) ||
    (name && itemNames.includes(name)) ||
    (studentId && itemIds.includes(studentId))
  );
}

function SecureHoldMark({ large = false, name, category }) {
  return (
    <ItemNamePlaceholder
      name={name}
      category={category}
      secure
      large={large}
      size={large ? 96 : 46}
    />
  );
}

function ItemImage({ item }) {
  const [failed, setFailed] = useState(false);
  const name = item.displayName || item.itemName || item.item_name || '';
  const category = item.displayCategory || item.category || '';

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl, item.id]);

  if (isSecureFoundItem(item)) {
    return <SecureHoldMark name={name} category={category} />;
  }

  if (!item.imageUrl || failed) {
    return <ItemNamePlaceholder name={name} category={category} size={46} />;
  }

  return (
    <SafeRemoteImage
      src={item.imageUrl}
      alt={name || 'Item'}
      fill
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
      sizes="(max-width:768px) 100vw, 33vw"
      onError={() => setFailed(true)}
    />
  );
}

function ItemDetailModal({ item, onClose, onDelete }) {
  if (!item) return null;
  const meta = getInventoryCardMeta(item);
  const isSecure = isSecureFoundItem(item);
  const typeLabel = isSecure
    ? normalizeItemStatus(item) === ITEM_STATUS.DRAFT
      ? 'Secure draft'
      : 'Lost (secure hold)'
    : item.itemType === 'found'
      ? 'Lost item'
      : 'Lost report';
  const publicNotice = item.public_notice || item.publicNotice || item.displayDescription;
  const details = [
    { label: 'Category', value: item.displayCategory },
    { label: 'Type', value: typeLabel },
    { label: 'Location', value: item.displayLocation },
    { label: 'Reported', value: formatReportDate(item.reportedAt) },
    { label: 'Status', value: meta.badge.label },
    { label: 'Reference', value: item.inventoryRef || `${item.itemType}-${item.id}` },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 py-5 backdrop-blur-md">
      <div className="glass-modal flex max-h-[min(92vh,820px)] w-full max-w-6xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between border-b border-white/50 px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{item.displayName}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">{typeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(360px,1.25fr)_minmax(260px,0.75fr)]">
            {isSecure ? (
              <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-amber-50 to-amber-100 lg:h-full lg:min-h-0">
                <SecureHoldMark
                  large
                  name={item.displayName || item.itemName || item.item_name}
                  category={item.displayCategory || item.category}
                />
                <span
                  className={`absolute left-3 top-3 z-[2] rounded-full border border-white/70 px-3 py-1.5 text-[11px] font-black uppercase shadow-lg backdrop-blur-md ${meta.badge.className}`}
                >
                  {meta.badge.label}
                </span>
              </div>
            ) : (
              <DetailPhotoPanel
                src={item.imageUrl}
                alt={item.displayName}
                badge={{ label: meta.badge.label, className: meta.badge.className }}
              />
            )}

            <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto lg:max-h-full">
              <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-3.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Info size={16} className="text-[#1A56DB]" />
                  <h4 className="text-xs font-black uppercase tracking-[0.14em] text-slate-950">Description</h4>
                </div>
                <p className="text-[13px] font-semibold leading-5 text-slate-600">
                  {publicNotice || 'No description provided.'}
                </p>
              </section>

              <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {details.map((detail) => (
                  <div
                    key={detail.label}
                    className="flex flex-col justify-center rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2.5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{detail.label}</p>
                    <p className="mt-0.5 break-words text-[13px] font-black text-slate-800">{detail.value || 'Not provided'}</p>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/50 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="glass-button flex-1 rounded-2xl py-3 text-sm font-bold text-slate-600"
          >
            Close
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              Delete
            </button>
          ) : null}
          {meta.action.href ? (
            <Link
              href={meta.action.href}
              className="flex-1 rounded-2xl bg-[#1A56DB] py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-[#1E40AF]"
            >
              {meta.action.label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DeleteItemConfirmModal({ item, loading, onCancel, onConfirm }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Delete item?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">{item.displayName}</span> will be permanently removed.
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
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onDetails, onDelete }) {
  const meta = getInventoryCardMeta(item);
  const isSecure = isSecureFoundItem(item);
  const reportLabel = isSecure
    ? normalizeItemStatus(item) === ITEM_STATUS.DRAFT
      ? 'Secure draft'
      : 'Lost'
    : item.itemType === 'found'
      ? 'Lost'
      : 'Lost report';

  const openCard = () => onDetails?.(item);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openCard}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openCard();
        }
      }}
      className="group glass-card cursor-pointer overflow-hidden rounded-[24px] !p-0 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB]/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <ItemImage item={item} />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-lg backdrop-blur-sm ${meta.badge.className}`}
        >
          {meta.badge.label}
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 backdrop-blur-sm">
          Admin
        </span>
        {meta.overlay ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-3 pb-3 pt-10">
            <p className="text-xs font-bold uppercase tracking-wide text-white">{meta.overlay}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-[15px] font-black text-slate-950">{item.displayName}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{reportLabel}</p>
        </div>

        <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-slate-500">
          {clampText(item.displayDescription)}
        </p>

        <div className="space-y-1.5 text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-slate-400" />
            <span className="line-clamp-1">{item.displayLocation}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0 text-slate-400" />
            <span>{formatReportDate(item.reportedAt)}</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/50 pt-3">
          <span className="rounded-full border border-slate-200/80 bg-white/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
            {item.displayCategory}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDetails?.(item);
              }}
              className="rounded-xl bg-[#1A56DB] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-[#1E40AF]"
            >
              Details
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                aria-label={`Delete ${item.displayName}`}
              >
                <Trash2 size={15} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyItemsClient() {
  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();
  const { data, error, refresh, patchData } = useBackgroundFetch('admin:items', fetchAllInventoryItems, {
    fallback: [],
  });
  const allItems = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const items = useMemo(() => allItems.filter((item) => isAdminCreatedItem(item, session)), [allItems, session]);
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [actionError, setActionError] = useState('');

  const categories = useMemo(() => ['all', ...categoriesForFilter(items)], [items]);
  const tabCounts = useMemo(() => {
    return items.reduce(
      (counts, item) => {
        const meta = getInventoryCardMeta(item);
        return {
          all: counts.all + 1,
          secure: counts.secure + (meta.filterStatus === 'secure' ? 1 : 0),
          lost:
            counts.lost +
            (meta.filterStatus === 'lost' || meta.filterStatus === 'found' ? 1 : 0),
        };
      },
      { all: 0, secure: 0, lost: 0 }
    );
  }, [items]);

  const filtered = useMemo(
    () => sortInventoryItems(filterInventoryItems(items, { status, category, search }), 'newest'),
    [items, status, category, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const withPhotos = items.filter((item) => item.imageUrl).length;

  const sparklines = useMemo(() => buildMyItemsPageSparklines(items), [items]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
    setSparkPlayKey((k) => k + 1);
  }, [refresh]);

  const removeItemFromCaches = useCallback(
    (item) => {
      patchData((current) =>
        Array.isArray(current)
          ? current.filter((row) => !(row.id === item.id && row.itemType === item.itemType))
          : []
      );

      const inventory = getAdminCacheData('admin:items');
      if (Array.isArray(inventory)) {
        setAdminCache(
          'admin:items',
          inventory.filter((row) => !(row.id === item.id && row.itemType === item.itemType))
        );
      }

      const drafts = getAdminCacheData('admin:drafts');
      if (Array.isArray(drafts)) {
        setAdminCache(
          'admin:drafts',
          drafts.filter((row) => !(row.id === item.id && row.itemType === item.itemType))
        );
      }

      invalidateAdminCaches('admin:dashboard', 'admin:reports');
    },
    [patchData]
  );

  const confirmDeleteItem = useCallback(async () => {
    if (!deleteConfirmItem?.id) return;

    setDeletingItem(true);
    setActionError('');
    try {
      await deleteInventoryItem(deleteConfirmItem, {
        deletedBy: session?.email || session?.userName || null,
      });
      removeItemFromCaches(deleteConfirmItem);
      if (selected?.id === deleteConfirmItem.id && selected?.itemType === deleteConfirmItem.itemType) {
        setSelected(null);
      }
      setDeleteConfirmItem(null);
    } catch (deleteError) {
      setActionError(deleteError?.message || 'Could not delete this item.');
      setDeleteConfirmItem(null);
    } finally {
      setDeletingItem(false);
    }
  }, [deleteConfirmItem, removeItemFromCaches, selected, session]);

  const requestDeleteItem = useCallback((item) => {
    setDeleteConfirmItem(item);
  }, []);

  useEffect(() => {
    setActions(
      <>
        <Link
          href="/admin/lost"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/55 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Report Lost</span>
        </Link>
        <Link
          href="/admin/secure-found"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Secure Lost</span>
        </Link>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB]"
          aria-label="Refresh my items"
        >
          <RefreshCw size={13} />
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh]);

  return (
    <div className="space-y-4">
      {error && items.length === 0 ? (
        <div className="glass-card rounded-[24px] border-red-200/60 bg-red-50/40 p-6 text-center">
          <p className="font-semibold text-red-700">{error}</p>
          <button type="button" onClick={refresh} className="mt-3 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white">
            Try again
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div className="glass-card flex items-center justify-between gap-3 rounded-[20px] border-red-200/60 bg-red-50/50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="package"
          value={items.length}
          label="My Admin Items"
          trendLabel={`${tabCounts.lost} lost · ${tabCounts.secure} secure`}
          subLabel="Posted by you"
          sparkData={sparklines.total}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="shield"
          value={tabCounts.secure}
          label="Secure"
          trendLabel="High-value holds"
          sparkData={sparklines.found}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="alert"
          value={tabCounts.lost}
          label="Lost Posted"
          trendLabel="Campus lost reports"
          sparkData={sparklines.lost}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          icon="users"
          value={withPhotos}
          label="With Photo"
          trendLabel={`${items.length ? Math.round((withPhotos / items.length) * 100) : 0}% with image`}
          subLabel="Visual evidence attached"
          sparkData={sparklines.withPhoto}
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-[24px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={`shrink-0 rounded-[18px] px-4 py-2.5 text-sm font-black transition sm:px-5 ${
                status === tab.id
                  ? 'glass-tab-active text-slate-900'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
              }`}
            >
              {tab.label} ({tabCounts[tab.id]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="relative min-w-[280px] flex-1 xl:w-[520px]">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search my admin items..."
              className="glass-input h-12 w-full rounded-[24px] pl-11 pr-4 text-base text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
            />
          </label>
          <label className="relative min-w-[220px]">
            <Filter size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="glass-input h-12 w-full appearance-none rounded-[24px] pl-11 pr-10 text-base font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
            >
              {categories.map((current) => (
                <option key={current} value={current}>
                  {current === 'all' ? 'All Categories' : current}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
          </label>
          <button
            type="button"
            onClick={refresh}
            className="glass-button flex h-12 w-12 shrink-0 items-center justify-center rounded-[24px] text-slate-500 transition hover:text-[#1A56DB]"
            aria-label="Refresh my items"
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="glass-card flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
            <Package size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900">No admin items yet</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Items posted by this admin account from Report Lost or Secure Lost will appear here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/admin/lost" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-white">
              Report Lost
            </Link>
            <Link href="/admin/secure-found" className="rounded-2xl bg-[#1A56DB] px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF]">
              Secure Lost
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pageItems.map((item) => (
            <ItemCard
              key={`${item.itemType}-${item.id}`}
              item={item}
              onDetails={setSelected}
              onDelete={isSuperAdmin ? setDeleteConfirmItem : undefined}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-5 py-3">
          <p className="text-sm text-slate-500">
            Showing <span className="font-black text-slate-800">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-black text-slate-800">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="font-black text-slate-800">{filtered.length}</span> admin items
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="glass-button flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-black ${
                  page === number
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25'
                    : 'glass-button text-slate-600 hover:bg-white/70'
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="glass-button flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onDelete={isSuperAdmin ? requestDeleteItem : undefined}
      />
      {isSuperAdmin ? (
        <DeleteItemConfirmModal
          item={deleteConfirmItem}
          loading={deletingItem}
          onCancel={() => setDeleteConfirmItem(null)}
          onConfirm={confirmDeleteItem}
        />
      ) : null}
    </div>
  );
}
