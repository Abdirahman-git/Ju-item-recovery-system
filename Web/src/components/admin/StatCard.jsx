'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Clock,
  Laptop,
} from 'lucide-react';

const ICONS = {
  package: Package,
  alert: AlertTriangle,
  check: CheckCircle2,
  users: Users,
  clock: Clock,
  laptop: Laptop,
};

const STYLES = {
  package: {
    bg: 'bg-gradient-to-br from-blue-500/15 to-blue-600/5',
    icon: 'text-blue-600',
    ring: 'ring-blue-200/50',
    accent: 'from-blue-500 to-indigo-500',
    trend: 'text-emerald-600',
    spark: '#9333EA',
  },
  alert: {
    bg: 'bg-gradient-to-br from-red-500/15 to-red-600/5',
    icon: 'text-red-500',
    ring: 'ring-red-200/50',
    accent: 'from-red-500 to-rose-500',
    trend: 'text-red-500',
    spark: '#F97316',
  },
  check: {
    bg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-200/50',
    accent: 'from-emerald-500 to-teal-500',
    trend: 'text-emerald-600',
    spark: '#10B981',
  },
  users: {
    bg: 'bg-gradient-to-br from-slate-500/10 to-slate-600/5',
    icon: 'text-slate-600',
    ring: 'ring-slate-200/50',
    accent: 'from-slate-500 to-slate-600',
    trend: 'text-emerald-600',
    spark: '#EF4444',
  },
  clock: {
    bg: 'bg-gradient-to-br from-violet-500/15 to-violet-600/5',
    icon: 'text-violet-600',
    ring: 'ring-violet-200/50',
    accent: 'from-violet-500 to-purple-500',
    trend: 'text-violet-600',
    spark: '#8B5CF6',
  },
  laptop: {
    bg: 'bg-gradient-to-br from-orange-500/15 to-orange-600/5',
    icon: 'text-orange-500',
    ring: 'ring-orange-200/50',
    accent: 'from-orange-500 to-amber-500',
    trend: 'text-orange-600',
    spark: '#F97316',
  },
};

/** medicines.html Apex sparkline silhouettes — multi-peak smooth waves */
const MEDICINE_SHAPES = [
  [0.04, 0.06, 0.12, 0.42, 0.14, 0.2, 0.34, 0.58, 0.28, 0.16, 0.24, 0.4, 0.78, 0.32],
  [0.08, 0.14, 0.22, 0.38, 0.58, 0.82, 0.72, 0.52, 0.36, 0.32, 0.48, 0.68, 0.52, 0.38],
  [0.12, 0.1, 0.08, 0.1, 0.12, 0.14, 0.18, 0.24, 0.32, 0.48, 0.62, 0.78, 0.92, 0.68],
  [0.1, 0.18, 0.32, 0.52, 0.72, 0.86, 0.68, 0.42, 0.28, 0.4, 0.58, 0.46, 0.3, 0.18],
];

const SPARK_W = 88;
const SPARK_H = 40;
const SPARK_POINTS = 14;
const SNAKE_STAGGER_MS = 70;

function formatTrend(trend) {
  if (trend == null || trend === '') return null;
  if (typeof trend === 'number') {
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend}%`;
  }
  return trend;
}

function padWeek(data = []) {
  const week = [...data];
  while (week.length < 7) week.unshift(0);
  return week.slice(-7);
}

function upsampleLinear(values, targetLen) {
  if (values.length <= 1) return Array(targetLen).fill(values[0] || 0);
  const result = [];
  for (let i = 0; i < targetLen; i += 1) {
    const t = (i / (targetLen - 1)) * (values.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, values.length - 1);
    const frac = t - lo;
    result.push(values[lo] * (1 - frac) + values[hi] * frac);
  }
  return result;
}

function smoothSeries(values) {
  return values.map((v, i, arr) => {
    const prev = arr[i - 1] ?? v;
    const next = arr[i + 1] ?? v;
    return v * 0.55 + prev * 0.225 + next * 0.225;
  });
}

function buildSparkSeries(data = [], shapeIndex = 0) {
  const week = padWeek(data);
  const max = Math.max(...week, 0);
  const template = MEDICINE_SHAPES[shapeIndex % MEDICINE_SHAPES.length];

  if (max === 0) {
    return template.map((v) => v * 0.72);
  }

  const upsampled = smoothSeries(upsampleLinear(week, SPARK_POINTS));
  const peak = Math.max(...upsampled, 1);
  const normalized = upsampled.map((v) => 0.06 + (v / peak) * 0.82);

  return normalized.map((v, i) => v * 0.82 + template[i] * 0.18);
}

function buildSmoothPath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M ${coords[0][0]},${coords[0][1]}`;

  let d = `M ${coords[0][0].toFixed(2)},${coords[0][1].toFixed(2)}`;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }

  return d;
}

function buildSparkPaths(series) {
  const max = Math.max(...series, 0.001);
  const step = SPARK_W / Math.max(series.length - 1, 1);
  const baseline = SPARK_H - 3;

  const coords = series.map((v, i) => {
    const x = i * step;
    const ratio = v / max;
    const y = baseline - ratio * (SPARK_H - 12);
    return [x, y];
  });

  const linePath = buildSmoothPath(coords);
  const areaPath = `${linePath} L ${SPARK_W},${SPARK_H} L 0,${SPARK_H} Z`;
  const flat = series.every((v) => v <= 0.001);

  return { linePath, areaPath, flat };
}

function MiniSparkline({ data = [], color, id, shapeIndex = 0, playKey = 0 }) {
  const lineRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);

  const series = useMemo(() => buildSparkSeries(data, shapeIndex), [data, shapeIndex]);
  const { linePath, areaPath, flat } = useMemo(() => buildSparkPaths(series), [series]);

  useLayoutEffect(() => {
    if (lineRef.current) {
      setPathLen(lineRef.current.getTotalLength());
    }
  }, [linePath, playKey]);

  const snakeDelay = shapeIndex * SNAKE_STAGGER_MS;
  const animStyle = {
    '--spark-len': pathLen || 200,
    '--spark-delay': `${snakeDelay}ms`,
  };

  const flatLine = `M 0,${SPARK_H - 3} L ${SPARK_W},${SPARK_H - 3}`;

  return (
    <div
      className="pointer-events-none flex shrink-0 items-center justify-end self-center pe-0.5"
      style={animStyle}
    >
      <svg
        key={`spark-${playKey}-${id}`}
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        className="h-[38px] w-[82px]"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.42" />
            <stop offset="88%" stopColor={color} stopOpacity="0.06" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>

        {!flat ? (
          <g className="stat-spark-snake-group">
            <g className="stat-spark-area-reveal">
              <path d={areaPath} fill={`url(#${id}-fill)`} stroke="none" />
            </g>
            <path
              ref={lineRef}
              d={linePath}
              fill="none"
              stroke={`url(#${id}-line)`}
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stat-spark-line-draw"
            />
          </g>
        ) : (
          <path
            ref={lineRef}
            d={flatLine}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            opacity="0.32"
            className="stat-spark-line-draw"
          />
        )}
      </svg>
    </div>
  );
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  subLabel,
  urgent,
  href,
  onClick,
  active = false,
  compact = false,
  trendDirection,
  sparkData,
  sparkIndex = 0,
  playKey = 0,
}) {
  const Icon = ICONS[icon];
  const style = STYLES[icon] || STYLES.package;
  const trendText = formatTrend(trend);
  const isDown = trendDirection === 'down' || (typeof trend === 'number' && trend < 0);
  const sparkId = `kpi-spark-${icon}-${sparkIndex}-${playKey}`;

  const inner = (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.accent} opacity-80`}
      />
      <div className="flex items-stretch justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className={`flex items-start justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
            <div
              className={`flex items-center justify-center ring-1 ${style.ring} transition-colors ${style.bg} ${
                compact ? 'h-8 w-8 rounded-xl' : 'h-11 w-11 rounded-2xl'
              }`}
            >
              {Icon ? <Icon size={compact ? 15 : 22} className={style.icon} strokeWidth={compact ? 2.25 : 2} /> : null}
            </div>
            {urgent ? (
              <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-sm shadow-red-500/30">
                Urgent
              </span>
            ) : trendText ? (
              <span
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                  isDown ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {isDown ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                {trendText}
              </span>
            ) : null}
          </div>
          <p className={`font-black tracking-tight text-slate-950 ${compact ? 'text-xl leading-none' : 'text-3xl'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <div className={`flex items-end justify-between gap-1 ${compact ? 'mt-0.5' : 'mt-1'}`}>
            <div className="min-w-0">
              <p className={`font-bold text-slate-700 ${compact ? 'text-sm' : ''}`}>{label}</p>
              {trendLabel ? (
                <p className={`truncate text-slate-400 ${compact ? 'text-[9px] leading-tight' : 'text-xs'}`}>{trendLabel}</p>
              ) : null}
              {subLabel ? (
                <p className={`truncate text-slate-400/80 ${compact ? 'text-[9px] leading-tight' : 'text-[11px]'}`}>{subLabel}</p>
              ) : null}
            </div>
            {href ? (
              <ChevronRight
                size={compact ? 12 : 14}
                className="mb-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1A56DB]"
              />
            ) : null}
          </div>
        </div>
        {sparkData ? (
          <MiniSparkline
            data={sparkData}
            color={style.spark}
            id={sparkId}
            shapeIndex={sparkIndex}
            playKey={playKey}
          />
        ) : null}
      </div>
    </>
  );

  const className = `glass-kpi group relative block w-full overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)] active:scale-[0.99] ${
    compact ? 'glass-kpi--compact' : ''
  } ${
    active ? 'ring-2 ring-[#1A56DB]/35 shadow-[0_18px_40px_rgba(26,86,219,0.14)]' : ''
  } ${compact ? 'p-3 pe-1.5' : 'p-5 pe-3'}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}
