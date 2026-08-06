'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers, Package, Sparkles } from 'lucide-react';

const BAR_GRADIENTS = [
  'from-[#1A56DB] to-[#60A5FA]',
  'from-orange-500 to-amber-400',
  'from-cyan-500 to-sky-300',
  'from-pink-500 to-rose-300',
  'from-violet-500 to-purple-300',
  'from-teal-500 to-emerald-300',
  'from-indigo-500 to-blue-300',
  'from-fuchsia-500 to-pink-300',
];

function useRevealBars(active) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!active) {
      setReady(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setReady(true), 40);
    return () => window.clearTimeout(timer);
  }, [active]);
  return ready;
}

export default function CategoriesBreakdownPanel({
  categories = [],
  title = 'Items by Category',
  subtitle = 'All campus inventory',
  onViewAll,
  totalItems = 0,
}) {
  const barsReady = useRevealBars(categories.length > 0);
  const maxCount = useMemo(() => Math.max(...categories.map((row) => row.count), 1), [categories]);
  const categoryCount = categories.length;
  const topCategory = categories[0] || null;
  const sumShown = categories.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="m-0 text-lg font-bold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-[#1A56DB] hover:underline"
          >
            All items
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
        <div className="space-y-3.5">
          {categories.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-16 text-center">
              <Layers size={28} className="mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No category data</p>
              <p className="mt-1 text-xs text-slate-400">Change the data source or filters to see a breakdown.</p>
            </div>
          ) : (
            categories.map((row, index) => {
              const pct = Math.max(Math.round((row.count / maxCount) * 100), 12);
              const share = sumShown > 0 ? Math.round((row.count / sumShown) * 100) : 0;
              const gradient = BAR_GRADIENTS[index % BAR_GRADIENTS.length];

              return (
                <div key={row.name} className="group">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-700">{row.name}</span>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">{share}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-9 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`category-bar-fill relative flex h-full items-center rounded-full bg-gradient-to-r ${gradient} px-2.5 transition-[width] duration-700 ease-out`}
                        style={{ width: barsReady ? `${pct}%` : '0%' }}
                      >
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800 shadow-sm">
                          {row.count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB]">
                <Package size={15} />
              </div>
              <p className="text-lg font-black leading-none text-slate-900">{totalItems.toLocaleString()}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Items</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <Layers size={15} />
              </div>
              <p className="text-lg font-black leading-none text-slate-900">{categoryCount}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Categories</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Sparkles size={15} />
              </div>
              <p className="truncate px-1 text-sm font-black leading-tight text-slate-900" title={topCategory?.name}>
                {topCategory?.name || '—'}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Top · {topCategory?.count ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
