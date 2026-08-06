'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { buildMonthlyReturnPerformance } from '@/lib/returnedAnalytics';

function useCountUp(target, duration = 700, active = true) {
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
    const totalFrames = Math.max(18, Math.round(duration / 16));
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

function useReveal(threshold = 0.15) {
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

function MiniBars({ buckets, peak, active }) {
  const maxHeight = 72;

  return (
    <div className={`return-mini-bars grid grid-cols-6 items-end gap-2 sm:gap-3 ${active ? 'return-trends-bars-active' : ''}`}>
      {buckets.map((bucket, index) => {
        const ratio = peak > 0 ? bucket.total / peak : 0;
        const barHeight = bucket.total > 0 ? Math.max(14, Math.round(ratio * maxHeight)) : 6;
        const isCurrent = index === buckets.length - 1;
        const hasData = bucket.total > 0;

        return (
          <div
            key={bucket.key}
            className="return-trends-col group flex min-w-0 flex-1 flex-col items-center gap-1"
            style={{ animationDelay: `${120 + index * 90}ms` }}
            title={`${bucket.rangeLabel}: ${bucket.total} return${bucket.total === 1 ? '' : 's'}`}
          >
            <span
              className={`return-trends-count text-[10px] font-black tabular-nums ${
                hasData ? 'text-slate-600' : 'text-slate-300'
              } ${hasData ? 'group-hover:scale-110 group-hover:text-[#1A56DB]' : ''}`}
              style={{ animationDelay: `${220 + index * 90}ms` }}
            >
              {bucket.total}
            </span>
            <div className="flex h-[72px] w-full items-end">
              <div
                className={`return-mini-bar relative mx-auto w-full max-w-[3.5rem] overflow-hidden rounded-t-md transition-transform duration-300 sm:max-w-[4.5rem] sm:rounded-t-lg lg:max-w-[5.5rem] ${
                  isCurrent
                    ? 'return-mini-bar-current bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.35)]'
                    : hasData
                      ? 'bg-gradient-to-t from-[#1A56DB] to-blue-400 shadow-[0_4px_10px_rgba(26,86,219,0.22)] group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_16px_rgba(26,86,219,0.28)]'
                      : 'bg-slate-200/80'
                } ${active ? 'return-mini-bar-animate' : ''}`}
                style={{
                  height: `${barHeight}px`,
                  animationDelay: `${160 + index * 90}ms`,
                }}
              >
                {hasData && bucket.found > 0 ? (
                  <span
                    className="return-trends-fill absolute bottom-0 left-0 right-0 bg-white/25"
                    style={{
                      height: `${Math.round((bucket.found / bucket.total) * 100)}%`,
                      animationDelay: `${360 + index * 90}ms`,
                    }}
                  />
                ) : null}
                {isCurrent && hasData ? <span className="return-trends-shimmer pointer-events-none absolute inset-0" /> : null}
              </div>
            </div>
            <span
              className={`return-trends-label text-[9px] font-black uppercase tracking-wide sm:text-[10px] ${
                isCurrent ? 'text-emerald-600' : 'text-slate-400'
              }`}
              style={{ animationDelay: `${280 + index * 90}ms` }}
            >
              {bucket.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyReturnPerformance({ items = [] }) {
  const { ref, visible } = useReveal();
  const stats = useMemo(() => buildMonthlyReturnPerformance(items), [items]);
  const animatedTotal = useCountUp(stats.total, 800, visible);
  const positiveTrend = stats.trend >= 0;
  const monthsWithData = stats.buckets.filter((bucket) => bucket.total > 0).length;

  return (
    <section ref={ref} className="w-full">
      <div className={`return-trends-card glass-card w-full rounded-[24px] p-4 sm:p-5 ${visible ? 'return-trends-card-visible' : ''}`}>
        <div className="return-trends-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="return-trends-title text-sm font-black text-slate-900 sm:text-base">Return trends</h2>
              <span className="return-trends-live inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <p className="return-trends-subtitle mt-0.5 text-[11px] font-medium leading-snug text-slate-500">
              {stats.total === 0
                ? 'No archived reunions yet — completed returns show up here.'
                : `${animatedTotal} reunion${stats.total === 1 ? '' : 's'} across ${monthsWithData} active month${monthsWithData === 1 ? '' : 's'}.`}
            </p>
          </div>

          <div className="return-trends-stat shrink-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-xl font-black leading-none text-slate-950">{animatedTotal}</p>
            <span
              className={`return-trends-trend mt-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                positiveTrend ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}
            >
              {positiveTrend ? <TrendingUp size={10} className="return-trends-trend-icon" /> : <TrendingDown size={10} className="return-trends-trend-icon" />}
              {Math.abs(stats.trend)}%
            </span>
          </div>
        </div>

        <div className={`return-trends-chart mt-3 w-full rounded-xl bg-slate-50/80 px-2 py-3 sm:px-4 ${visible ? 'return-trends-chart-visible' : ''}`}>
          <MiniBars buckets={stats.buckets} peak={stats.peak} active={visible} />
        </div>

        <div className="return-trends-footer mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="return-trends-legend inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#1A56DB]" />
              Past months
            </span>
            <span className="return-trends-legend inline-flex items-center gap-1" style={{ animationDelay: '80ms' }}>
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              This month
            </span>
          </div>
          <span className="return-trends-meta text-slate-400">
            {stats.currentMonth} this month · {stats.buckets[stats.buckets.length - 1]?.label}
          </span>
        </div>
      </div>
    </section>
  );
}
