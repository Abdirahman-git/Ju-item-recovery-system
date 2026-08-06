import Link from 'next/link';
import { Users, ClipboardList, AlertTriangle, Archive, CheckCircle2, ChevronRight } from 'lucide-react';

const ICONS = {
  users: Users,
  clipboard: ClipboardList,
  alert: AlertTriangle,
  vault: Archive,
  check: CheckCircle2,
};

const ICON_TONES = {
  users: 'border-violet-200/70 bg-violet-500/10 text-violet-600',
  clipboard: 'border-blue-200/70 bg-blue-500/10 text-blue-600',
  alert: 'border-red-200/70 bg-red-500/10 text-red-600',
  vault: 'border-amber-200/70 bg-amber-500/10 text-amber-600',
  check: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-600',
};

export default function ActionRequiredWidget({ items = [] }) {
  const hasPriority = items.some((item) => item.icon !== 'check');

  return (
    <div className="glass-card overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Action Required</h2>
          <p className="text-xs font-medium text-slate-500">Tasks that need your attention</p>
        </div>
        {hasPriority ? (
          <span className="dashboard-priority-pulse rounded-full border border-red-200/60 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-red-600">
            Priority
          </span>
        ) : (
          <span className="rounded-full border border-emerald-200/60 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-600">
            Clear
          </span>
        )}
      </div>

      <ul className="space-y-2.5">
        {items.map((item, index) => {
          const Icon = ICONS[item.icon] || AlertTriangle;
          const tone = ICON_TONES[item.icon] || ICON_TONES.alert;

          return (
            <li key={`${item.title}-${index}`}>
              <Link
                href={item.href}
                className="dashboard-action-item group flex items-start gap-3 rounded-2xl border border-white/50 bg-white/40 p-3.5 transition hover:border-blue-200/60 hover:bg-blue-50/25 hover:shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone}`}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <ChevronRight
                  size={16}
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1A56DB]"
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/admin/pending"
        className="glass-button mt-4 flex w-full items-center justify-center rounded-2xl py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white/70"
      >
        View All Tasks
      </Link>
    </div>
  );
}
