'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Heart,
  Info,
  Loader2,
  MapPin,
  MoreVertical,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldQuestion,
  Trash2,
  X,
} from 'lucide-react';
import {
  archiveInventoryItem,
  deleteInventoryItem,
  fetchAllInventoryItems,
  markInventoryItemReturned,
  markSecureFoundReturned,
} from '@/lib/supabase';
import { getAdminCacheData, setAdminCache, invalidateAdminCaches } from '@/lib/adminDataCache';
import { categoriesForFilter } from '@/lib/categories';
import { canMarkInventoryItemReturned, filterInventoryItems, getInventoryCardMeta, sortInventoryItems } from '@/lib/inventory';
import { isSecureFoundItem, ITEM_STATUS, normalizeItemStatus } from '@/lib/itemStatus';
import OwnershipChallengeEditor from '@/components/admin/OwnershipChallengeEditor';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';

const PAGE_SIZE = 8;
const STALE_DAYS = 60;

const STATUS_TABS = [
  { id: 'all', label: 'All Items' },
  { id: 'draft', label: 'Draft' },
  { id: 'secure', label: 'Secure' },
  { id: 'lost', label: 'Lost' },
  { id: 'stale', label: 'Stale 60d+', superAdminOnly: true },
];

function getItemAgeDays(item) {
  const raw = item?.reportedAt || item?.created_at || item?.dateLost || item?.dateFound || item?.date_lost || item?.date_found;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function isStaleItem(item) {
  const age = getItemAgeDays(item);
  if (age == null) return false;
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.DRAFT) return false;
  return age >= STALE_DAYS;
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

function isSecureHoldItem(item) {
  return isSecureFoundItem(item) && normalizeItemStatus(item) === ITEM_STATUS.LIVE;
}

function SecureHoldMark({ large = false }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ${
        large ? 'min-h-[280px]' : ''
      }`}
    >
      <span className={`font-black leading-none ${large ? 'text-[120px]' : 'text-6xl'}`}>!</span>
    </div>
  );
}

function ItemImage({ item }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl, item.id]);

  // Secure drafts + live holds always use the amber ! mark (never a photo/box placeholder).
  if (isSecureFoundItem(item)) {
    return <SecureHoldMark />;
  }

  if (!item.imageUrl || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
        <Package size={42} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <SafeRemoteImage
      src={item.imageUrl}
      alt={item.displayName}
      fill
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
      sizes="(max-width:768px) 100vw, 33vw"
      onError={() => setFailed(true)}
    />
  );
}

function CardMoreMenu({ item, showReturn, onArchive, onDelete, onMarkReturned }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasMenu = Boolean(showReturn || onArchive || onDelete);
  if (!hasMenu) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          open
            ? 'border-[#1A56DB]/30 bg-[#1A56DB]/10 text-[#1A56DB]'
            : 'border-slate-200/80 bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900'
        }`}
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-30 mb-2 w-48 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 py-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          onClick={(event) => event.stopPropagation()}
        >
          {showReturn ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onMarkReturned?.(item);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              <PackageCheck size={16} />
              Return item
            </button>
          ) : null}
          {onArchive ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onArchive(item);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-bold text-amber-800 transition hover:bg-amber-50"
            >
              <Archive size={16} />
              Archive item
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete(item);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete item
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({ item, onDetails, onDelete, onMarkReturned, onArchive }) {
  const router = useRouter();
  const meta = getInventoryCardMeta(item);
  const action = meta.action;
  const showReturn = canMarkInventoryItemReturned(item);
  const stale = isStaleItem(item);

  const actionClass =
    action.variant === 'primary'
      ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25 hover:bg-[#1E40AF]'
      : action.variant === 'success'
        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : 'border border-blue-100 bg-blue-50/70 text-[#1A56DB] hover:bg-blue-50';

  const openCard = () => {
    // Draft cards continue in the report editor; everything else opens details here.
    if (meta.filterStatus === 'draft' && action.href) {
      router.push(action.href);
      return;
    }
    onDetails?.(item);
  };

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
        {stale ? (
          <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
            {getItemAgeDays(item)}d old
          </span>
        ) : null}
        {meta.overlay ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-3 pb-3 pt-10">
            <p className="text-xs font-bold uppercase tracking-wide text-white">{meta.overlay}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-black text-slate-950">{item.displayName}</h3>
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

        <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/50 pt-3">
          <span className="min-w-0 max-w-[45%] truncate rounded-full border border-slate-200/80 bg-white/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
            {item.displayCategory}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {action.href ? (
              <Link
                href={action.href}
                onClick={(event) => event.stopPropagation()}
                className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${actionClass}`}
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDetails(item);
                }}
                className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${actionClass}`}
              >
                {action.label}
              </button>
            )}
            <CardMoreMenu
              item={item}
              showReturn={showReturn}
              onArchive={onArchive}
              onDelete={onDelete}
              onMarkReturned={onMarkReturned}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function ItemDetailModal({
  item,
  onClose,
  onMarkReturned,
  markingReturned,
  onDelete,
  onArchive,
  onSetChallenge,
}) {
  if (!item) return null;
  const meta = getInventoryCardMeta(item);
  const isSecure = isSecureFoundItem(item);
  const showReturn = canMarkInventoryItemReturned(item);
  const stale = isStaleItem(item);
  const statusRaw = String(item.status || '').toLowerCase();
  const normalized = normalizeItemStatus(item);
  // Only after admin approves (live). Pending Reports must be reviewed first.
  const canSetChallenge =
    normalized === ITEM_STATUS.LIVE &&
    meta.filterStatus !== 'draft' &&
    meta.filterStatus !== 'returned' &&
    statusRaw !== 'returned' &&
    statusRaw !== 'claim_pending' &&
    statusRaw !== 'awaiting_pickup' &&
    statusRaw !== 'matched';
  const statusDisplay =
    normalized === ITEM_STATUS.PENDING_REVIEW
      ? 'pending_review'
      : meta.badge.label;
  const typeLabel = isSecure
    ? normalized === ITEM_STATUS.DRAFT
      ? 'Secure draft'
      : 'Lost (secure hold)'
    : 'Lost report';
  const publicNotice = item.public_notice || item.publicNotice || item.displayDescription;
  const details = [
    { label: 'Category', value: item.displayCategory },
    { label: 'Type', value: typeLabel },
    { label: 'Location', value: item.displayLocation },
    { label: 'Reported', value: formatReportDate(item.reportedAt) },
    { label: 'Status', value: statusDisplay },
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
                <SecureHoldMark large />
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
                <p className="text-[13px] font-semibold leading-5 text-slate-600">{publicNotice}</p>
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

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/50 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="glass-button min-w-[100px] flex-1 rounded-2xl py-3 text-sm font-bold text-slate-600"
          >
            Close
          </button>
          {onArchive ? (
            <button
              type="button"
              onClick={() => onArchive(item)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
            >
              <Archive size={16} />
              {stale ? 'Archive (stale)' : 'Move to archive'}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              Delete
            </button>
          ) : null}
          {canSetChallenge ? (
            <button
              type="button"
              onClick={() => onSetChallenge?.(item)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-[#1E40AF]"
            >
              <ShieldQuestion size={16} />
              Set Ownership Challenge
            </button>
          ) : null}
          {showReturn ? (
            <button
              type="button"
              disabled={markingReturned}
              onClick={() => onMarkReturned?.(item)}
              className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
            >
              {markingReturned ? 'Saving...' : 'Mark returned'}
            </button>
          ) : meta.action.href ? (
            <Link
              href={meta.action.href}
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {meta.action.label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MarkReturnedConfirmModal({
  item,
  loading,
  onCancel,
  onConfirm,
  recipientName,
  onRecipientNameChange,
  recipientId,
  onRecipientIdChange,
}) {
  if (!item) return null;
  const isSecure = isSecureHoldItem(item);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner ring-4 ring-emerald-100/80">
          <PackageCheck size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">Mark as returned?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">&ldquo;{item.displayName}&rdquo;</span> will be removed from the
          student app and saved to returned items.
        </p>

        {!isSecure ? (
          <div className="mt-5 space-y-3 text-left">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                Recipient name *
              </span>
              <input
                value={recipientName}
                onChange={(event) => onRecipientNameChange?.(event.target.value)}
                placeholder="Student or staff receiving the item"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none ring-4 ring-slate-100 focus:border-emerald-300 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                Student ID
              </span>
              <input
                value={recipientId}
                onChange={(event) => onRecipientIdChange?.(event.target.value)}
                placeholder="e.g. JU2024001"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none ring-4 ring-slate-100 focus:border-emerald-300 focus:ring-emerald-100"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Yes, mark returned
          </button>
        </div>
      </div>
    </div>
  );
}

function ReturnResultModal({ state, onClose }) {
  if (!state) return null;
  const success = state.type === 'success';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {success ? <CheckCircle2 size={31} /> : <X size={31} />}
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">{state.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{state.message}</p>
        <button
          type="button"
          onClick={onClose}
          className={`mt-6 rounded-2xl px-6 py-3 text-sm font-black text-white ${
            success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1A56DB] hover:bg-[#1E40AF]'
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
}

function ArchiveItemConfirmModal({ item, loading, onCancel, onConfirm }) {
  if (!item) return null;
  const age = getItemAgeDays(item);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Archive size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Move to archive?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">&ldquo;{item.displayName}&rdquo;</span> will leave the student
          app feed and be saved under Archived Items
          {age != null ? ` (reported ~${age} days ago)` : ''}. You can restore it later from the archive.
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
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
            Yes, archive
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteItemConfirmModal({ item, loading, onCancel, onConfirm }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Delete item?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <span className="font-bold text-slate-800">{item.displayName}</span> will be permanently removed
          from the inventory and student app.
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
        <p className="mt-3 text-xs font-medium text-slate-400">
          {item.inventoryRef || `${item.itemType}-${item.id}`}
        </p>
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
        <h3 className="mt-5 text-2xl font-black text-slate-950">Export data?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {count.toLocaleString()} item{count === 1 ? '' : 's'} will be downloaded as a CSV file.
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

export default function AllItemsClient() {
  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();
  const { data, error, refresh, patchData } = useBackgroundFetch('admin:items', fetchAllInventoryItems, {
    fallback: [],
  });
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [returnConfirmItem, setReturnConfirmItem] = useState(null);
  const [returnRecipientName, setReturnRecipientName] = useState('');
  const [returnRecipientId, setReturnRecipientId] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [archiveConfirmItem, setArchiveConfirmItem] = useState(null);
  const [markingSecureReturned, setMarkingSecureReturned] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [archivingItem, setArchivingItem] = useState(false);
  const [returnResult, setReturnResult] = useState(null);
  const [challengeItem, setChallengeItem] = useState(null);

  const visibleTabs = useMemo(
    () => STATUS_TABS.filter((tab) => !tab.superAdminOnly || isSuperAdmin),
    [isSuperAdmin]
  );

  const categories = useMemo(() => ['all', ...categoriesForFilter(items)], [items]);
  const tabCounts = useMemo(() => {
    return items.reduce(
      (counts, item) => {
        const meta = getInventoryCardMeta(item);
        return {
          all: counts.all + 1,
          draft: counts.draft + (meta.filterStatus === 'draft' ? 1 : 0),
          secure: counts.secure + (meta.filterStatus === 'secure' ? 1 : 0),
          lost:
            counts.lost +
            (meta.filterStatus === 'lost' || meta.filterStatus === 'found' ? 1 : 0),
          stale: counts.stale + (isStaleItem(item) ? 1 : 0),
        };
      },
      { all: 0, draft: 0, secure: 0, lost: 0, stale: 0 }
    );
  }, [items]);

  const filtered = useMemo(() => {
    const base =
      status === 'stale'
        ? items.filter(isStaleItem)
        : filterInventoryItems(items, { status, category, search });
    const withSearch =
      status === 'stale' && (category !== 'all' || search.trim())
        ? filterInventoryItems(base, { status: 'all', category, search })
        : base;
    return sortInventoryItems(withSearch, sortBy);
  }, [items, status, category, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const requestDeleteItem = useCallback((item) => {
    if (!item?.id) return;
    setDeleteConfirmItem(item);
  }, []);

  const requestArchiveItem = useCallback((item) => {
    if (!item?.id || !isSuperAdmin) return;
    setArchiveConfirmItem(item);
  }, [isSuperAdmin]);

  const removeItemFromCaches = useCallback((item) => {
    patchData((current) =>
      Array.isArray(current)
        ? current.filter((row) => !(row.id === item.id && row.itemType === item.itemType))
        : []
    );

    const myItems = getAdminCacheData('admin:my-items');
    if (Array.isArray(myItems)) {
      setAdminCache(
        'admin:my-items',
        myItems.filter((row) => !(row.id === item.id && row.itemType === item.itemType))
      );
    }

    const drafts = getAdminCacheData('admin:drafts');
    if (Array.isArray(drafts)) {
      setAdminCache(
        'admin:drafts',
        drafts.filter((row) => !(row.id === item.id && row.itemType === item.itemType))
      );
    }

    invalidateAdminCaches('admin:dashboard', 'admin:reports', 'admin:returned', 'admin:archived');
  }, [patchData]);

  const confirmArchiveItem = useCallback(async () => {
    if (!archiveConfirmItem?.id) return;

    setArchivingItem(true);
    try {
      const age = getItemAgeDays(archiveConfirmItem);
      await archiveInventoryItem(archiveConfirmItem, {
        archivedBy: session?.email || session?.userName || 'super-admin',
        reason:
          age != null && age >= STALE_DAYS
            ? `Unclaimed / stale (${age} days)`
            : 'Archived by Super Admin',
      });
      removeItemFromCaches(archiveConfirmItem);
      if (
        selected?.id === archiveConfirmItem.id &&
        selected?.itemType === archiveConfirmItem.itemType
      ) {
        setSelected(null);
      }
      setArchiveConfirmItem(null);
      setReturnResult({
        type: 'success',
        title: 'Item archived',
        message: `"${archiveConfirmItem.displayName}" was removed from the student app. Open Archived Items in the sidebar to review or restore it.`,
      });
    } catch (err) {
      setArchiveConfirmItem(null);
      setReturnResult({
        type: 'error',
        title: 'Could not archive',
        message: err?.message || 'Archive failed. Please try again.',
      });
    } finally {
      setArchivingItem(false);
    }
  }, [archiveConfirmItem, removeItemFromCaches, selected, session]);

  const confirmDeleteItem = useCallback(async () => {
    if (!deleteConfirmItem?.id) return;

    setDeletingItem(true);
    try {
      await deleteInventoryItem(deleteConfirmItem, {
        deletedBy: session?.email || session?.userName || null,
      });
      removeItemFromCaches(deleteConfirmItem);
      if (selected?.id === deleteConfirmItem.id && selected?.itemType === deleteConfirmItem.itemType) {
        setSelected(null);
      }
      setDeleteConfirmItem(null);
      setReturnResult({
        type: 'success',
        title: 'Item deleted',
        message: `"${deleteConfirmItem.displayName}" was removed from the inventory.`,
      });
    } catch (err) {
      setDeleteConfirmItem(null);
      setReturnResult({
        type: 'error',
        title: 'Could not delete',
        message: err?.message || 'Delete failed. Please try again.',
      });
    } finally {
      setDeletingItem(false);
    }
  }, [deleteConfirmItem, removeItemFromCaches, selected, session]);

  const exportCsv = useCallback(() => {
    const header = ['Inventory ID', 'Name', 'Type', 'Category', 'Location', 'Status', 'Reported'];
    const rows = filtered.map((item) => {
      const meta = getInventoryCardMeta(item);
      return [
        item.inventoryRef,
        item.displayName,
        item.itemType,
        item.displayCategory,
        item.displayLocation,
        meta.badge.label,
        formatReportDate(item.reportedAt),
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ju-global-inventory.csv';
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

  const requestMarkReturned = useCallback((item) => {
    if (!item?.id) return;
    setReturnRecipientName('');
    setReturnRecipientId('');
    setReturnConfirmItem(item);
  }, []);

  const confirmMarkReturned = useCallback(async () => {
    if (!returnConfirmItem?.id) return;

    const isSecure = isSecureHoldItem(returnConfirmItem);
    if (!isSecure && !returnRecipientName.trim()) {
      setReturnResult({
        type: 'error',
        title: 'Recipient required',
        message: 'Enter the name of the person receiving this item before marking it returned.',
      });
      return;
    }

    setMarkingSecureReturned(true);
    try {
      if (isSecure) {
        await markSecureFoundReturned(returnConfirmItem.id);
      } else {
        await markInventoryItemReturned(
          returnConfirmItem,
          returnRecipientName.trim(),
          returnRecipientId.trim() || null
        );
      }
      removeItemFromCaches(returnConfirmItem);
      invalidateAdminCaches('admin:returned', 'admin:dashboard', 'admin:reports');
      setReturnConfirmItem(null);
      setReturnRecipientName('');
      setReturnRecipientId('');
      setSelected(null);
      await refresh();
      setReturnResult({
        type: 'success',
        title: 'Item returned',
        message: `"${returnConfirmItem.displayName}" was removed from the student app.`,
      });
    } catch (err) {
      setReturnConfirmItem(null);
      setReturnResult({
        type: 'error',
        title: 'Could not mark returned',
        message: err?.message || 'Return failed. Please try again.',
      });
    } finally {
      setMarkingSecureReturned(false);
    }
  }, [returnConfirmItem, returnRecipientName, returnRecipientId, refresh, removeItemFromCaches]);

  useEffect(() => {
    setActions(
      <>
        <Link
          href="/admin/lost"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Log New Entry</span>
        </Link>
        <button
          type="button"
          onClick={requestExport}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Export Data</span>
        </button>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB]"
          aria-label="Refresh inventory"
        >
          <RefreshCw size={13} />
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, refresh, requestExport]);

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

      {/* Filters — tabs row, then controls row (no overlap) */}
      <div className="space-y-3">
        <div className="w-full min-w-0 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-min rounded-[22px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatus(tab.id);
                  setPage(1);
                }}
                className={`shrink-0 rounded-[14px] px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  status === tab.id
                    ? 'glass-tab-active text-slate-900'
                    : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
                }`}
              >
                {tab.label} ({tabCounts[tab.id]})
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID, name, or location..."
              className="glass-input h-10 w-full rounded-[18px] pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[150px] flex-1 sm:flex-none sm:w-[170px]">
              <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="glass-input h-10 w-full appearance-none rounded-[18px] pl-9 pr-8 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </label>

            <label className="relative min-w-[140px] flex-1 sm:flex-none sm:w-[160px]">
              <ArrowUpDown size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                aria-label="Sort items"
                className="glass-input h-10 w-full appearance-none rounded-[18px] pl-9 pr-8 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </label>

            <button
              type="button"
              onClick={refresh}
              className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] text-slate-500 transition hover:text-[#1A56DB]"
              aria-label="Refresh inventory"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {pageItems.length === 0 ? (
        <div className="glass-card flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
            <Package size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900">No items found</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {items.length === 0
              ? 'Lost and found reports will appear here once submitted.'
              : 'Try changing your filters or search terms.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pageItems.map((item) => (
            <ItemCard
              key={`${item.itemType}-${item.id}`}
              item={item}
              onDetails={setSelected}
              onDelete={isSuperAdmin ? requestDeleteItem : undefined}
              onMarkReturned={requestMarkReturned}
              onArchive={isSuperAdmin ? requestArchiveItem : undefined}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 ? (
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-5 py-3">
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-bold text-slate-800">
              {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="font-bold text-slate-800">{filtered.length}</span> items
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
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
              onClick={() => setPage((p) => p + 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onMarkReturned={requestMarkReturned}
        markingReturned={markingSecureReturned}
        onDelete={isSuperAdmin ? requestDeleteItem : undefined}
        onArchive={isSuperAdmin ? requestArchiveItem : undefined}
        onSetChallenge={(item) => {
          setChallengeItem(item);
          setSelected(null);
        }}
      />
      <OwnershipChallengeEditor
        item={challengeItem}
        open={Boolean(challengeItem)}
        onClose={() => setChallengeItem(null)}
        onSaved={() => setChallengeItem(null)}
      />
      {archiveConfirmItem ? (
        <ArchiveItemConfirmModal
          item={archiveConfirmItem}
          loading={archivingItem}
          onCancel={() => setArchiveConfirmItem(null)}
          onConfirm={confirmArchiveItem}
        />
      ) : null}
      {deleteConfirmItem ? (
        <DeleteItemConfirmModal
          item={deleteConfirmItem}
          loading={deletingItem}
          onCancel={() => setDeleteConfirmItem(null)}
          onConfirm={confirmDeleteItem}
        />
      ) : null}
      {returnConfirmItem ? (
        <MarkReturnedConfirmModal
          item={returnConfirmItem}
          loading={markingSecureReturned}
          onCancel={() => setReturnConfirmItem(null)}
          onConfirm={confirmMarkReturned}
          recipientName={returnRecipientName}
          onRecipientNameChange={setReturnRecipientName}
          recipientId={returnRecipientId}
          onRecipientIdChange={setReturnRecipientId}
        />
      ) : null}
      <ReturnResultModal state={returnResult} onClose={() => setReturnResult(null)} />
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
