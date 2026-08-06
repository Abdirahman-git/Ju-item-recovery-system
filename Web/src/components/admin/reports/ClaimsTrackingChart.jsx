'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';
import { TRACK_PERIODS, computeSourcePeriodStats } from '@/lib/claimsTimeline';

/** Template Sales & Purchase palette */
const TEAL = '#0D9488';
const ORANGE = '#F97316';

function SolidTrendBadge({ value }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${
        positive ? 'bg-emerald-600' : 'bg-red-500'
      }`}
    >
      {positive ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
      {Math.abs(value)}%
    </span>
  );
}

function SoftTrendBadge({ value }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
      }`}
    >
      {Math.abs(value)}%
      {positive ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
    </span>
  );
}

function ChartTooltip({ active, payload, label, primaryLabel, secondaryLabel }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{row?.rangeLabel || label}</p>
      <div className="mt-1.5 space-y-1 text-xs font-medium">
        <p className="flex justify-between gap-6" style={{ color: TEAL }}>
          <span>{primaryLabel}</span>
          <span>{row?.primary ?? 0}</span>
        </p>
        <p className="flex justify-between gap-6" style={{ color: ORANGE }}>
          <span>{secondaryLabel}</span>
          <span>{row?.secondary ?? 0}</span>
        </p>
      </div>
    </div>
  );
}

/** Matches template Last Week Statistics cards */
function TemplateStatCard({ title, value, trend, fromLabel, tone }) {
  const isTeal = tone === 'teal';
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5">
      <div className="min-w-0">
        <p className="mb-1 text-sm font-bold text-slate-900">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-slate-800">{value}</span>
          <SoftTrendBadge value={trend} />
          <span className="text-xs text-slate-500">{fromLabel}</span>
        </div>
      </div>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
          isTeal ? 'bg-teal-500' : 'bg-orange-500'
        }`}
      >
        {isTeal ? <TrendingUp size={20} /> : <CheckCircle2 size={20} />}
      </div>
    </div>
  );
}

export default function ClaimsTrackingChart({
  rows = [],
  claims,
  sourceId = 'inventory',
  sourceLabel,
}) {
  const dataRows = Array.isArray(rows) ? rows : Array.isArray(claims) ? claims : [];
  const [period, setPeriod] = useState('weekly');
  const [periodOpen, setPeriodOpen] = useState(false);

  const stats = useMemo(
    () => computeSourcePeriodStats(dataRows, sourceId, period),
    [dataRows, sourceId, period]
  );

  const selectedPeriod = TRACK_PERIODS.find((row) => row.id === period) || TRACK_PERIODS[0];
  const title = sourceLabel || stats.title;

  const yMax = useMemo(() => {
    const peak = Math.max(...stats.timeline.map((row) => Math.max(row.primary, row.secondary)), 1);
    return Math.max(peak + 1, 4);
  }, [stats.timeline]);

  const fromLabel =
    period === 'weekly' ? 'From Last Week' : period === 'monthly' ? 'From Last Month' : 'From Last Period';

  const statsHeading =
    period === 'weekly' ? 'Last Week Statistics' : period === 'monthly' ? 'Last Month Statistics' : 'Period Statistics';

  const gidA = `tpl-primary-${sourceId}`;
  const gidB = `tpl-secondary-${sourceId}`;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      {/* Template row 1: title + weekly dropdown only */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="m-0 text-lg font-bold text-slate-900">{title}</h4>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPeriodOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <CalendarDays size={15} className="text-slate-500" />
            {selectedPeriod.label}
            <ChevronDown size={14} className={`text-slate-400 transition ${periodOpen ? 'rotate-180' : ''}`} />
          </button>
          {periodOpen ? (
            <>
              <button type="button" className="fixed inset-0 z-30" aria-label="Close" onClick={() => setPeriodOpen(false)} />
              <ul className="absolute right-0 z-40 mt-1.5 min-w-[140px] list-none overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                {TRACK_PERIODS.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriod(option.id);
                        setPeriodOpen(false);
                      }}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                        option.id === period ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      {/* Template row 2: metrics left + legend right */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="text-sm font-normal text-slate-500">{stats.primaryLabel}</span>
              {stats.primary.toLocaleString()}
            </h5>
            <SolidTrendBadge value={stats.primaryTrend} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="text-sm font-normal text-slate-500">{stats.secondaryLabel}</span>
              {stats.secondary.toLocaleString()}
            </h5>
            <SolidTrendBadge value={stats.secondaryTrend} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ORANGE }} />
            {stats.secondaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TEAL }} />
            {stats.primaryLabel}
          </span>
        </div>
      </div>

      {/* Chart — template dual area */}
      <div className="claims-chart-wrap min-h-[240px] w-full flex-1">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart key={`${sourceId}-${period}`} data={stats.timeline} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={gidA} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity={0.32} />
                <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={gidB} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.28} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              domain={[0, yMax]}
              tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              content={
                <ChartTooltip primaryLabel={stats.primaryLabel} secondaryLabel={stats.secondaryLabel} />
              }
              cursor={{ stroke: '#D1D5DB', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="primary"
              stroke={TEAL}
              strokeWidth={2.5}
              fill={`url(#${gidA})`}
              dot={false}
              activeDot={{ r: 6, fill: TEAL, stroke: '#fff', strokeWidth: 2 }}
              animationDuration={1100}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="secondary"
              stroke={ORANGE}
              strokeWidth={2.5}
              fill={`url(#${gidB})`}
              dot={false}
              activeDot={{ r: 6, fill: ORANGE, stroke: '#fff', strokeWidth: 2 }}
              animationDuration={1300}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Template: Last Week Statistics */}
      <h6 className="mb-2 mt-4 text-sm font-semibold text-slate-800">{statsHeading}</h6>
      <div className="grid gap-4 sm:grid-cols-2">
        <TemplateStatCard
          title={stats.primaryLabel}
          value={stats.primary.toLocaleString()}
          trend={stats.primaryTrend}
          fromLabel={fromLabel}
          tone="teal"
        />
        <TemplateStatCard
          title={stats.secondaryLabel}
          value={stats.secondary.toLocaleString()}
          trend={stats.secondaryTrend}
          fromLabel={fromLabel}
          tone="orange"
        />
      </div>
    </section>
  );
}
