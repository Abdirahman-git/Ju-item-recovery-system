'use client';

import Link from 'next/link';
import { Activity, ArrowUpRight, Brain, ShieldCheck, Sparkles } from 'lucide-react';

export default function DashboardHeroBanner({ stats, health, kpiMeta }) {
  const pending = stats.pendingReports || 0;
  const claims = stats.claimsCount || 0;

  return (
    <section className="dashboard-hero relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-[#0F2A6B] via-[#1A56DB] to-[#2563EB] px-4 py-3.5 text-white shadow-[0_16px_40px_rgba(26,86,219,0.22)] sm:px-5 sm:py-4">
      <div className="dashboard-hero-grid pointer-events-none absolute inset-0 opacity-[0.18]" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
            </span>
            Live campus recovery
          </div>
          <h2 className="text-lg font-black tracking-tight sm:text-xl">
            Jazeera University LOFO Command Center
          </h2>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <Link
              href="/admin/pending"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#1A56DB] shadow-md shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Activity size={14} />
              Review Queue
              {pending > 0 ? (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {pending}
                </span>
              ) : null}
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              <Sparkles size={14} />
              Open Reports
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:gap-2.5 lg:max-w-xs">
          <HeroStat label="Recovery Rate" value={`${health.recoveryRate}%`} icon={ShieldCheck} accent="emerald" />
          <HeroStat label="In Vault" value={health.inVault} icon={Brain} accent="violet" />
          <HeroStat
            label="This Week"
            value={kpiMeta?.weekly ? kpiMeta.weekly.primary + kpiMeta.weekly.secondary : 0}
            icon={Activity}
            accent="cyan"
            sub="New reports"
          />
          <HeroStat label="Claims" value={claims} icon={Sparkles} accent="amber" sub="Pending review" />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, icon: Icon, accent, sub }) {
  const accentMap = {
    emerald: 'from-emerald-400/30 to-emerald-500/10 text-emerald-100',
    violet: 'from-violet-400/30 to-violet-500/10 text-violet-100',
    cyan: 'from-cyan-400/30 to-cyan-500/10 text-cyan-100',
    amber: 'from-amber-400/30 to-amber-500/10 text-amber-100',
  };

  return (
    <div className={`rounded-xl border border-white/15 bg-gradient-to-br ${accentMap[accent]} px-3 py-2 backdrop-blur-md`}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">{label}</p>
        <Icon size={13} className="text-white/80" />
      </div>
      <p className="text-lg font-black tracking-tight">{value}</p>
      {sub ? <p className="text-[9px] font-medium text-white/60">{sub}</p> : null}
    </div>
  );
}
