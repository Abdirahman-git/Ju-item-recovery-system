'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Trash2,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  UserRound,
  Package,
  X,
  XCircle,
} from 'lucide-react';
import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import ItemThumbnail from '@/components/admin/ItemThumbnail';
import { deleteItemClaim, fetchPendingItemClaims } from '@/lib/supabase';
import { confirmPhysicalClaim, restoreItemAfterFailedClaim, fetchOwnershipChallenge, releaseItemClaimReserve } from '@/lib/ownershipChallengeApi';
import { challengeResultLabel, buildChallengeAnswerReview } from '@/lib/ownershipChallenge';
import { resolveSystemCategories } from '@/lib/categories';
import { invalidateClaimCaches } from '@/lib/adminDataCache';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';

function claimMatchesFocusedItem(claim, itemId, itemType) {
  if (itemId == null || itemId === '') return false;
  const focusId = Number(itemId);
  if (!Number.isFinite(focusId)) return false;

  const claimIds = [
    claim?.itemId,
    claim?.item_id,
    claim?.found_item_id,
    claim?.lost_item_id,
    claim?.targetItem?.id,
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!claimIds.includes(focusId)) return false;

  if (!itemType) return true;
  const claimType = String(claim?.itemType || claim?.item_type || claim?.targetItem?.itemType || '').toLowerCase();
  return !claimType || claimType === String(itemType).toLowerCase();
}

const PAGE_SIZE = 4;

function formatRelativeTime(value) {
  if (!value) return 'Requested recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Requested recently';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Requested just now';
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `Requested ${diffMinutes}m ago`;
  const diffHours = Math.round(diffMs / 36e5);
  if (diffHours < 24) return `Requested ${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `Requested ${diffDays}d ago`;
}

function formatExactTime(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatReplyTime(hours) {
  if (hours === null) return null;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
  if (hours < 24) return `${hours.toFixed(1).replace(/\.0$/, '')} hours`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function SummaryStat({ label, value, tone = 'slate', hint }) {
  const toneClass = {
    slate: 'text-slate-900',
    blue: 'text-[#1A56DB]',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600',
  }[tone] || 'text-slate-900';

  const barClass = {
    slate: 'bg-slate-400',
    blue: 'bg-[#1A56DB]',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
  }[tone] || 'bg-slate-400';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/70 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${barClass} opacity-80`} />
      <p className={`text-[28px] font-black tracking-tight tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      {hint ? <p className="mt-1 text-[11px] font-medium text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ClaimsSummary({ summary }) {
  const total = Math.max(1, Number(summary.total) || 1);
  const bandPct = (n) => Math.round(((Number(n) || 0) / total) * 100);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#1A56DB]/12 bg-gradient-to-br from-[#EFF6FF] via-white to-slate-50 p-5 shadow-[0_20px_50px_rgba(26,86,219,0.08)] sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#1A56DB]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1A56DB]">Live pulse</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 text-balance">
            Challenge scoreboard
          </h3>
          <p className="mt-1 max-w-xl text-sm font-medium text-slate-500 text-pretty">
            Outcomes follow Ownership Challenge score bands.
          </p>
        </div>
        {summary.avgScore != null ? (
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Avg challenge</p>
              <p className="text-lg font-black tabular-nums text-slate-900">{summary.avgScore}%</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/70 bg-white/50 p-3 backdrop-blur-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Score bands</p>
          <p className="text-[11px] font-semibold text-slate-400">85%+ returned · 50–80% office · &lt;50% reject</p>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${bandPct(summary.autoPass)}%` }}
            title={`Pass ${summary.autoPass}`}
          />
          <div
            className="bg-indigo-500 transition-[width] duration-500"
            style={{ width: `${bandPct(summary.physical)}%` }}
            title={`Physical ${summary.physical}`}
          />
          <div
            className="bg-red-500 transition-[width] duration-500"
            style={{ width: `${bandPct(summary.scoreReject)}%` }}
            title={`Rejected ${summary.scoreReject}`}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Pass {summary.autoPass}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Office {summary.physical || 0}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Reject {summary.scoreReject}
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryStat label="Total" value={summary.total} tone="blue" />
        <SummaryStat label="Waiting" value={summary.waiting} tone="amber" hint="Open queue" />
        <SummaryStat label="Office" value={summary.physical || 0} tone="indigo" hint="50–80%" />
        <SummaryStat label="Pass" value={summary.approved} tone="emerald" hint="85%+" />
        <SummaryStat label="Reject" value={summary.rejected} tone="red" hint="&lt;60%" />
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3.5 shadow-sm backdrop-blur-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
            <Clock3 size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">Average reply time</p>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {summary.replyTime || 'Not enough completed requests yet'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3.5 shadow-sm backdrop-blur-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Package size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">Most claimed type</p>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {summary.topCategory || 'No category data yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncate(text, max = 86) {
  if (!text) return 'No proof statement provided.';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function statusClass(status) {
  if (status === 'Reviewing') return 'border-slate-200/60 bg-slate-500/10 text-slate-700';
  if (status === 'Physical') return 'border-indigo-200/60 bg-indigo-500/10 text-indigo-700';
  if (status === 'Approved') return 'border-emerald-200/60 bg-emerald-500/10 text-emerald-700';
  if (status === 'Rejected') return 'border-red-200/60 bg-red-500/10 text-red-700';
  return 'border-blue-200/60 bg-blue-500/10 text-[#0759B8]';
}

function ActionButton({ label, tone, icon: Icon, onClick, disabled }) {
  const tones = {
    approve: 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700',
    reject: 'glass-button text-red-600 hover:bg-red-50/80',
    physical: 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700',
    delete: 'glass-button text-slate-600 hover:text-red-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-[138px] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-45 ${tones[tone]}`}
    >
      <Icon size={14} strokeWidth={2.4} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function getClaimAnswerReview(claim) {
  const breakdown = getClaimBreakdown(claim);
  if (Array.isArray(breakdown.answer_review) && breakdown.answer_review.length) {
    return breakdown.answer_review;
  }
  return [];
}

function getClaimBreakdown(claim) {
  const raw = claim?.match_breakdown;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function resolveClaimProofImage(claim) {
  const item = claim?.targetItem;
  const breakdown = getClaimBreakdown(claim);
  return (
    item?.imageUrl ||
    item?.imageURI ||
    item?.imageuri ||
    item?.image_url ||
    breakdown.image_uri ||
    breakdown.imageURI ||
    claim?.image_uri ||
    claim?.imageURI ||
    null
  );
}

function resolveClaimDisplayName(claim) {
  const item = claim?.targetItem;
  const breakdown = getClaimBreakdown(claim);
  return (
    item?.displayName ||
    breakdown.item_name ||
    breakdown.itemName ||
    claim?.item_name ||
    'Unknown item'
  );
}

function ProofDialog({ claim, onClose, onRestoreLive, onConfirmOffice, busy }) {
  const [answerReview, setAnswerReview] = useState(() => getClaimAnswerReview(claim));
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  useEffect(() => {
    setAnswerReview(getClaimAnswerReview(claim));
  }, [claim]);

  useEffect(() => {
    if (!claim || getClaimAnswerReview(claim).length > 0) return undefined;
    const answers = claim.challenge_answers;
    if (!Array.isArray(answers) || !answers.length) return undefined;

    const itemType = claim.itemType || claim.item_type || claim.targetItem?.itemType || 'lost';
    const itemId = claim.itemId || claim.item_id || claim.targetItem?.id;
    if (!itemId) return undefined;

    let cancelled = false;
    setLoadingAnswers(true);
    (async () => {
      try {
        const challenge = await fetchOwnershipChallenge(itemType, itemId, { includeAnswers: true });
        if (cancelled || !challenge?.questions?.length) return;
        setAnswerReview(buildChallengeAnswerReview(challenge.questions, answers));
      } catch {
        /* older rows may lack recoverable Q&A */
      } finally {
        if (!cancelled) setLoadingAnswers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claim]);

  if (!claim) return null;
  const item = claim.targetItem;
  const imageSrc = resolveClaimProofImage(claim);
  const displayName = resolveClaimDisplayName(claim);
  const itemType = item?.itemType || claim.itemType || claim.item_type || claim.match_breakdown?.item_type;
  const typeLabel = itemType ? 'Lost item' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close proof statement"
      />

      <div className="glass-modal relative flex max-h-[min(92vh,860px)] w-full max-w-5xl flex-col overflow-hidden sm:rounded-[32px]">
        <div className="relative shrink-0 border-b border-white/60 bg-white/25 px-5 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <div className="glass-button flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#1A56DB]">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-950">Proof statement</h3>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {displayName}
                  {typeLabel ? ` · ${typeLabel}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/80"
              aria-label="Close proof statement"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
            <DetailPhotoPanel
              src={imageSrc}
              alt={displayName}
              badge={
                typeLabel
                  ? {
                      label: typeLabel,
                      className:
                        itemType === 'lost'
                          ? 'border-red-200/70 bg-red-500/15 text-red-700'
                          : 'border-emerald-200/70 bg-emerald-500/15 text-emerald-700',
                    }
                  : null
              }
              emptyLabel="No item photo"
              className="min-h-[240px] border-white/70 bg-white/35 lg:min-h-[320px]"
            />

            <div className="flex min-w-0 flex-col gap-3">
              <div className="glass-tile p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {claim.challenge_score != null && claim.challenge_score > 0
                    ? 'Ownership Challenge result'
                    : 'Statement'}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                  {claim.description || 'No proof statement provided.'}
                </p>
                {claim.challenge_score != null && claim.challenge_score > 0 ? (
                  <p className="mt-3 text-sm font-black text-[#1A56DB]">
                    Challenge {claim.challenge_score}% ·{' '}
                    {claim.displayStatus === 'Approved' ||
                    String(claim.status || '')
                      .toLowerCase()
                      .includes('approv')
                      ? challengeResultLabel('auto_pass')
                      : claim.displayStatus === 'Physical'
                        ? challengeResultLabel('physical')
                        : claim.displayStatus === 'Rejected'
                          ? challengeResultLabel('reject')
                          : challengeResultLabel(claim.challenge_result) || claim.displayStatus}
                  </p>
                ) : null}
              </div>

              {answerReview.length > 0 ? (
                <div className="glass-tile space-y-3 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Claimant answers
                  </p>
                  {answerReview.map((row, index) => {
                    const isOpen = row.open || row.question_type === 'ask';
                    const tone = isOpen
                      ? 'border-sky-200/80 bg-sky-50/70'
                      : row.correct
                        ? 'border-emerald-200/80 bg-emerald-50/70'
                        : 'border-red-200/80 bg-red-50/60';
                    return (
                    <div
                      key={`${row.prompt}-${index}`}
                      className={`rounded-2xl border px-3 py-2.5 ${tone}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          Q{index + 1}. {row.prompt}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            isOpen
                              ? 'bg-sky-600 text-white'
                              : row.correct
                                ? 'bg-emerald-600 text-white'
                                : 'bg-red-600 text-white'
                          }`}
                        >
                          {isOpen ? 'For review' : row.correct ? 'Correct' : 'Wrong'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">Their answer</p>
                      <p className="text-sm font-bold text-slate-800">{row.given || '—'}</p>
                      {!isOpen ? (
                        <>
                          <p className="mt-1.5 text-xs font-semibold text-slate-500">Expected</p>
                          <p className="text-sm font-medium text-slate-700">{row.expected || '—'}</p>
                        </>
                      ) : (
                        <p className="mt-1.5 text-xs font-semibold text-sky-700">
                          Open Ask — no expected answer stored. Review their text at the office.
                        </p>
                      )}
                    </div>
                    );
                  })}
                </div>
              ) : loadingAnswers ? (
                <div className="glass-tile p-4">
                  <p className="text-sm font-semibold text-slate-500">Loading claimant answers…</p>
                </div>
              ) : claim.challenge_score != null && claim.challenge_score > 0 ? (
                <div className="glass-tile p-4">
                  <p className="text-sm font-semibold text-slate-500">
                    Answer details are not available for this request.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass-tile p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Claimant</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{claim.claimer_name || 'Unknown student'}</p>
                  <p className="text-xs text-slate-500">{claim.claimer_student_id || 'No ID'}</p>
                </div>
                <div className="glass-tile p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatExactTime(claim.requestedAt)}</p>
                  <p className="text-xs text-slate-500">{formatRelativeTime(claim.requestedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/60 bg-white/25 px-5 py-4 backdrop-blur-md sm:px-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {claim.displayStatus === 'Physical' ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRestoreLive?.(claim)}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Restore live
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConfirmOffice?.(claim)}
                  className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  Confirm office
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-[#1A56DB] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SweetConfirm({ action, processing, onCancel, onConfirm, onNoteChange }) {
  if (!action) return null;
  const resolvedName = resolveClaimDisplayName(action.claim);
  const itemName = resolvedName === 'Unknown item' ? 'this item' : resolvedName;
  const claimantName = action.claim.claimer_name || 'this claimant';

  const config = {
    confirmPhysical: {
      icon: CheckCircle2,
      iconClass: 'bg-indigo-50 text-indigo-600',
      title: 'Confirm physical verification?',
      body: `Confirm ${claimantName} owns "${itemName}" after office check. Item moves to Returned Items.`,
      confirm: 'Confirm & return',
      buttonClass: 'bg-indigo-600 hover:bg-indigo-700',
    },
    reject: {
      icon: XCircle,
      iconClass: 'bg-red-50 text-red-600',
      title: 'Reject & restore live?',
      body: `Reject ${claimantName}'s request for "${itemName}" and put the item back on the live board.`,
      confirm: 'Reject & restore',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    delete: {
      icon: Trash2,
      iconClass: 'bg-slate-100 text-slate-700',
      title: 'Delete this request?',
      body: `Delete ${claimantName}'s request for "${itemName}" from the ownership request list. This only removes the claim record.`,
      confirm: 'Delete request',
      buttonClass: 'bg-slate-900 hover:bg-slate-800',
    },
  }[action.type];

  if (!config) return null;
  const Icon = config.icon || AlertTriangle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20">
        <div className="px-6 pt-6 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${config.iconClass}`}>
            <Icon size={28} />
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-950">{config.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{config.body}</p>
        </div>

        {action.type === 'reject' ? (
          <div className="px-6 pt-4">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Admin note
            </label>
            <textarea
              value={action.note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Optional reason..."
              className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-[#1A56DB]/40 focus:bg-white"
            />
          </div>
        ) : null}

        <div className="mt-5 flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60 ${config.buttonClass}`}
          >
            {processing ? 'Working...' : config.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function SweetAlert({ feedback, onClose }) {
  if (!feedback) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl shadow-slate-900/20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <XCircle size={28} />
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">{feedback.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{feedback.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#1A56DB] px-4 py-3 text-sm font-black text-white hover:bg-[#1E40AF]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function ExportConfirmModal({ count, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB] shadow-inner">
          <Download size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">Export CSV?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {count.toLocaleString()} ownership request{count === 1 ? '' : 's'} will be downloaded as a CSV file.
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

function EmptyState({ error, onRetry }) {
  return (
    <div className="mx-auto flex min-h-[460px] max-w-[980px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
        <ShieldCheck size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-950">
        {error ? 'Could not load requests' : 'No pending requests'}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {error || 'When a student submits a claim from the mobile app, it will appear here for review.'}
      </p>
      {error ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

function isOpenClaim(claim) {
  const status = String(claim?.displayStatus || claim?.status || '').toLowerCase();
  return status === 'pending' || status === 'open' || status === 'reviewing' || status === 'physical';
}

export default function OwnershipRequestsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusItemId = searchParams.get('itemId');
  const focusItemType = searchParams.get('itemType');
  const focusActive = Boolean(focusItemId);

  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { bumpBadge, setBadgeCounts } = useAdminBadges();
  const { data, error, refresh, patchData } = useBackgroundFetch(
    'admin:claims',
    fetchPendingItemClaims,
    { fallback: [] }
  );
  const claims = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const openClaimsCount = useMemo(() => claims.filter(isOpenClaim).length, [claims]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (statusFilter === 'Pending' || statusFilter === 'Reviewing') {
      setStatusFilter('all');
    }
  }, [statusFilter]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [unlockingSoftLock, setUnlockingSoftLock] = useState(false);

  const focusedClaims = useMemo(() => {
    if (!focusActive) return [];
    return claims.filter((claim) => claimMatchesFocusedItem(claim, focusItemId, focusItemType));
  }, [claims, focusActive, focusItemId, focusItemType]);

  const focusedOpenClaims = useMemo(
    () =>
      focusedClaims.filter((claim) =>
        ['Pending', 'Reviewing', 'Physical'].includes(claim.displayStatus)
      ),
    [focusedClaims]
  );

  const clearItemFocus = () => {
    router.replace('/admin/claims');
    setPage(1);
  };

  useEffect(() => {
    setBadgeCounts?.((prev) => ({ ...(prev || { pending: 0, claims: 0 }), claims: openClaimsCount }));
  }, [openClaimsCount, setBadgeCounts]);

  // Process Return deep-link: prefer open claims for that item.
  useEffect(() => {
    if (!focusActive) return;
    if (focusedOpenClaims.some((claim) => claim.displayStatus === 'Physical')) {
      setStatusFilter('Physical');
    } else if (focusedClaims.length > 0) {
      setStatusFilter('all');
    }
    setPage(1);
  }, [focusActive, focusItemId, focusedClaims.length, focusedOpenClaims.length]);

  const categories = useMemo(() => {
    const fromClaims = claims.map((claim) => claim.targetItem?.displayCategory).filter(Boolean);
    return ['all', ...resolveSystemCategories({ forAdmin: true, extras: fromClaims })];
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = focusActive ? focusedClaims : claims;
    return source.filter((claim) => {
      const item = claim.targetItem;
      const displayName = resolveClaimDisplayName(claim);
      const matchesStatus =
        statusFilter === 'all' || claim.displayStatus === statusFilter;
      const matchesFilter = filter === 'all' || item?.displayCategory === filter;
      const matchesSearch =
        !q ||
        displayName.toLowerCase().includes(q) ||
        item?.refId?.toLowerCase().includes(q) ||
        claim.refId?.toLowerCase().includes(q) ||
        claim.displayStatus?.toLowerCase().includes(q) ||
        claim.claimer_name?.toLowerCase().includes(q) ||
        claim.claimer_student_id?.toLowerCase().includes(q) ||
        claim.description?.toLowerCase().includes(q);
      return matchesStatus && matchesFilter && matchesSearch;
    });
  }, [claims, filter, focusActive, focusedClaims, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const pageItems = filteredClaims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => {
    const waiting = claims.filter((c) =>
      ['Pending', 'Reviewing', 'Physical'].includes(c.displayStatus)
    ).length;
    const approved = claims.filter((c) => c.displayStatus === 'Approved').length;
    const rejected = claims.filter((c) => c.displayStatus === 'Rejected').length;
    const physical = claims.filter((c) => c.displayStatus === 'Physical').length;

    const scored = claims
      .map((c) => Number(c.challenge_score))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, n) => sum + n, 0) / scored.length)
      : null;

    const autoPass = claims.filter((c) => {
      const result = c.challenge_result;
      if (result === 'auto_pass') return true;
      return c.displayStatus === 'Approved' && Number(c.challenge_score) >= 85;
    }).length;
    const scoreReject = claims.filter((c) => {
      if (c.challenge_result === 'reject') return true;
      return c.displayStatus === 'Rejected';
    }).length;

    const durations = claims
      .filter((c) => ['Approved', 'Rejected'].includes(c.displayStatus))
      .map((c) => {
        const start = new Date(c.requestedAt).getTime();
        const end = new Date(c.reviewed_at || c.reviewedAt).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
        return (end - start) / 36e5;
      })
      .filter((value) => value != null);

    const averageHours = durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : null;

    const categoryCounts = claims.reduce((map, claim) => {
      const category = claim.targetItem?.displayCategory || 'Other';
      map.set(category, (map.get(category) || 0) + 1);
      return map;
    }, new Map());

    const topEntry = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topEntry
      ? `${topEntry[0]} (${topEntry[1]} request${topEntry[1] === 1 ? '' : 's'})`
      : null;

    const replyTime = averageHours === null
      ? null
      : `${formatReplyTime(averageHours)} on average (${durations.length} completed)`;

    return {
      total: claims.length,
      waiting,
      approved,
      rejected,
      physical,
      autoPass,
      scoreReject,
      avgScore,
      replyTime,
      topCategory,
    };
  }, [claims]);

  const exportCsv = () => {
    const header = [
      'Claim ID',
      'Item',
      'Claimant',
      'ID',
      'Status',
      'Challenge Score',
      'Result',
      'Proof',
      'Requested At',
    ];
    const rows = filteredClaims.map((claim) => {
      const score = Number(claim.challenge_score);
      const hasScore = Number.isFinite(score) && claim.challenge_score != null;
      const result = String(claim.challenge_result || '').trim().toLowerCase();
      const resultLabel =
        result === 'auto_pass'
          ? 'Pass (85%+)'
          : result === 'physical'
            ? 'Physical (50–80%)'
            : result === 'reject'
              ? 'Reject (<50%)'
              : claim.displayStatus === 'Physical'
                ? 'Physical (50–80%)'
                : claim.displayStatus || '';

      return [
        claim.refId,
        resolveClaimDisplayName(claim),
        claim.claimer_name || '',
        claim.claimer_student_id || '',
        claim.displayStatus,
        hasScore ? `${Math.round(score)}%` : '',
        resultLabel,
        claim.description || '',
        claim.requestedAt || '',
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ownership-requests.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const runReject = async (claim, note = '') => {
    setProcessingId(claim.id);
    try {
      const wasOpen = isOpenClaim(claim);
      await restoreItemAfterFailedClaim(claim, note);
      invalidateClaimCaches();
      if (wasOpen) bumpBadge('claims', -1);
      patchData((current) =>
        current.map((row) =>
          row.id === claim.id
            ? {
                ...row,
                status: 'rejected',
                displayStatus: 'Rejected',
                admin_note: note,
                reviewed_at: new Date().toISOString(),
              }
            : row
        )
      );
      setConfirmAction(null);
    } catch (e) {
      setFeedback({ title: 'Reject failed', message: e.message || 'Could not reject request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const runConfirmPhysical = async (claim) => {
    setProcessingId(claim.id);
    try {
      const wasOpen = isOpenClaim(claim);
      await confirmPhysicalClaim(claim);
      invalidateClaimCaches();
      if (wasOpen) bumpBadge('claims', -1);
      patchData((current) =>
        current.map((row) =>
          row.id === claim.id
            ? { ...row, status: 'approved', displayStatus: 'Approved', reviewed_at: new Date().toISOString() }
            : row
        )
      );
      setConfirmAction(null);
    } catch (e) {
      setFeedback({
        title: 'Confirm failed',
        message: e.message || 'Could not confirm physical verification.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const runDelete = async (claim) => {
    setProcessingId(claim.id);
    try {
      const wasOpen = isOpenClaim(claim);
      await deleteItemClaim(claim.id);
      if (wasOpen) bumpBadge('claims', -1);
      patchData((current) => current.filter((row) => row.id !== claim.id));
      setConfirmAction(null);
    } catch (e) {
      setFeedback({ title: 'Delete failed', message: e.message || 'Could not delete request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const confirmCurrentAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'confirmPhysical') runConfirmPhysical(confirmAction.claim);
    if (confirmAction.type === 'reject') runReject(confirmAction.claim, confirmAction.note);
    if (confirmAction.type === 'delete') runDelete(confirmAction.claim);
  };

  if (error && claims.length === 0) {
    return <EmptyState error={error} onRetry={refresh} />;
  }

  if (claims.length === 0) {
    return <EmptyState error={null} onRetry={refresh} />;
  }

  const focusItemLabel =
    focusedClaims[0]
      ? resolveClaimDisplayName(focusedClaims[0])
      : focusItemId
        ? `Item #${focusItemId}`
        : '';

  return (
    <div className="space-y-4">
      {focusActive ? (
        <div className="glass-card flex flex-col gap-3 border border-[#1A56DB]/20 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-[#1A56DB]">Process Return</p>
            <p className="mt-1 text-sm text-slate-600">
              {focusedOpenClaims.length > 0
                ? `Office check for “${focusItemLabel}” — Confirm office after verification, or Restore live if it is not a match.`
                : focusedClaims.length > 0
                  ? `Requests for “${focusItemLabel}” are shown below. Challenge score already decided open ones.`
                  : `No submitted request for this item yet (ID ${focusItemId}). “Answering challenge” means someone opened the form but did not Submit — tap Restore live below (or student Cancel) to put it back on the board.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {focusedClaims.length === 0 && focusItemId ? (
              <button
                type="button"
                disabled={unlockingSoftLock}
                onClick={async () => {
                  setUnlockingSoftLock(true);
                  try {
                    await releaseItemClaimReserve(focusItemType || 'lost', focusItemId);
                    setFeedback({
                      type: 'success',
                      title: 'Restored to live',
                      message: 'Soft-lock cleared. Item is available on the board again.',
                    });
                    invalidateClaimCaches();
                    clearItemFocus();
                    router.push('/admin/items');
                  } catch (err) {
                    setFeedback({
                      type: 'error',
                      title: 'Could not restore',
                      message: err?.message || 'Try again from Global Inventory refresh.',
                    });
                  } finally {
                    setUnlockingSoftLock(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {unlockingSoftLock ? 'Restoring…' : 'Restore live'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearItemFocus}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X size={14} />
              Show all requests
            </button>
          </div>
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex max-w-full overflow-x-auto rounded-[22px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'all', label: `All Requests (${focusActive ? focusedClaims.length : claims.length})` },
              {
                id: 'Physical',
                label: `Physical (${(focusActive ? focusedClaims : claims).filter((claim) => claim.displayStatus === 'Physical').length})`,
              },
              { id: 'Approved', label: `Approved (${(focusActive ? focusedClaims : claims).filter((claim) => claim.displayStatus === 'Approved').length})` },
              { id: 'Rejected', label: `Rejected (${(focusActive ? focusedClaims : claims).filter((claim) => claim.displayStatus === 'Rejected').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`shrink-0 rounded-[14px] px-3 py-2 text-xs font-semibold whitespace-nowrap transition sm:text-sm ${
                  statusFilter === tab.id
                    ? 'glass-tab-active text-slate-900'
                    : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <label className="relative w-[188px] shrink-0 sm:w-[220px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search claims..."
                className="glass-input h-10 w-full rounded-[18px] pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
              />
            </label>
            <div className="relative shrink-0">
              <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setPage(1);
                }}
                className="glass-input h-10 w-[132px] appearance-none rounded-[18px] pl-8 pr-7 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15 sm:w-[148px]"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setConfirmExport(true)}
              className="glass-button inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[18px] px-3 text-sm font-semibold whitespace-nowrap text-slate-700 transition hover:text-[#1A56DB]"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              type="button"
              onClick={refresh}
              className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] text-slate-500 transition hover:text-[#1A56DB]"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/40 bg-white/[0.12] text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Item & Claimant</th>
                  <th className="px-5 py-3">Proof Summary</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Office / result</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                      {focusActive && focusedClaims.length === 0
                        ? 'No submitted claim yet — student may still be answering (Cancel → live again).'
                        : claims.length === 0
                          ? 'No ownership requests found yet.'
                          : 'No requests match your filters.'}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((claim) => {
                    const item = claim.targetItem;
                    const displayName = resolveClaimDisplayName(claim);
                    const imageSrc = resolveClaimProofImage(claim);
                    const itemType = item?.itemType || claim.itemType || claim.item_type;
                    const busy = processingId === claim.id;
                    const isPhysical = claim.displayStatus === 'Physical';
                    const isOpen = ['Pending', 'Reviewing', 'Physical'].includes(claim.displayStatus);
                    const score = Number(claim.challenge_score);
                    const hasScore = Number.isFinite(score) && score >= 0;
                    const isFocusedRow = focusActive && claimMatchesFocusedItem(claim, focusItemId, focusItemType);
                    return (
                      <tr
                        key={claim.id}
                        onClick={() => setSelectedProof(claim)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedProof(claim);
                          }
                        }}
                        tabIndex={0}
                        className={`glass-row-hover cursor-pointer border-b border-white/30 transition last:border-b-0 focus-visible:bg-blue-50/40 focus-visible:outline-none ${
                          isFocusedRow ? 'bg-blue-50/55 ring-1 ring-inset ring-[#1A56DB]/25' : ''
                        }`}
                      >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ItemThumbnail
                            src={imageSrc}
                            alt={displayName}
                            itemType={itemType}
                            itemName={displayName}
                            category={claim.displayCategory || claim.category}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[15px] font-black leading-tight text-slate-900">
                                {displayName}
                              </p>
                              <span className="glass-badge rounded-full border border-white/60 bg-white/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                {claim.refId}
                              </span>
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <UserRound size={13} />
                              <span className="font-semibold">{claim.claimer_name || 'Unknown student'}</span>
                              <span>-</span>
                              <span>{claim.claimer_student_id || 'No ID'}</span>
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#0759B8]">
                              <Clock3 size={12} />
                              <span>{formatRelativeTime(claim.requestedAt)}</span>
                              <span className="font-semibold text-slate-400">({formatExactTime(claim.requestedAt)})</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[420px] px-5 py-4">
                        <div className="max-w-xl">
                          {hasScore ? (
                            <p className="mb-1 text-xs font-black text-[#1A56DB]">
                              Challenge {score}% ·{' '}
                              {String(claim.status || claim.displayStatus || '')
                                .toLowerCase()
                                .includes('approv')
                                ? challengeResultLabel('auto_pass')
                                : challengeResultLabel(claim.challenge_result) || claim.displayStatus}
                            </p>
                          ) : null}
                          <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                            &quot;{truncate(claim.description, 120)}&quot;
                          </p>
                        </div>
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1 rounded-lg px-0 text-xs font-black text-[#0759B8] hover:underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedProof(claim);
                          }}
                        >
                          Open full proof <ExternalLink size={12} />
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`glass-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${statusClass(claim.displayStatus)}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {claim.displayStatus}
                        </span>
                      </td>
                      <td
                        className="px-5 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {isPhysical ? (
                          <div className="flex flex-wrap justify-center gap-2">
                            <ActionButton
                              label="Restore live"
                              tone="reject"
                              icon={X}
                              disabled={busy}
                              onClick={() => setConfirmAction({ type: 'reject', claim, note: '' })}
                            />
                            <ActionButton
                              label="Confirm office"
                              tone="physical"
                              icon={ShieldCheck}
                              disabled={busy}
                              onClick={() => setConfirmAction({ type: 'confirmPhysical', claim })}
                            />
                          </div>
                        ) : claim.displayStatus === 'Pending' ? (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-[11px] font-semibold leading-4 text-slate-500">
                              Old claim (no score)
                            </p>
                            <ActionButton
                              label="Reject"
                              tone="reject"
                              icon={X}
                              disabled={busy}
                              onClick={() =>
                                setConfirmAction({
                                  type: 'reject',
                                  claim,
                                  note: 'Legacy claim without Ownership Challenge score.',
                                })
                              }
                            />
                          </div>
                        ) : isOpen ? (
                          <div className="mx-auto max-w-[200px] text-center">
                            <p className="text-xs font-black text-slate-700">
                              {hasScore ? `${score}%` : '—'}
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">
                              Challenge score
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2">
                            <span
                              className={`inline-flex h-9 w-[138px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold ${
                                claim.displayStatus === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {claim.displayStatus === 'Approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                              {claim.displayStatus === 'Approved' ? 'Pass' : 'Rejected'}
                            </span>
                            {isSuperAdmin ? (
                              <ActionButton
                                label="Delete"
                                tone="delete"
                                icon={Trash2}
                                disabled={busy}
                                onClick={() => setConfirmAction({ type: 'delete', claim })}
                              />
                            ) : null}
                          </div>
                        )}
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <p className="text-sm text-slate-500">
            Showing <span className="font-black text-slate-800">{pageItems.length}</span> of{' '}
            <span className="font-black text-slate-800">{filteredClaims.length}</span> request{filteredClaims.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  page === number
                    ? 'bg-[#0759B8] text-white'
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
              className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        </div>
      </section>

      <ClaimsSummary summary={summary} />
      <ProofDialog
        claim={selectedProof}
        busy={Boolean(processingId)}
        onClose={() => setSelectedProof(null)}
        onRestoreLive={(claim) => {
          setSelectedProof(null);
          setConfirmAction({ type: 'reject', claim, note: '' });
        }}
        onConfirmOffice={(claim) => {
          setSelectedProof(null);
          setConfirmAction({ type: 'confirmPhysical', claim });
        }}
      />
      {confirmExport ? (
        <ExportConfirmModal
          count={filteredClaims.length}
          onCancel={() => setConfirmExport(false)}
          onConfirm={() => {
            setConfirmExport(false);
            exportCsv();
          }}
        />
      ) : null}
      <SweetConfirm
        action={confirmAction}
        processing={Boolean(processingId)}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmCurrentAction}
        onNoteChange={(note) => setConfirmAction((current) => (current ? { ...current, note } : current))}
      />
      <SweetAlert feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
