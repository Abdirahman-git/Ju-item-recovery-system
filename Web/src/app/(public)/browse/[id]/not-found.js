import Link from 'next/link';

export default function PublicNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#1A56DB]">404</p>
      <h1 className="mt-3 text-3xl font-black text-[#0F172A]">Page not found</h1>
      <p className="mt-3 text-sm font-medium text-slate-600">
        That link may be outdated, or the item is no longer live on the public board.
      </p>
      <Link
        href="/browse"
        className="mt-8 cursor-pointer rounded-full bg-[#1A56DB] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E40AF]"
      >
        Back to Browse
      </Link>
    </div>
  );
}
