'use client';

export default function SiteFooter({ className = '', variant = 'default' }) {
  const year = new Date().getFullYear();

  if (variant === 'login') {
    return (
      <footer className={`shrink-0 px-6 pb-8 pt-2 text-center ${className}`}>
        <div className="mx-auto flex max-w-md flex-col items-center gap-2.5">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300" aria-hidden />
            <span>Campus verified</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300" aria-hidden />
          </div>
          <p className="text-[13px] font-bold tracking-tight text-slate-600">
            © {year} Jazeera University ·{' '}
            <span className="bg-gradient-to-r from-[#1A56DB] to-[#0E7490] bg-clip-text text-transparent">
              JU Lost Item System
            </span>
          </p>
          <p className="max-w-xs text-[11px] font-medium leading-relaxed text-slate-400">
            Official Lost &amp; Found console · Protecting campus belongings with care.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`shrink-0 border-t border-slate-200/80 bg-white px-8 py-4 text-center text-xs font-bold text-slate-400 ${className}`}
    >
      <span className="text-slate-500">© {year} Jazeera University</span>
      <span className="mx-2 text-slate-300">·</span>
      <span className="bg-gradient-to-r from-[#1A56DB] to-[#0E7490] bg-clip-text font-black text-transparent">
        JU Lost Item System
      </span>
      <span className="mx-2 text-slate-300">·</span>
      <span>All rights reserved</span>
    </footer>
  );
}
