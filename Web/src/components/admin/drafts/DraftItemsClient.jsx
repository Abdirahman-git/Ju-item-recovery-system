'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import StatCard from '@/components/admin/StatCard';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { getAdminCacheData, setAdminCache, invalidateAdminCaches } from '@/lib/adminDataCache';
import { deleteDraftInventoryItem, fetchDraftInventoryItems } from '@/lib/supabase';
import { buildDraftsPageSparklines } from '@/lib/pageSparklines';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { isSecureListing } from '@/lib/itemStatus';
import { getItemReporterDisplay } from '@/lib/inventory';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';

const TABS = [
  { id: 'all', label: 'All Drafts' },
  { id: 'lost', label: 'Lost Drafts' },
  { id: 'secure', label: 'Secure Drafts' },
];

function isSecureDraft(draft) {
  return draft?.itemType === 'found' && isSecureListing(draft);
}

function isPublicFoundDraft(draft) {
  return draft?.itemType === 'found' && !isSecureListing(draft);
}

function formatReportDate(value) {
  if (!value) return 'Date not added';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'Date not added';
  }
}

function clampText(text, max = 110) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;
}

function getDraftReportDate(draft) {
  const value =
    draft.reportedAt ||
    (draft.itemType === 'found'
      ? draft.dateFound || draft.date_found
      : draft.dateLost || draft.date_lost);
  return formatReportDate(value);
}

function getDraftDescription(draft) {
  const raw = String(
    draft.public_notice ||
      draft.publicNotice ||
      draft.displayDescription ||
      draft.description ||
      draft.notes ||
      draft.details ||
      ''
  ).trim();
  if (raw) return clampText(raw);
  return 'No description added yet.';
}

function DraftImage({ draft }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [draft.imageUrl, draft.id]);

  if (isSecureDraft(draft)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600">
        <span className="text-6xl font-black leading-none">!</span>
      </div>
    );
  }

  if (!draft.imageUrl || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-50 via-white/60 to-blue-50 text-violet-400">
        <Package size={42} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <SafeRemoteImage
      src={draft.imageUrl}
      alt={draft.displayName || 'Draft item photo'}
      fill
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
      sizes="(max-width:768px) 100vw, 33vw"
      onError={() => setFailed(true)}
    />
  );
}

function DeleteDraftModal({ draft, deleting, onCancel, onConfirm }) {
  if (!draft) return null;

  const kind = isSecureDraft(draft) ? 'Secure Lost draft' : 'Lost draft';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Delete draft?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {draft.displayName || 'This draft'} will be permanently removed from the database.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
            Delete draft
          </button>
        </div>
        <p className="mt-3 text-xs font-medium text-slate-400">
          {kind} · {draft.inventoryRef || `#DRAFT-${draft.id}`}
        </p>
      </div>
    </div>
  );
}

function DraftCard({ draft, onDelete }) {
  const isFound = draft.itemType === 'found';
  const secure = isSecureDraft(draft);
  const badgeClass = secure
    ? 'bg-amber-600/95 text-white'
    : isFound
      ? 'bg-emerald-600/95 text-white'
      : 'bg-red-600/95 text-white';
  const label = secure ? 'Lost Draft' : 'Lost Draft';
  const href = secure
    ? `/admin/secure-found?draft=${draft.id}`
    : isFound
      ? `/admin/found?draft=${draft.id}`
      : `/admin/lost?draft=${draft.id}`;

  return (
    <article className="group relative glass-card overflow-hidden rounded-[24px] !p-0 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <Link
        href={href}
        className="absolute inset-0 z-[1] rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB]/50"
        aria-label={`Continue ${draft.displayName || 'draft'}`}
      />
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <DraftImage draft={draft} />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-lg backdrop-blur-sm ${badgeClass}`}>
          {label}
        </span>
        <span
          className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg ${
            secure ? 'bg-amber-700/95' : 'bg-violet-600/95'
          }`}
        >
          {secure ? 'Secure' : 'Draft'}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {draft.inventoryRef || `#DRAFT-${String(draft.id).padStart(4, '0')}`}
          </p>
          <h3 className="line-clamp-1 text-[15px] font-black text-slate-950">{draft.displayName || 'Untitled draft'}</h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-slate-500">
            {getDraftDescription(draft)}
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500">
          {(() => {
            const reporter = getItemReporterDisplay(draft);
            return (
              <>
                <p className="flex items-center gap-1.5">
                  <UserRound size={13} className="shrink-0 text-slate-400" />
                  <span className="line-clamp-1 font-semibold text-slate-700">{reporter.name}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">ID</span>
                  <span className="line-clamp-1 font-bold tabular-nums text-slate-700">{reporter.studentId}</span>
                </p>
              </>
            );
          })()}
          <p className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-slate-400" />
            <span className="line-clamp-1">{draft.displayLocation || 'Location not added'}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0 text-slate-400" />
            <span>{getDraftReportDate(draft)}</span>
          </p>
        </div>

        <div className="relative z-[2] flex items-center justify-between gap-2 border-t border-white/50 pt-3">
          <span className="rounded-full border border-slate-200/80 bg-white/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
            {draft.displayCategory || 'General'}
          </span>
          <div className="flex items-center gap-2">
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(draft)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                aria-label={`Delete ${label}`}
              >
                <Trash2 size={15} />
              </button>
            ) : null}
            <Link
              href={href}
              className="rounded-xl bg-[#1A56DB] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-[#1E40AF]"
            >
              Continue
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DraftItemsClient() {
  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();
  const { data, error, refresh, patchData } = useBackgroundFetch('admin:drafts', fetchDraftInventoryItems, {
    fallback: [],
  });
  const drafts = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const counts = useMemo(
    () => ({
      all: drafts.length,
      lost: drafts.filter((draft) => draft.itemType === 'lost' || isPublicFoundDraft(draft)).length,
      secure: drafts.filter(isSecureDraft).length,
    }),
    [drafts]
  );

  const sparklines = useMemo(() => buildDraftsPageSparklines(drafts), [drafts]);

  const handleRefresh = useCallback(() => {
    refresh();
    setSparkPlayKey((k) => k + 1);
  }, [refresh]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setActions(
      <>
        <Link
          href="/admin/lost"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Lost Draft</span>
        </Link>
        <Link
          href="/admin/secure-found"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Secure Lost</span>
        </Link>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB]"
          aria-label="Refresh drafts"
        >
          <RefreshCw size={13} />
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh]);

  const tabDrafts = useMemo(() => {
    if (activeTab === 'lost') {
      return drafts.filter((draft) => draft.itemType === 'lost' || isPublicFoundDraft(draft));
    }
    if (activeTab === 'secure') return drafts.filter(isSecureDraft);
    return drafts;
  }, [drafts, activeTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabDrafts;
    return tabDrafts.filter((draft) => {
      const reporter = getItemReporterDisplay(draft);
      return [
        draft.displayName,
        draft.displayCategory,
        draft.displayLocation,
        draft.description,
        draft.public_notice,
        draft.publicNotice,
        draft.inventoryRef,
        draft.itemType,
        reporter.name,
        reporter.studentId,
        isSecureDraft(draft) ? 'secure' : '',
      ].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [tabDrafts, search]);

  const syncInventoryCache = useCallback((draft) => {
    const allItems = getAdminCacheData('admin:items');
    if (Array.isArray(allItems)) {
      setAdminCache(
        'admin:items',
        allItems.filter((item) => !(item.id === draft.id && item.itemType === draft.itemType))
      );
    }
    invalidateAdminCaches('admin:dashboard', 'admin:reports');
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    setActionError('');
    try {
      await deleteDraftInventoryItem(pendingDelete);
      patchData((current) =>
        Array.isArray(current)
          ? current.filter((item) => item.id !== pendingDelete.id || item.itemType !== pendingDelete.itemType)
          : []
      );
      syncInventoryCache(pendingDelete);
      setPendingDelete(null);
      setSparkPlayKey((k) => k + 1);
    } catch (deleteError) {
      setActionError(deleteError?.message || 'Could not delete this draft.');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, patchData, syncInventoryCache]);

  if (error && drafts.length === 0) {
    return (
      <div className="glass-card rounded-[24px] border-red-200/60 bg-red-50/40 p-6 text-center">
        <p className="font-semibold text-red-700">{error}</p>
        <button type="button" onClick={refresh} className="mt-3 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="package"
          value={counts.all}
          label="Total Drafts"
          trendLabel={`${counts.lost} lost · ${counts.secure} secure`}
          subLabel="Unpublished reports"
          sparkData={sparklines.total}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="alert"
          value={counts.lost}
          label="Lost Drafts"
          trendLabel="Lost drafts"
          subLabel="Incomplete reports"
          sparkData={sparklines.lost}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="laptop"
          value={counts.secure}
          label="Secure Drafts"
          trendLabel="Secure holds"
          subLabel="High-value drafts"
          sparkData={sparklines.secure}
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex w-fit max-w-full rounded-[24px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[18px] px-4 py-2.5 text-sm font-black transition sm:px-5 ${
                  active ? 'bg-white text-[#1A56DB] shadow-sm' : 'text-slate-700 hover:bg-white/50'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs font-bold text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>

        <label className="relative min-w-[280px] flex-1 xl:max-w-[520px]">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by item, reporter name, or ID..."
            className="glass-input h-12 w-full rounded-[24px] pl-11 pr-4 text-base text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
          />
        </label>
      </div>

      {actionError ? (
        <div className="glass-card flex items-center justify-between gap-3 rounded-[20px] border-red-200/60 bg-red-50/50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="glass-card flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <FileText size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {search.trim() ? 'No matching drafts' : 'No draft items found'}
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {search.trim()
              ? 'Try another search term or switch tabs.'
              : 'Drafts from Report Lost or Secure Lost appear here before publish.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((draft) => (
            <DraftCard
              key={`${draft.itemType}-${draft.id}`}
              draft={draft}
              onDelete={isSuperAdmin ? setPendingDelete : undefined}
            />
          ))}
        </div>
      )}

      {isSuperAdmin ? (
        <DeleteDraftModal
          draft={pendingDelete}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setPendingDelete(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
