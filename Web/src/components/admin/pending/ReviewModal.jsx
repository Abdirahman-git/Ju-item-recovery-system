'use client';

import DetailPhotoPanel from '@/components/admin/DetailPhotoPanel';
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldQuestion,
  Tag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

const TYPE_STYLES = {
  lost: {
    label: 'Lost Report',
    badge: 'border-red-200/70 bg-red-500/10 text-red-700',
    accent: 'from-red-500/15 via-transparent to-transparent',
  },
  found: {
    label: 'Lost Report',
    badge: 'border-red-200/70 bg-red-500/10 text-red-700',
    accent: 'from-red-500/15 via-transparent to-transparent',
  },
};
const TITLE_LIMIT = 68;

function clampText(value, limit) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function InfoTile({ icon: Icon, label, value, wide = false }) {
  const displayValue = value || 'Not provided';
  return (
    <div
      className={`min-w-0 rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-3 ${
        wide ? 'sm:col-span-2' : ''
      }`}
    >
      <div className="mb-1.5 flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1A56DB]/10 text-[#1A56DB]">
          <Icon size={12} />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p
        className={`${wide ? 'break-words [overflow-wrap:anywhere]' : 'truncate'} text-sm font-bold leading-5 text-slate-800`}
        title={String(displayValue)}
      >
        {wide ? displayValue : clampText(displayValue, 46)}
      </p>
    </div>
  );
}

export default function ReviewModal({ item, onClose, onApprove, onReject, processing }) {
  if (!item) return null;

  const typeStyle = TYPE_STYLES[item.reportType] || TYPE_STYLES.lost;
  const reporterLabel = item.reportType === 'lost' ? 'Owner' : 'Finder';
  const displayTitle = clampText(item.displayName, TITLE_LIMIT);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close review"
      />

      <div className="glass-modal relative flex max-h-[min(92vh,820px)] w-full max-w-6xl flex-col overflow-hidden sm:rounded-[28px]">
        <div className="relative shrink-0 overflow-hidden border-b border-white/60 px-5 py-4 sm:px-6">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${typeStyle.accent}`} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`glass-badge inline-flex rounded-full border px-3 py-1 text-xs font-black ${typeStyle.badge}`}>
                {typeStyle.label}
              </span>
              <h2
                className="mt-2 max-w-3xl truncate text-2xl font-black tracking-tight text-slate-950 sm:text-[1.7rem]"
                title={item.displayName}
              >
                {displayTitle || 'Unnamed item'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Review this report before making it visible in the system.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/80"
              aria-label="Close"
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
              emptyIcon={ClipboardList}
              emptyLabel="No image uploaded"
            />

            <section className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:max-h-full">
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3.5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1A56DB]/10 text-[#1A56DB]">
                    <ClipboardList size={12} />
                  </span>
                  Description
                </div>
                <p
                  className="break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]"
                  title={item.description || ''}
                >
                  {item.description?.trim() || 'No description provided.'}
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoTile icon={Tag} label="Category" value={item.displayCategory} />
                <InfoTile icon={CalendarClock} label="Submitted" value={formatDate(item.reportedAt)} />
                <InfoTile icon={UserRound} label={reporterLabel} value={item.reporterName || 'User'} />
                <InfoTile icon={IdCard} label="ID" value={item.reporterStudentId || 'Not available'} />
                <InfoTile icon={MapPin} label="Location" value={item.location || item.address} />
                <InfoTile icon={Phone} label="Phone" value={item.phnum || item.phone || item.phone_number} />
                <InfoTile icon={Mail} label="Email" value={item.reporterEmail || item.email} wide />
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/70 bg-gradient-to-b from-white/50 to-white/80 px-5 py-4 backdrop-blur-md sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:max-w-md">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Next step
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600 text-pretty">
                Set private owner questions, then the item goes live. Reject removes this report.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                disabled={processing}
                onClick={onReject}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-white/80 px-4 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                <Trash2 size={15} strokeWidth={2.2} />
                Reject
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={onApprove}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(26,86,219,0.28)] transition hover:bg-[#1E40AF] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                <ShieldQuestion size={16} strokeWidth={2.2} className="opacity-95" />
                Continue to Challenge
                <ArrowRight
                  size={16}
                  strokeWidth={2.4}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
