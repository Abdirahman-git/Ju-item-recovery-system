'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { buildValidationTrend } from '@/lib/pendingAnalytics';

const TEAL = '#0D9488';
const ORANGE = '#F97316';
const CHART_H = 168;

function useCountUp(target, duration = 600, active = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return undefined;
    }
    if (target <= 0) {
      setValue(0);
      return undefined;
    }

    let frame = 0;
    const totalFrames = Math.max(14, Math.round(duration / 16));
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (frame >= totalFrames) {
        setValue(target);
        window.clearInterval(timer);
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [target, duration, active]);

  return value;
}

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reveal = () => setVisible(true);
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      reveal();
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function TrendBadge({ value, compact = false }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded font-bold ${
        compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'
      } ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
    >
      {positive ? <ArrowUpRight size={9} strokeWidth={2.5} /> : <ArrowDownRight size={9} strokeWidth={2.5} />}
      {Math.abs(value)}%
    </span>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-lg">
      <p className="text-[11px] font-bold text-slate-900">{row?.rangeLabel}</p>
      <div className="mt-1 flex gap-4 text-[10px] font-semibold">
        <span className="text-teal-600">Found {row?.primary ?? 0}</span>
        <span className="text-orange-500">Lost {row?.secondary ?? 0}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, trend, icon: Icon, tone }) {
  const tones = {
    teal: 'text-teal-600 bg-teal-50 border-teal-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
  };

  return (
    <div className="validation-trend-insight flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-slate-900">{value}</span>
          <TrendBadge value={trend} compact />
        </div>
      </div>
    </div>
  );
}

function SparkBars({ days, peak, active }) {
  return (
    <div className={`validation-trend-bars flex items-end gap-1 ${active ? 'validation-trend-bars-active' : ''}`}>
      {days.map((day, index) => {
        const h = day.total > 0 ? Math.max(6, Math.round((day.total / peak) * 28)) : 3;
        return (
          <div
            key={day.key}
            className="validation-trend-col flex flex-1 flex-col items-center gap-0.5"
            style={{ animationDelay: `${80 + index * 40}ms` }}
            title={`${day.rangeLabel}: ${day.total}`}
          >
            <span className="text-[8px] font-bold tabular-nums text-slate-400">{day.total || ''}</span>
            <div
              className={`validation-trend-stack w-full max-w-[18px] overflow-hidden rounded-t-md ${
                day.isToday ? 'ring-1 ring-[#1A56DB]/40' : ''
              }`}
              style={{ height: `${h}px` }}
            >
              {day.found > 0 ? (
                <div
                  className="w-full bg-teal-500"
                  style={{ height: `${Math.round((day.found / day.total) * h)}px` }}
                />
              ) : null}
              {day.lost > 0 ? (
                <div
                  className="w-full bg-orange-500"
                  style={{ height: `${Math.round((day.lost / day.total) * h)}px` }}
                />
              ) : null}
              {day.total === 0 ? <div className="h-full w-full bg-slate-200/80" /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ValidationTrendsPanel({ reports = [] }) {
  const { ref, visible } = useReveal();
  const stats = useMemo(() => buildValidationTrend(reports), [reports]);
  const animatedTotal = useCountUp(stats.total, 600, visible);
  const animatedFound = useCountUp(stats.foundTotal, 600, visible);
  const animatedLost = useCountUp(stats.lostTotal, 600, visible);
  const [hoverDay, setHoverDay] = useState(null);

  const yMax = useMemo(() => {
    const peak = Math.max(...stats.timeline.map((row) => Math.max(row.primary, row.secondary)), 1);
    return Math.max(peak + 1, 3);
  }, [stats.timeline]);

  const peakLabel =
    stats.busiestDay?.total > 0
      ? `${stats.busiestDay.label} (${stats.busiestDay.total})`
      : 'No peak';

  const activeDay = hoverDay || stats.timeline.find((d) => d.isToday) || stats.timeline[stats.timeline.length - 1];

  return (
    <section ref={ref} className="w-full">
      <div
        className={`validation-trends-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_2px_16px_rgba(15,23,42,0.04)] sm:p-4 ${
          visible ? 'validation-trends-card-visible' : ''
        }`}
      >
        {/* Compact header — single row */}
        <div className="validation-trends-header mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="validation-trends-title m-0 text-sm font-bold text-slate-900 sm:text-base">
              Validation Trends
            </h4>
            <span className="validation-trends-live inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <CalendarDays size={11} />
              Weekly
            </span>
            <span className="hidden text-[10px] text-slate-400 sm:inline">
              {stats.total === 0 ? 'Queue quiet' : `${stats.activeDays} active days`}
            </span>
          </div>

          <div className="validation-trends-stat flex items-center gap-2 rounded-lg border border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-2.5 py-1.5">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">This week</p>
              <p className="text-xl font-black leading-none text-slate-950">{animatedTotal}</p>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden gap-2 sm:flex">
              <span className="text-[10px] font-bold text-teal-600">F {animatedFound}</span>
              <span className="text-[10px] font-bold text-orange-500">L {animatedLost}</span>
            </div>
          </div>
        </div>

        {/* Main grid — chart + side stats */}
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div
            className={`validation-trends-chart relative rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white ${
              visible ? 'validation-trends-chart-visible' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-2.5 pt-2">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Found {animatedFound}
                  <TrendBadge value={stats.foundTrend} compact />
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Lost {animatedLost}
                  <TrendBadge value={stats.lostTrend} compact />
                </span>
              </div>
              {activeDay ? (
                <span className="truncate text-[10px] font-bold text-[#1A56DB]">
                  {activeDay.rangeLabel}: {activeDay.total}
                </span>
              ) : null}
            </div>

            {stats.total === 0 ? (
              <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center gap-2 px-3">
                <Sparkles size={14} className="text-[#1A56DB]" />
                <p className="text-[11px] font-semibold text-slate-500">No submissions yet this week</p>
              </div>
            ) : null}

            <ResponsiveContainer width="100%" height={CHART_H}>
              <AreaChart
                key={stats.total}
                data={stats.timeline}
                margin={{ top: 6, right: 4, left: -16, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state?.activePayload?.[0]?.payload) {
                    setHoverDay(state.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoverDay(null)}
              >
                <defs>
                  <linearGradient id="validationFoundFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="validationLostFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ORANGE} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, yMax]}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={22}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="primary"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#validationFoundFill)"
                  dot={{ r: 2, fill: TEAL, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: TEAL, stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={800}
                />
                <Area
                  type="monotone"
                  dataKey="secondary"
                  stroke={ORANGE}
                  strokeWidth={2}
                  fill="url(#validationLostFill)"
                  dot={{ r: 2, fill: ORANGE, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: ORANGE, stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={950}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="border-t border-slate-100 px-2.5 py-2">
              <SparkBars days={stats.days} peak={stats.peak} active={visible} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <MiniStat
              label="Found"
              value={animatedFound}
              trend={stats.foundTrend}
              icon={CheckCircle2}
              tone="teal"
            />
            <MiniStat
              label="Lost"
              value={animatedLost}
              trend={stats.lostTrend}
              icon={ClipboardList}
              tone="orange"
            />
            <MiniStat
              label="Busiest"
              value={stats.busiestDay?.total > 0 ? stats.busiestDay.label : '—'}
              trend={stats.totalTrend}
              icon={CalendarDays}
              tone="amber"
            />
          </div>
        </div>

        <p className="validation-trends-footer mt-2 text-[10px] font-medium text-slate-400">
          {stats.total > 0
            ? `Tip: ${peakLabel} — review peak days first.`
            : 'Trends update live when new pending reports arrive.'}
        </p>
      </div>
    </section>
  );
}
