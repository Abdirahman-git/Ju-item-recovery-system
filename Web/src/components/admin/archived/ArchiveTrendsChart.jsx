'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Archive, TrendingUp } from 'lucide-react';

const AMBER = '#D97706';
const BLUE = '#3B82F6';
const EMERALD = '#10B981';

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
}

function buildArchiveTimeline(items = [], months = 6) {
  const now = new Date();
  const buckets = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.push({
      key,
      label: monthLabel(key),
      lost: 0,
      found: 0,
      total: 0,
    });
  }

  const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));

  items.forEach((item) => {
    const raw = item.archivedAt || item.archived_at;
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const key = monthKey(date);
    const idx = index[key];
    if (idx == null) return;
    const type = String(item.displayType || item.type || '').toUpperCase();
    if (type === 'FOUND') buckets[idx].found += 1;
    else buckets[idx].lost += 1;
    buckets[idx].total += 1;
  });

  return buckets;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-amber-200/70 bg-white px-3 py-2.5 shadow-lg">
      <p className="text-xs font-black text-slate-900">{row?.label}</p>
      <div className="mt-1.5 space-y-1 text-xs font-semibold">
        <p className="flex justify-between gap-8 text-blue-600">
          <span>Lost</span>
          <span>{row?.lost ?? 0}</span>
        </p>
        <p className="flex justify-between gap-8 text-emerald-600">
          <span>Found</span>
          <span>{row?.found ?? 0}</span>
        </p>
        <p className="flex justify-between gap-8 border-t border-slate-100 pt-1 text-amber-700">
          <span>Total</span>
          <span>{row?.total ?? 0}</span>
        </p>
      </div>
    </div>
  );
}

function CategoryBars({ items = [] }) {
  const rows = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const name = item.displayCategory || item.category || 'Other';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  const peak = Math.max(...rows.map((r) => r.count), 1);

  if (!rows.length) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center text-center">
        <Archive size={28} className="mb-2 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">No category data yet</p>
        <p className="mt-1 text-xs text-slate-400">Archive items to see the breakdown</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = Math.round((row.count / peak) * 100);
        return (
          <div key={row.name}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-bold text-slate-700">{row.name}</span>
              <span className="font-black tabular-nums text-amber-700">{row.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${Math.max(pct, 8)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ArchiveTrendsChart({ items = [] }) {
  const timeline = useMemo(() => buildArchiveTimeline(items, 6), [items]);
  const totals = useMemo(() => {
    const lost = items.filter((i) => String(i.displayType || '').toUpperCase() === 'LOST').length;
    const found = items.filter((i) => String(i.displayType || '').toUpperCase() === 'FOUND').length;
    const thisMonth = timeline[timeline.length - 1]?.total || 0;
    const prevMonth = timeline[timeline.length - 2]?.total || 0;
    const delta = thisMonth - prevMonth;
    return { lost, found, thisMonth, delta };
  }, [items, timeline]);

  const yMax = useMemo(() => {
    const peak = Math.max(...timeline.map((row) => Math.max(row.lost, row.found, row.total)), 1);
    return Math.max(peak + 1, 4);
  }, [timeline]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.55fr_0.95fr]">
      <section className="glass-card flex min-h-[340px] flex-col overflow-hidden p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <TrendingUp size={16} />
              </div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">Archive activity</h3>
            </div>
            <p className="text-xs font-medium text-slate-500">Lost vs found items archived — last 6 months</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
              Lost {totals.lost}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
              Found {totals.found}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
              This month {totals.thisMonth}
              {totals.delta !== 0 ? ` (${totals.delta > 0 ? '+' : ''}${totals.delta})` : ''}
            </span>
          </div>
        </div>

        <div className="min-h-[220px] flex-1">
          {items.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <Archive size={26} />
              </div>
              <p className="text-sm font-bold text-slate-600">No archive chart data yet</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">
                When Super Admin moves stale items here, monthly trends will appear on this chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timeline} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="archiveLostFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="archiveFoundFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EMERALD} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, yMax]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="lost" stroke={BLUE} strokeWidth={2.5} fill="url(#archiveLostFill)" name="Lost" />
                <Area type="monotone" dataKey="found" stroke={EMERALD} strokeWidth={2.5} fill="url(#archiveFoundFill)" name="Found" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Lost
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Found
          </span>
        </div>
      </section>

      <section className="glass-card flex min-h-[340px] flex-col p-5 sm:p-6">
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
              <Archive size={16} />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">By category</h3>
          </div>
          <p className="text-xs font-medium text-slate-500">Top archived categories in the vault</p>
        </div>

        <CategoryBars items={items} />

        {items.length > 0 ? (
          <div className="mt-auto pt-5">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={timeline.slice(-4)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill={AMBER} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quarterly volume
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
