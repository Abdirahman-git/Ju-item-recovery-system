'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  CheckCheck,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
  Package,
  IdCard,
  Reply,
  Send,
} from 'lucide-react';
import {
  deleteContactMessage,
  fetchContactMailIdentity,
  fetchContactMessages,
  replyContactMessage,
  updateContactMessageStatus,
} from '@/lib/supabase';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useSession } from '@/context/SessionProvider';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import { invalidateAdminCaches } from '@/lib/adminDataCache';
import { buildContactMessagesSparklines } from '@/lib/pageSparklines';
import StatCard from '@/components/admin/StatCard';

const PAGE_SIZE = 8;

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'read', label: 'Read' },
  { id: 'archived', label: 'Archived' },
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

function formatPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('6')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith('252')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return raw;
}

function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '??'
  );
}

function statusBadge(status) {
  if (status === 'new') {
    return 'border-blue-200 bg-blue-50 text-[#1A56DB]';
  }
  if (status === 'archived') {
    return 'border-slate-200 bg-slate-100 text-slate-600';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function parseMessageExtras(message) {
  const raw = String(message || '');
  const marker = '— Lost & Found details —';
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    return { body: raw.trim(), itemName: '', place: '', studentId: '' };
  }
  const body = raw.slice(0, idx).trim();
  const details = raw.slice(idx + marker.length);
  const itemName = details.match(/Item:\s*(.+)/i)?.[1]?.trim() || '';
  const place = details.match(/Campus place:\s*(.+)/i)?.[1]?.trim() || '';
  const studentId = details.match(/Student ID:\s*(.+)/i)?.[1]?.trim() || '';
  return { body, itemName, place, studentId };
}

function MetaChip({ icon: Icon, label, value, tone = 'slate' }) {
  if (!value) return null;
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-[#1A56DB]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
  };
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tones[tone] || tones.slate}`}
      title={`${label}: ${value}`}
    >
      {Icon ? <Icon size={12} className="shrink-0 opacity-80" /> : null}
      <span className="truncate">
        <span className="mr-1 font-semibold text-slate-500">{label}</span>
        <span className="tabular-nums tracking-wide text-slate-900">{value}</span>
      </span>
    </span>
  );
}

function DetailField({ label, value, icon: Icon, mono = false }) {
  if (value == null || value === '') return null;
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
            <Icon size={15} strokeWidth={2.25} />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p
            className={`mt-0.5 break-words text-sm font-bold text-slate-900 ${
              mono ? 'font-mono tabular-nums tracking-wide' : ''
            }`}
          >
            {String(value)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ name, loading, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-5 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={24} />
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">Delete message?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Move the message from <span className="font-bold text-slate-700">{name}</span> out of
          Contact Messages. It will appear under Deleted Records so you can restore it later.
        </p>
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
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function MessageDetailModal({
  row,
  busy,
  replyText,
  onReplyChange,
  replyError,
  replySuccess,
  showReplyForm,
  onOpenReplyForm,
  onCloseReplyForm,
  mailIdentity,
  onClose,
  onMarkRead,
  onArchive,
  onRestore,
  onDelete,
  onSendReply,
}) {
  if (!row) return null;
  const extras = parseMessageExtras(row.message);
  const phoneDisplay = formatPhone(row.phone);
  const senderEmailOk = isValidEmailFormat(row.email);
  const fromEmail = mailIdentity?.fromEmail || '';
  const replyToEmail = mailIdentity?.replyTo || fromEmail;
  const mailConfigured = Boolean(mailIdentity?.configured && fromEmail);
  const alreadyReplied = Boolean(row.replyBody);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-md sm:items-center sm:p-5">
      <div className="relative flex max-h-[min(92vh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200/90 bg-[#F8FAFC] shadow-2xl sm:rounded-[32px]">
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-[#0F2A6B] via-[#1A56DB] to-[#2563EB] px-5 py-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    row.status === 'new'
                      ? 'border-white/30 bg-white/15 text-white'
                      : 'border-white/25 bg-white/10 text-blue-50'
                  }`}
                >
                  {row.status}
                </span>
                {alreadyReplied ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-50">
                    <Reply size={11} /> Replied
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                {row.subject || 'Contact message'}
              </h3>
              <p className="mt-1 text-xs font-semibold text-blue-100/90">{formatDate(row.createdAt)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Sender" value={row.fullName} icon={UserRound} />
            <DetailField label="Email" value={row.email} icon={Mail} />
            <DetailField label="Phone" value={phoneDisplay || row.phone} icon={Phone} mono />
            <DetailField label="Student ID" value={extras.studentId} icon={IdCard} mono />
            <DetailField label="Item" value={extras.itemName} icon={Package} />
            <DetailField label="Campus place" value={extras.place} icon={MapPin} />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Message
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-slate-800">
              {extras.body || row.message}
            </p>
          </div>

          {alreadyReplied ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  Your reply
                </p>
                <span className="text-[11px] font-semibold text-emerald-700/80">
                  {formatDate(row.repliedAt)} · {row.repliedBy || fromEmail || 'admin'}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-emerald-950">
                {row.replyBody}
              </p>
            </div>
          ) : null}

          {showReplyForm ? (
            <div className="mt-4 rounded-2xl border border-[#1A56DB]/20 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#1A56DB]">
                  <Reply size={12} /> Reply by email
                </p>
                <button
                  type="button"
                  onClick={onCloseReplyForm}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  Hide
                </button>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    To (sender — auto)
                  </span>
                  <input
                    type="email"
                    readOnly
                    value={row.email || ''}
                    className={`mt-1.5 w-full cursor-default rounded-xl border px-3 py-2.5 text-sm font-bold outline-none ${
                      senderEmailOk
                        ? 'border-emerald-200 bg-emerald-50/80 text-slate-900'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    From (real mailbox — auto)
                  </span>
                  <input
                    type="email"
                    readOnly
                    value={fromEmail || 'Not configured'}
                    className={`mt-1.5 w-full cursor-default rounded-xl border px-3 py-2.5 text-sm font-bold outline-none ${
                      mailConfigured
                        ? 'border-blue-200 bg-blue-50/80 text-slate-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  />
                </label>
              </div>

              {!mailConfigured ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Set a real Gmail in Backend/.env as GMAIL_USER + GMAIL_PASS (App Password).{' '}
                  <span className="font-bold">admin2@ju.edu.so</span> is only the login account —
                  it cannot send mail.
                </p>
              ) : replyToEmail && replyToEmail !== fromEmail ? (
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                  Student replies will go to: {replyToEmail}
                </p>
              ) : null}

              {!senderEmailOk ? (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Sender email is invalid — reply cannot be sent.
                </p>
              ) : null}

              <label className="mt-3 block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Your message
                </span>
                <textarea
                  value={replyText}
                  onChange={(e) => onReplyChange(e.target.value)}
                  rows={4}
                  disabled={busy || !senderEmailOk || !mailConfigured}
                  placeholder={`Write a reply to ${row.fullName || 'the sender'}…`}
                  className="mt-1.5 w-full resize-y rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#1A56DB] focus:bg-white focus:ring-2 focus:ring-[#1A56DB]/15 disabled:opacity-60"
                />
              </label>

              {replyError ? (
                <p className="mt-2 text-xs font-semibold text-red-600">{replyError}</p>
              ) : null}
              {replySuccess ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700">{replySuccess}</p>
              ) : null}

              <button
                type="button"
                disabled={busy || !senderEmailOk || !mailConfigured || replyText.trim().length < 5}
                onClick={onSendReply}
                className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-[#1A56DB] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {alreadyReplied ? 'Send another reply' : 'Send reply'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 bg-white px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onOpenReplyForm}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black transition disabled:opacity-60 ${
              showReplyForm
                ? 'border border-[#1A56DB]/30 bg-blue-50 text-[#1A56DB]'
                : 'bg-[#1A56DB] text-white shadow-lg shadow-blue-500/25 hover:bg-[#1E40AF]'
            }`}
          >
            <Reply size={14} />
            {showReplyForm ? 'Reply open' : alreadyReplied ? 'Reply again' : 'Reply'}
          </button>
          {row.status !== 'read' && row.status !== 'archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkRead}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <CheckCheck size={14} /> Mark read
            </button>
          ) : null}
          {row.status !== 'archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <Archive size={14} /> Archive
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onRestore}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Restore to new
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageCard({ row, onOpen }) {
  const extras = parseMessageExtras(row.message);
  const phoneDisplay = formatPhone(row.phone);
  const isNew = row.status === 'new';

  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className={`group relative w-full overflow-hidden rounded-[24px] border text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)] ${
        isNew
          ? 'border-blue-200/90 bg-gradient-to-br from-white via-white to-blue-50/70 shadow-[0_10px_28px_rgba(26,86,219,0.08)]'
          : 'border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]'
      }`}
    >
      {isNew ? (
        <span className="absolute left-0 top-0 h-full w-1 bg-[#1A56DB]" aria-hidden />
      ) : null}

      <div className="flex flex-col gap-3.5 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            isNew
              ? 'bg-[#1A56DB] text-white shadow-lg shadow-blue-500/30'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {initials(row.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-black tracking-tight text-slate-950">
              {row.fullName}
            </h3>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusBadge(row.status)}`}
            >
              {row.status}
            </span>
            {row.replyBody ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                <Reply size={10} /> Replied
              </span>
            ) : null}
          </div>

          <p className="mt-1 truncate text-sm font-bold text-slate-800">
            {row.subject || 'Contact message'}
          </p>

          {extras.body ? (
            <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">
              {extras.body}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <MetaChip icon={Phone} label="Phone" value={phoneDisplay || row.phone} tone="blue" />
            <MetaChip icon={Mail} label="Email" value={row.email} tone="slate" />
            <MetaChip icon={IdCard} label="ID" value={extras.studentId} tone="violet" />
            <MetaChip icon={Package} label="Item" value={extras.itemName} tone="amber" />
            <MetaChip icon={MapPin} label="Place" value={extras.place} tone="emerald" />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
          <span className="text-[11px] font-bold tabular-nums text-slate-500">
            {formatDate(row.createdAt)}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 opacity-0 transition group-hover:opacity-100">
            Open
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ContactMessagesClient() {
  const router = useRouter();
  const { session, ready } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setBadgeCounts } = useAdminBadges();

  const { data, error, refresh, patchData } = useBackgroundFetch(
    'admin:contact-messages',
    fetchContactMessages,
    { fallback: [] }
  );
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  useEffect(() => {
    const contactNew = items.filter((m) => m.status === 'new').length;
    setBadgeCounts((prev) => {
      if ((prev?.contact || 0) === contactNew) return prev;
      return { ...(prev || {}), contact: contactNew };
    });
  }, [items, setBadgeCounts]);

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [sparkPlayKey, setSparkPlayKey] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [mailIdentity, setMailIdentity] = useState(null);

  useEffect(() => {
    if (!ready) return;
    if (!isSuperAdmin) router.replace('/admin/items');
  }, [ready, isSuperAdmin, router]);

  useEffect(() => {
    setPage(1);
  }, [tab, query]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, [items.length]);

  useEffect(() => {
    setReplyText('');
    setReplyError('');
    setReplySuccess('');
    setShowReplyForm(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!isSuperAdmin || !ready) return;
    let cancelled = false;
    fetchContactMailIdentity()
      .then((data) => {
        if (!cancelled) setMailIdentity(data);
      })
      .catch(() => {
        if (!cancelled) {
          setMailIdentity({
            configured: false,
            fromEmail: '',
            replyTo: '',
            note: 'Could not load mail settings. Is the Backend running?',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, ready]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (tab !== 'all' && row.status !== tab) return false;
      if (!q) return true;
      const extras = parseMessageExtras(row.message);
      const hay =
        `${row.fullName} ${row.email} ${row.phone} ${row.subject} ${extras.body} ${extras.studentId} ${extras.itemName} ${extras.place} ${row.refId}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const shown = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const counts = useMemo(
    () => ({
      all: items.length,
      new: items.filter((r) => r.status === 'new').length,
      read: items.filter((r) => r.status === 'read').length,
      archived: items.filter((r) => r.status === 'archived').length,
    }),
    [items]
  );

  const sparklines = useMemo(() => buildContactMessagesSparklines(items), [items]);

  const openMessage = async (row) => {
    setSelected(row);
    setActionError('');
    if (row.status === 'new') {
      try {
        await updateContactMessageStatus(row.id, 'read');
        patchData((prev) =>
          (Array.isArray(prev) ? prev : []).map((item) =>
            item.id === row.id ? { ...item, status: 'read' } : item
          )
        );
        setSelected((prev) => (prev?.id === row.id ? { ...prev, status: 'read' } : prev));
        invalidateAdminCaches('admin:contact-messages');
      } catch {
        /* keep open even if mark-read fails */
      }
    }
  };

  const runStatus = async (row, status) => {
    setBusy(true);
    setActionError('');
    try {
      await updateContactMessageStatus(row.id, status);
      patchData((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) =>
          item.id === row.id ? { ...item, status } : item
        )
      );
      setSelected((prev) => (prev?.id === row.id ? { ...prev, status } : prev));
      invalidateAdminCaches('admin:contact-messages');
    } catch (err) {
      setActionError(err?.message || 'Could not update message.');
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async (row) => {
    setBusy(true);
    setActionError('');
    try {
      await deleteContactMessage(row.id);
      patchData((prev) => (Array.isArray(prev) ? prev : []).filter((item) => item.id !== row.id));
      setSelected(null);
      setConfirmDelete(null);
      invalidateAdminCaches('admin:contact-messages');
    } catch (err) {
      setActionError(err?.message || 'Could not delete message.');
    } finally {
      setBusy(false);
    }
  };

  const runReply = async () => {
    if (!selected) return;
    setBusy(true);
    setReplyError('');
    setReplySuccess('');
    try {
      if (!isValidEmailFormat(selected.email)) {
        throw new Error('Sender email is invalid.');
      }
      if (!mailIdentity?.configured || !isValidEmailFormat(mailIdentity?.fromEmail)) {
        throw new Error(
          'Configure a real Gmail in Backend/.env (GMAIL_USER + GMAIL_PASS). admin2@ju.edu.so cannot send mail.'
        );
      }
      const result = await replyContactMessage(selected.id, replyText);
      if (result.item) {
        patchData((prev) =>
          (Array.isArray(prev) ? prev : []).map((item) =>
            item.id === selected.id ? result.item : item
          )
        );
        setSelected(result.item);
      } else {
        const nowIso = new Date().toISOString();
        const patched = {
          ...selected,
          replyBody: replyText.trim(),
          repliedAt: nowIso,
          repliedBy: result.sentFrom || mailIdentity.fromEmail,
          status: selected.status === 'new' ? 'read' : selected.status,
        };
        patchData((prev) =>
          (Array.isArray(prev) ? prev : []).map((item) =>
            item.id === selected.id ? patched : item
          )
        );
        setSelected(patched);
      }
      setReplyText('');
      setReplySuccess(
        result.warning
          ? `Reply sent to ${result.sentTo}. ${result.warning}`
          : `Reply sent to ${result.sentTo || selected.email} from ${result.sentFrom || mailIdentity.fromEmail}.`
      );
      invalidateAdminCaches('admin:contact-messages');
    } catch (err) {
      setReplyError(err?.message || 'Could not send reply.');
    } finally {
      setBusy(false);
    }
  };

  if (!ready || !isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-slate-500">
        Checking Super Admin access…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="package"
          value={counts.all}
          label="Inbox"
          trendLabel="All messages"
          subLabel="LOFO desk"
          sparkData={sparklines.inbox}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="alert"
          value={counts.new}
          label="New"
          urgent={counts.new > 0}
          trendLabel={counts.new > 0 ? 'Needs review' : 'Queue clear'}
          sparkData={sparklines.new}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="check"
          value={counts.read}
          label="Read"
          trendLabel="Reviewed"
          sparkData={sparklines.read}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          icon="clock"
          value={counts.archived}
          label="Archived"
          trendLabel="Stored"
          sparkData={sparklines.archived}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-[22px] border border-white/60 bg-white/40 p-1 shadow-sm backdrop-blur-xl">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-[14px] px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                tab === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
              }`}
            >
              {item.label} ({counts[item.id] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="relative block min-w-0 flex-1 lg:w-[320px] lg:flex-none">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, ID, item…"
              className="h-10 w-full rounded-[18px] border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/15"
            />
          </label>
          <button
            type="button"
            onClick={() => refresh()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-[#1A56DB]"
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
          <button type="button" onClick={() => refresh()} className="ml-3 underline">
            Retry
          </button>
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
            <Inbox size={24} />
          </div>
          <p className="text-base font-black text-slate-900">No messages yet</p>
          <p className="mt-1 max-w-sm text-sm font-medium text-slate-500">
            Public contact form submissions will appear here for Super Admin review.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((row) => (
            <MessageCard key={row.id} row={row} onOpen={openMessage} />
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500">
            Page {pageSafe} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <MessageDetailModal
          row={selected}
          busy={busy}
          replyText={replyText}
          onReplyChange={setReplyText}
          replyError={replyError}
          replySuccess={replySuccess}
          showReplyForm={showReplyForm}
          onOpenReplyForm={() => setShowReplyForm(true)}
          onCloseReplyForm={() => setShowReplyForm(false)}
          mailIdentity={mailIdentity}
          onClose={() => setSelected(null)}
          onMarkRead={() => runStatus(selected, 'read')}
          onArchive={() => runStatus(selected, 'archived')}
          onRestore={() => runStatus(selected, 'new')}
          onDelete={() => setConfirmDelete(selected)}
          onSendReply={runReply}
        />
      ) : null}

      {confirmDelete ? (
        <DeleteConfirmModal
          name={confirmDelete.fullName}
          loading={busy}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => runDelete(confirmDelete)}
        />
      ) : null}
    </div>
  );
}
