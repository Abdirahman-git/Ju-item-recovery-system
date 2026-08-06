export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
