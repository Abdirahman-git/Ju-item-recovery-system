'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { fetchAllInventoryItems } from '@/lib/supabase';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';
import { buildMyItemsPageSparklines } from '@/lib/pageSparklines';
import { getInventoryCardMeta } from '@/lib/inventory';
import { isSecureListing } from '@/lib/itemStatus';
import StatCard from '@/components/admin/StatCard';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function isAdminCreatedItem(item, session) {
  if (!session) return false;
  const email = normalize(session.email);
  const name = normalize(session.userName);
  const studentId = normalize(session.studentId);
  const itemEmails = [item.email, item.userId, item.userid].map(normalize);
  const itemNames = [item.ownerName, item.owner_name, item.finderName, item.finder_name].map(normalize);
  const itemIds = [item.student_id, item.studentId].map(normalize);

  return (
    (email && itemEmails.includes(email)) ||
    (name && itemNames.includes(name)) ||
    (studentId && itemIds.includes(studentId))
  );
}

function formatDate(value) {
  if (!value) return 'Recently';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return 'Recently';
  }
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { en: 'Good morning', so: 'Subax wanaagsan', emoji: '🌤️' };
  if (hour < 17) return { en: 'Good afternoon', so: 'Galab wanaagsan', emoji: '☀️' };
  return { en: 'Good evening', so: 'Fiid wanaagsan', emoji: '🌙' };
}

function firstName(name) {
  return String(name || 'Admin').trim().split(/\s+/)[0];
}

function buildStatusLines(counts, name, photoRate) {
  const who = firstName(name);
  const lines = [];

  if (counts.total === 0) {
    lines.push(`${who}, campus-ku wuu sugayaa first report-kaaga — bilow maanta!`);
    lines.push(`Hey ${who} 👋 diyaar ma u tahay inaad arday u caawiso?`);
    lines.push(`Ma jiraan posts hadda — Report Lost riix si aad u bilowdo.`);
  } else {
    lines.push(`${who}, waxaad soo gelisay ${counts.total} item${counts.total === 1 ? '' : 's'} — mahadsanid shaqadaada!`);
    if (counts.found > 0) {
      lines.push(`${counts.found} found report${counts.found === 1 ? '' : 's'} ayaa ardayda u fududeynaya inay helaan alaabtooda.`);
    }
    if (counts.lost > 0) {
      lines.push(`${counts.lost} lost report${counts.lost === 1 ? '' : 's'} oo campus-ka lagu raadinayo.`);
    }
    if (counts.secure > 0) {
      lines.push(`${counts.secure} secure hold${counts.secure === 1 ? '' : 's'} — alaabta waa la ilaalinayaa.`);
    }
    if (photoRate >= 80) {
      lines.push(`Excellent! ${photoRate}% posts-kaaga waxay leeyihiin sawir — ardaydu way ku fududaan.`);
    } else if (photoRate < 50) {
      lines.push(`Tip: sawir ku dar markaad post gareyso — hadda ${photoRate}% kaliya ayaa leh photo.`);
    }
  }

  lines.push(`JU LOFO · Jazeera University · ${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())}`);
  return lines;
}

function useCountUp(target, duration = 900) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return undefined;
    }

    let startTime;
    let raf;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  return now;
}

function useRotatingLines(lines, intervalMs = 4800) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lines.length <= 1) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % lines.length), intervalMs);
    return () => clearInterval(t);
  }, [lines.length, intervalMs]);

  return lines[index] || lines[0] || '';
}

const QUICK_ACTIONS = [
  {
    href: '/admin/my-items',
    label: 'My Items',
    hint: 'View your posts',
    icon: Package,
    tone: 'from-[#2563EB] to-[#1D4ED8]',
    shadow: 'shadow-blue-500/25',
  },
  {
    href: '/admin/lost',
    label: 'Report Lost',
    hint: 'Create lost report',
    icon: Plus,
    tone: 'from-rose-500 to-red-600',
    shadow: 'shadow-red-500/20',
  },
  {
    href: '/admin/secure-found',
    label: 'Secure Lost',
    hint: 'Post secure lost hold',
    icon: Shield,
    tone: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/25',
  },
  {
    href: '/admin/change-password',
    label: 'Security',
    hint: 'Update password',
    icon: KeyRound,
    tone: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/20',
  },
];

function ActivityThumb({ item }) {
  const isSecure = isSecureListing(item);
  const name = item.displayName || item.itemName || item.item_name;
  const category = item.displayCategory || item.category;

  if (isSecure || !item.imageUrl) {
    const PlaceholderIcon = getItemPlaceholderIcon(name, category);
    return (
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-2 ${
          isSecure
            ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 ring-amber-200/80'
            : 'bg-slate-100 text-slate-500 ring-white/80'
        }`}
      >
        <PlaceholderIcon size={22} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/90 shadow-md">
      <SafeRemoteImage src={item.imageUrl} alt={name} fill className="object-cover" sizes="56px" />
    </div>
  );
}

function ActivityRow({ item }) {
  const meta = getInventoryCardMeta(item);

  return (
    <li className="group flex items-center gap-4 rounded-[22px] border border-white/70 bg-white/50 p-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/75 hover:shadow-[0_16px_40px_rgba(26,86,219,0.1)]">
      <ActivityThumb item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-black text-slate-950">{item.displayName}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.badge.className}`}>
            {meta.badge.label}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {item.displayCategory} · {item.displayLocation}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Calendar size={11} />
          {formatDate(item.reportedAt)}
        </p>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1A56DB]"
      />
    </li>
  );
}

function QuickActionCard({ action }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className="group flex items-center gap-3 rounded-[22px] border border-white/75 bg-white/55 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/85 hover:shadow-[0_18px_44px_rgba(26,86,219,0.12)]"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${action.tone} ${action.shadow}`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-950">{action.label}</p>
        <p className="text-xs font-semibold text-slate-500">{action.hint}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1A56DB]" />
    </Link>
  );
}

export default function ProfileClient() {
  const { session, logout } = useSession();
  const { setActions, clearActions } = useAdminHeaderActions();
  const { data, refresh } = useBackgroundFetch('admin:items', fetchAllInventoryItems, { fallback: [] });
  const [sparkPlayKey, setSparkPlayKey] = useState(0);

  const allItems = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const myItems = useMemo(() => allItems.filter((item) => isAdminCreatedItem(item, session)), [allItems, session]);

  const counts = useMemo(() => {
    return myItems.reduce(
      (acc, item) => {
        const meta = getInventoryCardMeta(item);
        return {
          total: acc.total + 1,
          lost:
            acc.lost +
            (meta.filterStatus === 'lost' || meta.filterStatus === 'found' ? 1 : 0),
          secure: acc.secure + (meta.filterStatus === 'secure' ? 1 : 0),
          withPhoto: acc.withPhoto + (item.imageUrl ? 1 : 0),
        };
      },
      { total: 0, lost: 0, secure: 0, withPhoto: 0 }
    );
  }, [myItems]);

  const sparklines = useMemo(() => buildMyItemsPageSparklines(myItems), [myItems]);
  const recent = useMemo(
    () =>
      [...myItems].sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0)).slice(0, 5),
    [myItems]
  );

  const adminName = session?.userName || 'JU System Admin';
  const adminEmail = session?.email || 'admin@ju.edu.so';
  const adminId = session?.studentId || 'ADMIN';
  const photoRate = counts.total ? Math.round((counts.withPhoto / counts.total) * 100) : 0;

  const greeting = getTimeGreeting();
  const statusLines = useMemo(
    () => buildStatusLines(counts, adminName, photoRate),
    [counts, adminName, photoRate]
  );
  const statusLine = useRotatingLines(statusLines);
  const animatedPosts = useCountUp(counts.total);
  const animatedPhotoRate = useCountUp(photoRate);
  const liveNow = useLiveClock();
  const liveTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(liveNow);
  const liveDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(liveNow);

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
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200/70 bg-red-50/80 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh, logout]);

  return (
    <div className="space-y-5 pb-2">
      {/* Hero */}
      <section className="profile-hero relative overflow-hidden rounded-[32px] border border-white/60 p-6 sm:p-8">
        <div className="profile-hero-orb profile-hero-orb-a" aria-hidden />
        <div className="profile-hero-orb profile-hero-orb-b" aria-hidden />
        <div className="profile-hero-grid" aria-hidden />
        <div className="profile-hero-shimmer" aria-hidden />

        <div className="profile-hero-enter relative z-[1] flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 text-center sm:text-left">
            <p className="inline-flex items-center justify-center gap-2 text-sm font-bold text-blue-100/90 sm:justify-start">
              <span aria-hidden>{greeting.emoji}</span>
              <span>{greeting.so}</span>
              <span className="text-blue-200/60">·</span>
              <span className="font-semibold text-blue-100/75">{greeting.en}, {firstName(adminName)}</span>
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-[2rem]">{adminName}</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 backdrop-blur-sm">
                <ShieldCheck size={12} />
                Verified Admin
              </span>
            </div>

            <p
              key={statusLine}
              className="profile-status-fade mt-3 max-w-xl text-sm font-medium leading-relaxed text-blue-50/90"
            >
              {statusLine}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-100/95 sm:justify-start">
                <Mail size={15} className="shrink-0 text-blue-200" />
                <a href={`mailto:${adminEmail}`} className="transition hover:text-white hover:underline">
                  {adminEmail}
                </a>
              </p>
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-100/90 sm:justify-start">
                <ShieldCheck size={15} className="shrink-0 text-blue-200" />
                ID · {adminId}
              </p>
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-100/90 sm:justify-start">
                <MapPin size={15} className="shrink-0 text-blue-200" />
                Jazeera University Campus
                <span className="text-blue-200/50">·</span>
                <span className="profile-live-clock text-xs font-bold uppercase tracking-wide text-blue-200/80">
                  {liveTime} · {liveDate}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:items-end">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              <span className="profile-stat-pill rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white backdrop-blur-md">
                <span className="tabular-nums">{animatedPosts}</span> posts
              </span>
              <span className="profile-stat-pill rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white backdrop-blur-md">
                <span className="tabular-nums">{animatedPhotoRate}%</span> with photo
              </span>
              {counts.secure > 0 ? (
                <span className="profile-stat-pill rounded-full border border-amber-300/30 bg-amber-400/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-50 backdrop-blur-md">
                  {counts.secure} secure
                </span>
              ) : null}
            </div>
            <Link
              href="/admin/my-items"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#1D4ED8] shadow-[0_16px_40px_rgba(15,23,42,0.2)] transition hover:scale-[1.03] hover:bg-blue-50 active:scale-[0.98]"
            >
              <Package size={17} className="transition group-hover:rotate-[-8deg]" />
              Open My Items
              <TrendingUp size={15} className="text-emerald-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="package"
          value={counts.total}
          label="Total Posted"
          trendLabel={`${counts.lost} lost · ${counts.secure} secure`}
          subLabel="Your campus reports"
          sparkData={sparklines.total}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="shield"
          value={counts.secure}
          label="Secure"
          trendLabel="High-value holds"
          sparkData={sparklines.found}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="alert"
          value={counts.lost}
          label="Lost Reports"
          trendLabel="Campus lost entries"
          sparkData={sparklines.lost}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          icon="laptop"
          value={counts.secure || counts.withPhoto}
          label={counts.secure > 0 ? 'Secure Holds' : 'With Photo'}
          trendLabel={counts.secure > 0 ? 'Security notices' : `${photoRate}% visual proof`}
          sparkData={counts.secure > 0 ? sparklines.secure : sparklines.withPhoto}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Quick actions */}
        <section className="glass-card rounded-[28px] p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-black text-slate-950">Quick Actions</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Jump straight into your most used admin tools.</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard key={action.href} action={action} />
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section className="glass-card rounded-[28px] p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Recent Activity</h3>
              <p className="mt-0.5 text-sm font-medium text-slate-500">Your latest lost & found posts on campus.</p>
            </div>
            <Link
              href="/admin/my-items"
              className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-xs font-black text-[#1A56DB] transition hover:bg-blue-100"
            >
              View all
              <ChevronRight size={14} />
            </Link>
          </div>

          {recent.length > 0 ? (
            <ul className="space-y-2.5">
              {recent.map((item) => (
                <Link key={`${item.itemType}-${item.id}`} href="/admin/my-items" className="block">
                  <ActivityRow item={item} />
                </Link>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 bg-gradient-to-br from-slate-50/80 to-white/40 p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                <Sparkles size={28} />
              </div>
              <p className="text-lg font-black text-slate-900">No activity yet</p>
              <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
                Start by reporting a lost item — your activity timeline will light up here.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href="/admin/lost"
                  className="rounded-2xl bg-[#1A56DB] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF]"
                >
                  Report Lost
                </Link>
                <Link
                  href="/admin/secure-found"
                  className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-white"
                >
                  Secure Lost
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
