'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  PlusCircle,
  FolderOpen,
  FileText,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Menu,
  KeyRound,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { getPortalPageMeta } from '@/lib/portalPages';

const LOGO = '/jazeera_logo_clear.png';

const NAV_LINKS = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/lost', label: 'Report Lost', icon: PlusCircle },
  { href: '/portal/browse', label: 'All Items', icon: Search },
  { href: '/portal/my-items', label: 'My Items', icon: FolderOpen },
  { href: '/portal/my-requests', label: 'My Requests', icon: FileText },
];

export default function PortalNavbar({ onOpenSidebar, unreadCount = 0 }) {
  const pathname = usePathname();
  const { title, subtitle } = getPortalPageMeta(pathname);
  const { session, logout, ready } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showUser = mounted && ready && session;
  const userName = showUser
    ? session?.userName || session?.name || 'User'
    : 'User';
  const studentId = showUser
    ? session?.studentId || session?.student_id || '—'
    : '—';
  const faculty = showUser ? session?.faculty || '' : '';
  const initial = showUser ? userName.charAt(0).toUpperCase() : '·';
  const isAdmin = showUser && session?.role === 'admin';
  const email = showUser ? session?.email : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="h-px bg-gradient-to-r from-[#1A56DB]/40 via-blue-300/30 to-transparent" />
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#1E40AF] transition hover:bg-slate-50 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Link href="/portal" className="relative h-9 w-9 flex-shrink-0 transition-opacity hover:opacity-90 lg:hidden">
            <Image
              src={LOGO}
              alt="Jazeera University"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-sm"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </Link>

          {/* Page title — same pattern as admin web top bar */}
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg lg:text-xl">
              {title}
            </h1>
            <p className="truncate text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Mid nav: tablet only (sidebar covers desktop) */}
        <nav className="hidden items-center gap-1 md:flex lg:hidden">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  active
                    ? 'bg-[#1A56DB] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                <span className="hidden xl:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {isAdmin ? (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 sm:flex"
            >
              <Shield size={14} />
              <span>Admin Console</span>
            </Link>
          ) : null}

          <Link
            href="/portal/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 transition-all hover:border-slate-300 sm:px-2.5 sm:py-1.5"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1A56DB] to-blue-700 text-xs font-black text-white shadow-sm"
                suppressHydrationWarning
              >
                {initial}
              </div>
              <div className="hidden text-left sm:block">
                <span
                  className="block max-w-[220px] text-xs font-bold leading-snug text-slate-800"
                  suppressHydrationWarning
                >
                  {userName}
                </span>
                <span
                  className="block text-[10px] font-medium text-slate-400"
                  suppressHydrationWarning
                >
                  {studentId}
                </span>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {profileOpen && showUser ? (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="text-xs font-black leading-snug text-slate-900">{userName}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{email}</p>
                  {faculty ? (
                    <span className="mt-1 inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1A56DB]">
                      {faculty}
                    </span>
                  ) : null}
                </div>

                <div className="py-1">
                  <Link
                    href="/portal/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <User size={15} />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/portal/change-password"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <KeyRound size={15} />
                    <span>Change Password</span>
                  </Link>
                  <Link
                    href="/portal/my-items"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FolderOpen size={15} />
                    <span>My Reported Items</span>
                  </Link>
                  <Link
                    href="/portal/my-requests"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileText size={15} />
                    <span>My Claims &amp; Requests</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
