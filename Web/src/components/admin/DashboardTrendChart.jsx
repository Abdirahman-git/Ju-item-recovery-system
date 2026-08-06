'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { computeSourcePeriodStats } from '@/lib/claimsTimeline';

const TEAL = '#0D9488';
const ORANGE = '#F97316';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-slate-900">{row?.rangeLabel || row?.label}</p>
      <div className="mt-1.5 space-y-1 text-xs font-semibold">
        <p className="flex justify-between gap-6 text-teal-600">
          <span>Found</span>
          <span>{row?.primary ?? 0}</span>
        </p>
        <p className="flex justify-between gap-6 text-orange-500">
          <span>Lost</span>
          <span>{row?.secondary ?? 0}</span>
        </p>
      </div>
    </div>
  );
}

export default function DashboardTrendChart({ trendRows = [] }) {
  const stats = useMemo(
    () => computeSourcePeriodStats(trendRows, 'inventory', 'weekly'),
    [trendRows]
  );

  const yMax = useMemo(() => {
    const peak = Math.max(...stats.timeline.map((row) => Math.max(row.primary, row.secondary)), 1);
    return Math.max(peak + 1, 4);
  }, [stats.timeline]);

  return (
    <section className="glass-card flex h-full min-h-[320px] flex-col overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <TrendingUp size={16} />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Campus Activity Pulse</h3>
          </div>
          <p className="text-xs font-medium text-slate-500">Found vs lost reports — last 7 days</p>
        </div>
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1A56DB] hover:underline"
        >
          Full analytics
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <MiniStat
          label="Found"
          value={stats.primary}
          trend={stats.primaryTrend}
          color="teal"
        />
        <MiniStat
          label="Lost"
          value={stats.secondary}
          trend={stats.secondaryTrend}
          color="orange"
        />
      </div>

      <div className="dashboard-chart-grow min-h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.timeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="dashFoundFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="dashLostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.28} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, yMax]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="primary"
              stroke={TEAL}
              strokeWidth={2.5}
              fill="url(#dashFoundFill)"
              dot={{ r: 3, fill: TEAL, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: TEAL, stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="secondary"
              stroke={ORANGE}
              strokeWidth={2.5}
              fill="url(#dashLostFill)"
              dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: ORANGE, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MiniStat({ label, value, trend, color }) {
  const positive = trend >= 0;
  const tone = color === 'teal' ? 'text-teal-600 bg-teal-50' : 'text-orange-600 bg-orange-50';

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-2xl font-black text-slate-900">{value}</span>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
            positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}
        >
          {positive ? '+' : ''}
          {trend}%
        </span>
      </div>
      <p className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>
        vs last week
      </p>
    </div>
  );
}
