import { Brain, Download } from 'lucide-react';

export default function CampusTrendsBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#1A56DB] to-[#1E40AF] p-8 text-white shadow-lg shadow-blue-900/20">
      <div className="relative z-10 max-w-xl">
        <h2 className="text-2xl font-bold">Campus Recovery Trends</h2>
        <p className="mt-2 text-sm leading-relaxed text-blue-100">
          Track lost & found activity across Jazeera University. Monitor pending reports, successful
          recoveries, and student engagement in real time.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#1A56DB] shadow-md transition hover:bg-blue-50"
        >
          <Download size={16} />
          Download Insights
        </button>
      </div>
      <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-white/5 blur-xl" />
    </div>
  );
}

export function AutoMatchCard() {
  return (
    <div className="glass-card relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-400/15 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-500/15 to-purple-500/5 text-violet-600 shadow-lg shadow-violet-500/10">
          <Brain size={22} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Auto-Match Active</p>
          <p className="text-xs text-slate-500">Ownership matching enabled for campus reports</p>
        </div>
        <span className="ml-auto inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
      </div>
    </div>
  );
}
