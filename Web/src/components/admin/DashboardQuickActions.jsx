'use client';

import Link from 'next/link';
import {
  Archive,
  ClipboardList,
  FilePlus2,
  Search,
  Shield,
  Users,
} from 'lucide-react';

const ACTIONS = [
  { href: '/admin/lost', label: 'Report Lost', icon: FilePlus2, tone: 'rose' },
  { href: '/admin/secure-found', label: 'Secure Lost', icon: Archive, tone: 'amber' },
  { href: '/admin/pending', label: 'Pending', icon: ClipboardList, tone: 'amber' },
  { href: '/admin/claims', label: 'Claims', icon: Shield, tone: 'violet' },
  { href: '/admin/users', label: 'Users', icon: Users, tone: 'blue' },
  { href: '/admin/items', label: 'Inventory', icon: Search, tone: 'slate' },
];

const TONE_STYLES = {
  rose: 'border-rose-200/70 bg-rose-50/50 text-rose-600 group-hover:bg-rose-100/70',
  teal: 'border-teal-200/70 bg-teal-50/50 text-teal-600 group-hover:bg-teal-100/70',
  amber: 'border-amber-200/70 bg-amber-50/50 text-amber-600 group-hover:bg-amber-100/70',
  violet: 'border-violet-200/70 bg-violet-50/50 text-violet-600 group-hover:bg-violet-100/70',
  blue: 'border-blue-200/70 bg-blue-50/50 text-blue-600 group-hover:bg-blue-100/70',
  slate: 'border-slate-200/70 bg-slate-50/50 text-slate-600 group-hover:bg-slate-100/70',
};

export default function DashboardQuickActions() {
  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-black tracking-tight text-slate-900">Quick Actions</h3>
        <p className="text-xs font-medium text-slate-500">Jump to common admin workflows</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="dashboard-quick-action group flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/45 px-3 py-3.5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${TONE_STYLES[action.tone]}`}
              >
                <Icon size={18} />
              </div>
              <span className="text-xs font-bold text-slate-700">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
