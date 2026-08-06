/** Lightweight skeleton shown instantly while admin routes load. */
export default function AdminPageSkeleton() {
  return (
    <div className="admin-page-skeleton space-y-4 animate-pulse" aria-hidden>
      <div className="h-28 rounded-[28px] bg-white/60" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/55" />
        ))}
      </div>
      <div className="h-72 rounded-[28px] bg-white/50" />
    </div>
  );
}
