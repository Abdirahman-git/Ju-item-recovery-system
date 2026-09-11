'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import {
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Key,
  Wallet,
  Smartphone,
  Briefcase,
  Package,
  Eye,
  Search,
  XCircle,
} from 'lucide-react';
import {
  fetchPendingReports,
  approvePendingReport,
  rejectPendingReport,
} from '@/lib/supabase';
import { buildPendingPageSparklines } from '@/lib/pageSparklines';
import ReviewModal from './ReviewModal';
import OwnershipChallengeEditor from '@/components/admin/OwnershipChallengeEditor';
import ValidationTrendsPanel from './ValidationTrendsPanel';
import StatCard from '@/components/admin/StatCard';
import { categoriesForFilter, isHighValueCategory } from '@/lib/categories';
import { getItemReporterDisplay } from '@/lib/inventory';
import { invalidateAdminCaches } from '@/lib/adminDataCache';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';

const PAGE_SIZE = 5;

const CATEGORY_COLORS = {
  Electronics: 'bg-blue-50 text-blue-700 ring-blue-100',
  Personal: 'bg-violet-50 text-violet-700 ring-violet-100',
  Financial: 'bg-amber-50 text-amber-700 ring-amber-100',
  Accessories: 'bg-pink-50 text-pink-700 ring-pink-100',
  default: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const ROW_ICONS = [Laptop, Key, Wallet, Smartphone, Briefcase];
const NAME_PREVIEW_LIMIT = 15;
const DESCRIPTION_PREVIEW_LIMIT = 86;
const CONTACT_PREVIEW_LIMIT = 30;

function clampText(value, limit) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function formatDate(value) {
  if (!value) return 'Recently submitted';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'Recently submitted';
  }
}

function ReportTypeBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-red-200/60 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold capitalize text-red-700 backdrop-blur-sm">
      Lost
    </span>
  );
}

function SweetConfirm({ report, processing, onCancel, onConfirm }) {
  if (!report) return null;
  const itemName = clampText(report.displayName, 36) || 'this report';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 ring-1 ring-red-200/60 backdrop-blur-sm">
            <XCircle size={28} />
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-950">Reject pending report?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Reject &quot;{itemName}&quot; from Pending Reports. This removes it from the moderation queue.
          </p>
        </div>

        <div className="mt-5 flex gap-3 border-t border-white/50 bg-white/30 px-6 py-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="glass-button flex-1 rounded-xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white/70 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/25 hover:bg-red-700 disabled:opacity-60"
          >
            {processing ? 'Working...' : 'Reject report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingReportsClient() {
  const [sparkPlayKey, setSparkPlayKey] = useState(0);
  const { bumpBadge, setBadgeCounts } = useAdminBadges();

  const { data, refresh, patchData } = useBackgroundFetch('admin:pending', async () => {
    const { combined } = await fetchPendingReports();
    return combined;
  }, { fallback: [] });

  const reports = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setBadgeCounts?.((prev) => ({ ...(prev || { pending: 0, claims: 0 }), pending: reports.length }));
  }, [reports.length, setBadgeCounts]);

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [challengeItem, setChallengeItem] = useState(null);
  const challengeItemRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [approveError, setApproveError] = useState('');

  useEffect(() => {
    challengeItemRef.current = challengeItem;
  }, [challengeItem]);

  const categories = useMemo(
    () => ['all', ...categoriesForFilter(reports)],
    [reports]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((item) => {
      const matchCat = category === 'all' || item.displayCategory === category;
      const reporter = getItemReporterDisplay(item);
      const matchSearch =
        !q ||
        item.displayName?.toLowerCase().includes(q) ||
        item.refId?.toLowerCase().includes(q) ||
        String(item.id || '').toLowerCase().includes(q) ||
        reporter.name.toLowerCase().includes(q) ||
        reporter.studentId.toLowerCase().includes(q) ||
        String(item.reporterEmail || item.email || '').toLowerCase().includes(q) ||
        item.displayCategory?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [reports, category, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const highValueCount = reports.filter((r) => isHighValueCategory(r.displayCategory)).length;

  const sparklines = useMemo(() => buildPendingPageSparklines(reports), [reports]);

  const handleRefresh = () => {
    refresh();
    setSparkPlayKey((k) => k + 1);
  };

  /** Step 1: close review → open Ownership Challenge page. */
  const handleApprove = () => {
    if (!selected) return;
    setApproveError('');
    const next = {
      ...selected,
      itemType: selected.reportType === 'found' ? 'found' : 'lost',
      reportType: selected.reportType === 'found' ? 'found' : selected.reportType || 'lost',
      displayName: selected.displayName || selected.itemName || 'Item',
    };
    challengeItemRef.current = next;
    setChallengeItem(next);
    setSelected(null);
  };

  /** Step 2: after challenge saved → publish item. */
  const finishApproveAfterChallenge = async () => {
    const item = challengeItemRef.current;
    if (!item?.id) {
      throw new Error('Pending report was lost — reopen Review and try again.');
    }
    setProcessing(true);
    setApproveError('');
    try {
      await approvePendingReport(item.reportType, item.id);
      invalidateAdminCaches('admin:items', 'admin:dashboard', 'admin:reports', 'admin:pending');
      bumpBadge('pending', -1);
      patchData((prev) =>
        prev.filter((r) => !(r.id === item.id && r.reportType === item.reportType))
      );
      setChallengeItem(null);
    } catch (err) {
      const message =
        err?.message ||
        'Challenge saved, but publish failed. Open the item again or check All Items.';
      setApproveError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const report = rejectConfirm || selected;
    if (!report) return;
    setProcessing(true);
    try {
      await rejectPendingReport(report.reportType, report.id);
      invalidateAdminCaches('admin:items', 'admin:dashboard', 'admin:reports', 'admin:pending', 'admin:drafts');
      bumpBadge('pending', -1);
      patchData((prev) => prev.filter((r) => !(r.id === report.id && r.reportType === report.reportType)));
      setRejectConfirm(null);
      setSelected(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="relative min-w-[220px] flex-1 lg:max-w-md lg:flex-none lg:min-w-[320px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search item, reporter, or ID..."
            className="glass-input h-10 w-full rounded-[18px] pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
          />
        </label>
        <div className="relative">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="glass-input h-10 appearance-none rounded-[18px] pl-8 pr-8 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="glass-button flex h-10 w-10 items-center justify-center rounded-[18px] text-slate-500 transition hover:text-[#1A56DB]"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* KPI row */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="alert"
          label="Awaiting Verification"
          value={reports.length}
          urgent={reports.length > 0}
          trendLabel={reports.length > 0 ? 'Active queue' : 'All clear'}
          subLabel="Pending user verification"
          sparkData={sparklines.queue}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="laptop"
          label="High Value Items"
          value={highValueCount}
          trendLabel="Requires review"
          subLabel="Electronics & financial"
          sparkData={sparklines.highValue}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="clock"
          label="Avg. Resolution Time"
          value="4.2h"
          trendLabel="Within SLA"
          subLabel="Optimal range"
          sparkData={sparklines.resolution}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          icon="check"
          label="System Integrity"
          value="99%"
          trendLabel="All systems healthy"
          subLabel="Last checked: now"
          sparkData={sparklines.integrity}
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/50 bg-white/30 text-[12px] font-black uppercase tracking-wider text-slate-600 backdrop-blur-sm">
                <th className="px-5 py-4">Item</th>
                <th className="px-4 py-4">Report</th>
                <th className="px-4 py-4">Submitted By</th>
                <th className="px-4 py-4">Lost / Found date</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <p className="font-semibold text-slate-700">All clear!</p>
                    <p className="mt-1 text-sm text-slate-400">No pending reports match your filters.</p>
                  </td>
                </tr>
              ) : (
                pageItems.map((item, idx) => {
                  const Icon = ROW_ICONS[idx % ROW_ICONS.length] || Package;
                  const catClass = CATEGORY_COLORS[item.displayCategory] || CATEGORY_COLORS.default;
                  const reporter = getItemReporterDisplay(item);
                  return (
                    <tr
                      key={`${item.reportType}-${item.id}`}
                      onClick={() => setSelected(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(item);
                        }
                      }}
                      tabIndex={0}
                      className="glass-row-hover cursor-pointer border-b border-white/40 transition focus-visible:bg-blue-50/40 focus-visible:outline-none"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[16px] border border-white/70 bg-white/45 backdrop-blur-sm">
                            {item.imageUrl ? (
                              <SafeRemoteImage src={item.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Icon size={18} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <p className="max-w-full truncate font-bold text-slate-900" title={item.displayName}>
                                {clampText(item.displayName, NAME_PREVIEW_LIMIT)}
                              </p>
                            </div>
                            <p className="mt-1 max-w-[520px] truncate text-xs text-slate-400" title={item.description || ''}>
                              {clampText(item.description, DESCRIPTION_PREVIEW_LIMIT) || 'No description added'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <ReportTypeBadge />
                          <span className={`glass-badge inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${catClass}`}>
                            {item.displayCategory}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="truncate font-bold text-slate-800" title={reporter.name}>
                          {clampText(reporter.name, CONTACT_PREVIEW_LIMIT)}
                        </p>
                        <p className="truncate text-xs font-semibold tabular-nums text-slate-600" title={reporter.studentId}>
                          ID: {reporter.studentId}
                        </p>
                        <p className="truncate text-xs text-slate-400" title={item.reporterEmail || item.phone || ''}>
                          {clampText(item.reporterEmail || item.phone, CONTACT_PREVIEW_LIMIT) || 'Contact in review'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold leading-5 text-slate-700">{formatDate(item.reportedAt)}</p>
                        {item.submittedAt && String(item.submittedAt) !== String(item.reportedAt) ? (
                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            Submitted {formatDate(item.submittedAt)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">Waiting for admin review</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(item);
                          }}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 text-xs font-bold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 active:scale-95"
                        >
                          <Eye size={14} />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/50 bg-white/25 px-5 py-3 backdrop-blur-sm">
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-black text-slate-800">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</span>{' '}
            to <span className="font-black text-slate-800">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="font-black text-slate-800">{filtered.length}</span> reports
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-semibold ${
                  page === n
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25'
                    : 'glass-button text-slate-600 hover:bg-white/70'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <ValidationTrendsPanel reports={reports} />

      <ReviewModal
        item={selected}
        onClose={() => {
          setSelected(null);
          setApproveError('');
        }}
        onApprove={handleApprove}
        onReject={() => setRejectConfirm(selected)}
        processing={processing}
      />
      <OwnershipChallengeEditor
        item={challengeItem}
        open={Boolean(challengeItem)}
        onClose={() => {
          if (!processing) {
            setChallengeItem(null);
            setApproveError('');
          }
        }}
        onSaved={finishApproveAfterChallenge}
        saveLabel="Save & publish"
        subtitle="Required to approve this pending report. Item goes live after you save."
      />
      {approveError ? (
        <div className="fixed bottom-6 left-1/2 z-[100] w-[min(92vw,480px)] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">
          {approveError}
        </div>
      ) : null}
      <SweetConfirm
        report={rejectConfirm}
        processing={processing}
        onCancel={() => setRejectConfirm(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
