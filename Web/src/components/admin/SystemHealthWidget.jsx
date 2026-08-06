'use client';

import { useEffect, useState } from 'react';
import { Archive, CheckCircle2, Package } from 'lucide-react';

export default function SystemHealthWidget({
  recoveryRate = 0,
  recovered = 0,
  inVault = 0,
  lostCount = 0,
  foundCount = 0,
}) {
  const [animatedRate, setAnimatedRate] = useState(0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedRate / 100) * circumference;
  const total = lostCount + foundCount || recovered + inVault;

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimatedRate(recoveryRate), 120);
    return () => window.clearTimeout(timer);
  }, [recoveryRate]);

  return (
    <div className="glass-card overflow-hidden p-6">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">System Health</h2>
          <p className="text-xs font-medium text-slate-500">Campus recovery performance snapshot</p>
        </div>
        <span className="rounded-full bg-[#1A56DB]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#1A56DB]">
          Live
        </span>
      </div>

      <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
        <svg className="-rotate-90 transform" width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="healthRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A56DB" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(226,232,240,0.9)" strokeWidth="14" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#healthRing)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="dashboard-health-ring transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-4xl font-black tracking-tight text-slate-900">{animatedRate}%</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recovery Rate</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <HealthTile icon={CheckCircle2} label="Recovered" value={recovered} tone="emerald" />
        <HealthTile icon={Archive} label="In Vault" value={inVault} tone="blue" />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/50 p-3.5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Package size={12} />
            Inventory split
          </span>
          <span>{total} total</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
            style={{ width: total > 0 ? `${Math.round((foundCount / total) * 100)}%` : '50%' }}
          />
          <div
            className="bg-gradient-to-r from-red-400 to-rose-500 transition-all duration-700"
            style={{ width: total > 0 ? `${Math.round((lostCount / total) * 100)}%` : '50%' }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
          <span className="text-emerald-600">{foundCount} Found</span>
          <span className="text-red-500">{lostCount} Lost</span>
        </div>
      </div>
    </div>
  );
}

function HealthTile({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: 'border-emerald-200/60 bg-emerald-50/50 text-emerald-600',
    blue: 'border-blue-200/60 bg-blue-50/50 text-blue-600',
  };

  return (
    <div className="glass-tile px-3 py-3 text-center">
      <div
        className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl border ${tones[tone]}`}
      >
        <Icon size={15} />
      </div>
      <p className="text-xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
