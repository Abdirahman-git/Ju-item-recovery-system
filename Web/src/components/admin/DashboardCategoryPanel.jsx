'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, Package } from 'lucide-react';

const BAR_GRADIENTS = [
  'from-[#1A56DB] to-[#60A5FA]',
  'from-orange-500 to-amber-400',
  'from-cyan-500 to-sky-300',
  'from-violet-500 to-purple-300',
  'from-teal-500 to-emerald-300',
  'from-pink-500 to-rose-300',
];

export default function DashboardCategoryPanel({ categories = [], totalItems = 0 }) {
  const [ready, setReady] = useState(false);
  const maxCount = useMemo(() => Math.max(...categories.map((row) => row.count), 1), [categories]);
  const topCategory = categories[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(timer);
  }, [categories]);

  return (
    <section className="glass-card flex h-full min-h-[320px] flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <Layers size={16} />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Top Categories</h3>
          </div>
          <p className="text-xs font-medium text-slate-500">Most reported item types on campus</p>
        </div>
        <Link href="/admin/items" className="text-xs font-bold text-[#1A56DB] hover:underline">
          View all
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <FooterStat icon={Package} label="Items" value={totalItems} />
        <FooterStat icon={Layers} label="Categories" value={categories.length} />
        <FooterStat icon={Package} label="Top" value={topCategory?.name?.slice(0, 8) || '—'} small />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3.5">
        {categories.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
            <Layers size={26} className="mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No category data yet</p>
          </div>
        ) : (
          categories.map((row, index) => {
            const pct = Math.max(Math.round((row.count / maxCount) * 100), 10);
            const share = totalItems > 0 ? Math.round((row.count / totalItems) * 100) : 0;
            const gradient = BAR_GRADIENTS[index % BAR_GRADIENTS.length];

            return (
              <div key={row.name} className="group">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-700">{row.name}</span>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">
                    {row.count} · {share}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100/90">
                  <div
                    className={`dashboard-bar-fill h-full rounded-full bg-gradient-to-r ${gradient}`}
                    style={{ width: ready ? `${pct}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function FooterStat({ icon: Icon, label, value, small = false }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/60 px-2.5 py-2 text-center">
      <Icon size={14} className="mx-auto mb-1 text-slate-400" />
      <p className={`font-black text-slate-900 ${small ? 'truncate text-[11px]' : 'text-base'}`}>
        {value}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
