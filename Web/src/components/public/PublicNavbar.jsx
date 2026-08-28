'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Home, Info, MapPin, Mail, Menu, Moon, Phone, Search, Smartphone, Sun, Workflow, X } from 'lucide-react';

const LINKS = [
  { href: '/', labelEn: 'Home', labelSo: 'Hoyga', exact: true, icon: Home, hintEn: 'Campus lost & found', hintSo: 'Alaabta campus-ka' },
  { href: '/about', labelEn: 'About', labelSo: 'Nagu saabsan', icon: Info, hintEn: 'University & mission', hintSo: 'Jaamacadda iyo himilada' },
  { href: '/browse', labelEn: 'Browse', labelSo: 'Baadh', icon: Search, hintEn: 'Search live items', hintSo: 'Raadi alaabta nool' },
  { href: '/how-it-works', labelEn: 'How it works', labelSo: 'Sida ay u shaqeyso', icon: Workflow, hintEn: 'Report, claim, recover', hintSo: 'Sheeg, dalbo, soo ceshado' },
];

const LANGS = [
  { code: 'en', label: 'English', flagSrc: '/flags/gb.svg', flagAlt: 'United Kingdom flag' },
  { code: 'so', label: 'Somali', flagSrc: '/flags/so.svg', flagAlt: 'Somalia flag' },
];

function LangFlag({ src, alt, className = '' }) {
  return (
    <span
      className={`relative inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/90 ${className}`}
      aria-hidden
    >
      <Image src={src} alt={alt} fill className="object-cover" sizes="20px" />
    </span>
  );
}

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function readStoredDark() {
  if (typeof document === 'undefined') return true;
  try {
    const saved = localStorage.getItem('ju-public-mode');
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
  } catch {
    /* ignore */
  }
  return true;
}

function syncShellDark(isDark) {
  document.documentElement.classList.toggle('public-dark', isDark);
  document.querySelector('.public-shell')?.classList.toggle('public-dark', isDark);
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [modeReady, setModeReady] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const applyMode = (isDark) => {
    syncShellDark(isDark);
    try {
      localStorage.setItem('ju-public-mode', isDark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    try {
      document.cookie = `ju-public-mode=${isDark ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const next = readStoredDark();
    setDark(next);
    applyMode(next);
    setModeReady(true);
  }, []);

  // Keep shell class in sync after client navigations / remounts
  useEffect(() => {
    if (!modeReady) return;
    syncShellDark(dark);
  }, [pathname, dark, modeReady]);

  const toggleMode = () => {
    const next = !dark;
    setDark(next);
    applyMode(next);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setLangOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSheetMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetOpen(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setSheetOpen(false);
    const t = window.setTimeout(() => setSheetMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest?.('.public-nav-lang')) setLangOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const so = lang === 'so';
  const currentLang = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <>
      <header
        className={`public-nav fixed inset-x-0 top-0 z-[70] px-3 pb-2 pt-2 sm:px-5 sm:pb-2.5 sm:pt-2.5 xl:px-8 ${
          scrolled ? 'public-nav--scrolled' : ''
        }`}
      >
        <div className="public-nav-stack mx-auto max-w-7xl">
          {/* Top utility pill — like reference */}
          <div
            className={`public-nav-top hidden w-full max-w-4xl items-center justify-between gap-4 px-5 py-1.5 lg:flex ${
              scrolled ? 'public-nav-top--scrolled' : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                <MapPin size={13} className="text-[#1A56DB]" strokeWidth={2.4} />
                Mogadishu, Somalia
              </span>
              <span className="public-nav-top-sep" aria-hidden />
              <a
                href="mailto:support@jazeerauniversity.edu.so"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 transition hover:text-[#1A56DB]"
              >
                <Mail size={13} className="text-[#1A56DB]" strokeWidth={2.4} />
                support@jazeerauniversity.edu.so
              </a>
              <span className="public-nav-top-sep" aria-hidden />
              <a
                href="#get-app"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 transition hover:text-[#1A56DB]"
              >
                <Phone size={13} className="text-[#1A56DB]" strokeWidth={2.4} />
                JU Lost Item App
              </a>
            </div>

            <div className="flex items-center gap-3">
              <div className="public-nav-lang relative">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-700"
                  aria-expanded={langOpen}
                  aria-haspopup="listbox"
                  onClick={() => setLangOpen((v) => !v)}
                >
                  <LangFlag src={currentLang.flagSrc} alt={currentLang.flagAlt} />
                  {currentLang.label}
                  <ChevronDown size={13} className={`text-slate-400 transition ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen ? (
                  <ul
                    role="listbox"
                    className="absolute right-0 top-[calc(100%+0.4rem)] z-20 min-w-[9.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                  >
                    {LANGS.map((item) => {
                      const active = lang === item.code;
                      return (
                        <li key={item.code}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold ${
                              active
                                ? 'bg-[#1A56DB]/8 text-[#1A56DB]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            onClick={() => {
                              setLang(item.code);
                              setLangOpen(false);
                            }}
                          >
                            <LangFlag src={item.flagSrc} alt={item.flagAlt} />
                            {item.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              <span className="public-nav-top-sep" aria-hidden />

              <button
                type="button"
                onClick={toggleMode}
                className={`public-mode-btn ${dark ? 'public-mode-btn--dark' : ''}`}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={dark}
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? (
                  <Sun size={18} strokeWidth={2.2} />
                ) : (
                  <Moon size={18} strokeWidth={2.2} />
                )}
              </button>
            </div>
          </div>

          {/* Main row: logo | links pill | CTA — no outer box */}
          <div className="public-nav-main relative flex items-center justify-between gap-3">
            <Link href="/" className="group relative z-[1] flex min-w-0 cursor-pointer items-center gap-2.5 sm:gap-3">
              <Image
                src="/jazeera_logo.png"
                alt="Jazeera University"
                width={52}
                height={52}
                className="public-brand-logo h-10 w-10 shrink-0 object-contain transition group-hover:scale-[1.03] sm:h-11 sm:w-11"
                priority
              />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[15px] font-black tracking-tight text-[#0F172A] sm:text-base">
                  JU <span className="text-[#1A56DB]">Lost</span>
                </span>
                <span className="hidden truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A56DB] sm:block">
                  Item Recovery
                </span>
              </span>
            </Link>

            <nav
              className="public-nav-pill absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-1.5 lg:flex"
              aria-label="Primary"
            >
              {LINKS.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`public-nav-link cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition ${
                      active ? 'public-nav-link--active' : 'text-[#0F172A] hover:text-[#1A56DB]'
                    }`}
                  >
                    {so ? link.labelSo : link.labelEn}
                  </Link>
                );
              })}
            </nav>

            <div className="relative z-[1] hidden items-center lg:flex">
              <a
                href="/#get-app"
                className="public-nav-cta public-press inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white"
              >
                {so ? 'Soo deg app' : 'Get App'}
              </a>
            </div>

            <button
              type="button"
              className={`public-menu-trigger relative z-[1] inline-flex cursor-pointer items-center justify-center lg:hidden ${
                open ? 'public-menu-trigger--open' : ''
              }`}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="public-menu-icon" aria-hidden>
                <Menu
                  size={20}
                  strokeWidth={2.2}
                  className={`public-menu-icon-el ${open ? 'is-out' : 'is-in'}`}
                />
                <X
                  size={20}
                  strokeWidth={2.2}
                  className={`public-menu-icon-el public-menu-icon-el--abs ${open ? 'is-in' : 'is-out'}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {sheetMounted ? (
        <div
          className={`public-mobile-sheet fixed inset-0 z-[60] lg:hidden ${sheetOpen ? 'is-open' : 'is-closing'}`}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="public-mobile-backdrop absolute inset-0 z-0 cursor-pointer"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div className="public-mobile-drawer relative z-10">
            <span className="public-mobile-accent" aria-hidden />
            <span className="public-mobile-orb" aria-hidden />

            <div className="public-mobile-head" style={{ animationDelay: '40ms' }}>
              <p className="public-mobile-kicker">{so ? 'Liiska' : 'Menu'}</p>
              <p className="public-mobile-head-title">{so ? 'Xaggee aad rabtaa?' : 'Where to next?'}</p>
            </div>

            <nav className="public-mobile-list" aria-label="Mobile">
              {LINKS.map((link, i) => {
                const active = isActive(pathname, link.href, link.exact);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{ animationDelay: `${90 + i * 70}ms` }}
                    onClick={() => setOpen(false)}
                    className={`public-drawer-row ${active ? 'public-drawer-row--active' : ''}`}
                  >
                    <span className="public-drawer-row-icon">
                      <Icon size={18} strokeWidth={2.15} />
                    </span>
                    <span className="public-drawer-row-copy">
                      <span className="public-drawer-row-label">{so ? link.labelSo : link.labelEn}</span>
                      <span className="public-drawer-row-hint">{so ? link.hintSo : link.hintEn}</span>
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      fill="none"
                      aria-hidden
                      className="public-drawer-row-chevron"
                    >
                      <path
                        d="M6 3.5 11 8 6 12.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                );
              })}
            </nav>

            <div className="public-mobile-toolbar" style={{ animationDelay: '380ms' }}>
              <div className="public-lang-seg" role="group" aria-label="Language">
                {LANGS.map((item) => {
                  const active = lang === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      className={`public-lang-seg-btn ${active ? 'public-lang-seg-btn--active' : ''}`}
                      onClick={() => setLang(item.code)}
                    >
                      <LangFlag
                        src={item.flagSrc}
                        alt={item.flagAlt}
                        className={active ? 'ring-white/35' : ''}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={toggleMode}
                className={`public-mode-btn public-mobile-mode ${dark ? 'public-mode-btn--dark' : ''}`}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="public-menu-icon" aria-hidden>
                  <Sun
                    size={18}
                    strokeWidth={2.2}
                    className={`public-menu-icon-el ${dark ? 'is-in' : 'is-out'}`}
                  />
                  <Moon
                    size={18}
                    strokeWidth={2.2}
                    className={`public-menu-icon-el public-menu-icon-el--abs ${dark ? 'is-out' : 'is-in'}`}
                  />
                </span>
              </button>
            </div>

            <a
              href="/#get-app"
              onClick={() => setOpen(false)}
              className="public-mobile-cta public-press"
              style={{ animationDelay: '450ms' }}
            >
              <Smartphone size={16} strokeWidth={2.2} />
              {so ? 'Soo deg app' : 'Get the App'}
            </a>

            <p className="public-mobile-foot" style={{ animationDelay: '520ms' }}>
              <MapPin size={11} strokeWidth={2.4} />
              Mogadishu
              <span aria-hidden>·</span>
              <a href="mailto:support@jazeerauniversity.edu.so">support@jazeerauniversity.edu.so</a>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
