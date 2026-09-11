'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  FolderOpen,
  FileText,
  Bell,
  User,
  HelpCircle,
  ShieldCheck,
  Lock,
  LogOut,
  X,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';

const LOGO = '/jazeera_logo_clear.png';

const NAV_SECTIONS = [
  {
    title: 'Main Menu',
    items: [
      { href: '/portal', label: 'Home', icon: Home, match: (p) => p === '/portal' },
      { href: '/portal/lost', label: 'Report Lost', icon: Search },
      { href: '/portal/my-items', label: 'My Items', icon: FolderOpen },
      { href: '/portal/my-requests', label: 'My Requests', icon: FileText },
      { href: '/portal/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
      { href: '/portal/profile', label: 'My Profile', icon: User },
    ],
  },
  {
    title: 'Support & Info',
    items: [
      { href: '/portal/help', label: 'Help / FAQ', icon: HelpCircle },
      { href: '/portal/privacy', label: 'Privacy Policy', icon: ShieldCheck },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/portal/change-password', label: 'Change Password', icon: Lock },
    ],
  },
];

function isActive(pathname, item) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarPanel({ unreadCount, onNavigate, showClose, onClose }) {
  const pathname = usePathname();
  const { session, logout, ready } = useSession();

  const userName = ready && session ? session?.userName || session?.name || 'User' : 'User';
  const studentId =
    ready && session ? session?.studentId || session?.student_id || '—' : '—';
  const roleLabel =
    ready && session?.role === 'admin'
      ? 'ADMIN'
      : ready && session?.role === 'staff'
        ? 'STAFF'
        : 'STUDENT';

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background:
          'linear-gradient(145deg, #0f2d6b 0%, #1a56db 38%, #2563eb 72%, #1e40af 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-10 h-44 w-44 rounded-full bg-sky-400/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-16 -right-8 h-40 w-40 rounded-full bg-blue-300/15"
      />

      <div className="relative z-10 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <Image
                src={LOGO}
                alt="JU LOFO"
                width={44}
                height={44}
                className="h-11 w-11 object-contain drop-shadow-md"
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black tracking-wide text-white">JU LOFO</p>
              <p className="text-sm font-semibold leading-snug text-white/95 break-words">
                {userName}
              </p>
              <p className="truncate text-xs font-medium text-blue-100/80">ID · {studentId}</p>
            </div>
          </div>
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          <ShieldCheck size={11} />
          {roleLabel}
        </span>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/70">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                const badge =
                  item.badgeKey === 'notifications' && Number(unreadCount) > 0
                    ? unreadCount
                    : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                      active
                        ? 'bg-white text-[#1A56DB] shadow-md'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#1A56DB]" />
                    ) : null}
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                        active ? 'bg-[#1A56DB] text-white' : 'bg-white/15 text-white'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span
                      className={`flex-1 truncate text-sm ${active ? 'font-bold' : 'font-semibold'}`}
                    >
                      {item.label}
                    </span>
                    {badge > 0 ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-black text-white">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:bg-white/15"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

/**
 * Desktop: always-visible rail.
 * Mobile: overlay drawer when `open`.
 */
export default function PortalSidebar({ open, onClose, unreadCount = 0 }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Persistent rail — always visible on lg+ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] lg:block">
        <SidebarPanel unreadCount={unreadCount} />
      </aside>

      {/* Mobile / tablet drawer */}
      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col overflow-hidden shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarPanel
              unreadCount={unreadCount}
              showClose
              onClose={onClose}
              onNavigate={onClose}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
