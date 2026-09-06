import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import ItemThumbnail from './ItemThumbnail';
import { formatRelativeTime } from '@/lib/dashboardAnalytics';

const STATUS_STYLES = {
  lost: {
    badge: 'border-red-200/70 bg-red-500/10 text-red-700',
    dot: 'bg-red-500',
    type: 'text-red-600 bg-red-50',
  },
  found: {
    badge: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
    dot: 'bg-emerald-500',
    type: 'text-emerald-600 bg-emerald-50',
  },
  matched: {
    badge: 'border-blue-200/70 bg-blue-500/10 text-blue-700',
    dot: 'bg-blue-500',
    type: 'text-blue-600 bg-blue-50',
  },
  returned: {
    badge: 'border-slate-200/70 bg-slate-500/10 text-slate-600',
    dot: 'bg-slate-400',
    type: 'text-slate-600 bg-slate-50',
  },
  pending: {
    badge: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
    dot: 'bg-amber-500',
    type: 'text-amber-600 bg-amber-50',
  },
};

export default function RecentActivityTable({ items = [] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/45 bg-white/[0.16] px-5 py-4 backdrop-blur-sm sm:px-6">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Recent Activity</h2>
          <p className="text-xs font-medium text-slate-500">Latest lost & found updates across campus</p>
        </div>
        <Link
          href="/admin/items"
          className="inline-flex items-center gap-1 text-sm font-black text-[#1A56DB] hover:underline"
        >
          View All Reports
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-16 text-center text-slate-400">No recent activity yet</div>
      ) : (
        <div className="divide-y divide-white/35">
          {items.map((item, index) => {
            const tone = item.displayStatus?.tone || 'pending';
            const styles = STATUS_STYLES[tone] || STATUS_STYLES.pending;

            return (
              <div
                key={`${item.itemType}-${item.id}`}
                className="dashboard-activity-row group flex flex-col gap-3 px-5 py-4 transition hover:bg-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <ItemThumbnail
                    src={item.imageUrl}
                    alt={item.displayName}
                    itemType={item.itemType}
                    itemName={item.displayName}
                    category={item.displayCategory}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-slate-900">{item.displayName}</p>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {item.refId}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">{item.displayCategory}</span>
                      <span className="text-slate-300">·</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles.type}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                        {item.itemType}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock3 size={11} />
                        {formatRelativeTime(item.reportedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                  <span
                    className={`glass-badge inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles.badge}`}
                  >
                    {item.displayStatus?.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
