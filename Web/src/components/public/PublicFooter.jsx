import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, MapPin, ShieldCheck, Smartphone } from 'lucide-react';

const EXPLORE = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/browse', label: 'Browse items' },
  { href: '/how-it-works', label: 'How it works' },
];

const GET_STARTED = [
  { href: '/browse', label: 'Browse live board' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '#get-app', label: 'Get the app' },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer relative mt-4 overflow-hidden">
      <div className="public-footer-glow" aria-hidden />

      <div className="relative z-[1] mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 xl:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="group inline-flex cursor-pointer items-center gap-3">
              <Image
                src="/jazeera_logo.png"
                alt="Jazeera University"
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl shadow-sm ring-1 ring-slate-200/80 transition group-hover:scale-[1.03]"
              />
              <div>
                <p className="text-lg font-black tracking-tight text-[#0F172A]">
                  JU <span className="text-[#1A56DB]">LOFO</span>
                </p>
                <p className="text-xs font-semibold text-slate-500">Jazeera University Lost & Found</p>
              </div>
            </Link>

            <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-slate-600">
              The official campus recovery board — approved listings only, built for students and staff at Jazeera University.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                <ShieldCheck size={13} />
                Admin verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-[#1A56DB]">
                <MapPin size={13} />
                Campus only
              </span>
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Explore</p>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-700 transition hover:text-[#1A56DB]"
                  >
                    {link.label}
                    <ArrowUpRight
                      size={14}
                      className="opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Get started</p>
            <ul className="mt-4 space-y-2.5">
              {GET_STARTED.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="group inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-700 transition hover:text-[#1A56DB]"
                  >
                    {link.label}
                    <ArrowUpRight
                      size={14}
                      className="opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <a
              href="#get-app"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-4 py-2.5 text-xs font-black text-white shadow-[0_10px_24px_rgba(26,86,219,0.25)] transition hover:bg-[#1E40AF] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Smartphone size={14} />
              Get the App
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="public-footer-bar mt-12 flex flex-col gap-3 border-t border-slate-200/90 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            © {year} Jazeera University LOFO. All rights reserved.
          </p>
          <p className="text-xs font-semibold text-slate-400">
            Built for campus recovery · Privacy-first public board
          </p>
        </div>
      </div>
    </footer>
  );
}
