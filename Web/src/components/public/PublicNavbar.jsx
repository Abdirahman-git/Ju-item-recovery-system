'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Smartphone, X } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Home', exact: true },
  { href: '/about', label: 'About' },
  { href: '/browse', label: 'Browse' },
  { href: '/how-it-works', label: 'How it works' },
];

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        className={`public-nav fixed inset-x-0 top-0 z-50 transition-[padding,background,box-shadow,backdrop-filter] duration-200 ${
          scrolled ? 'public-nav--scrolled py-2' : 'py-4'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <Link href="/" className="group flex cursor-pointer items-center gap-2.5">
            <Image
              src="/jazeera_logo.png"
              alt="Jazeera University"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-white/60 transition group-hover:scale-[1.03]"
              priority
            />
            <span className="text-lg font-black tracking-tight text-[#0F172A]">
              JU <span className="text-[#1A56DB]">LOFO</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-[#1A56DB]/10 text-[#1A56DB]'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0F172A]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <a
              href="#get-app"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(26,86,219,0.28)] transition hover:bg-[#1E40AF] active:scale-[0.98]"
            >
              <Smartphone size={16} />
              Get App
            </a>
          </div>

          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white/80 p-2.5 text-slate-700 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div className="public-mobile-drawer absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto bg-white px-4 pb-8 pt-20 shadow-2xl">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {LINKS.map((link, i) => {
                const active = isActive(pathname, link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{ animationDelay: `${60 + i * 50}ms` }}
                    className={`public-drawer-link cursor-pointer rounded-2xl px-4 py-3.5 text-base font-bold transition ${
                      active ? 'bg-[#1A56DB]/10 text-[#1A56DB]' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="#get-app"
                onClick={() => setOpen(false)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] px-4 py-3.5 text-sm font-bold text-white"
              >
                <Smartphone size={16} />
                Get App
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
