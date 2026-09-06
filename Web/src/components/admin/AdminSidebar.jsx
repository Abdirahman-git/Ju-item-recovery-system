'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Hourglass,
  ClipboardList,
  FileText,
  Users,
  Box,
  Gift,
  Search,
  CircleCheck,
  FolderOpen,
  User,
  Lock,
  LogOut,
  X,
  Shield,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  HardDrive,
  Archive,
  Mail,
  Settings,
} from 'lucide-react';
import { NAV_SECTIONS } from '@/lib/navigation';
import { useSession } from '@/context/SessionProvider';
import { useSidebar } from '@/context/SidebarContext';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';

const ICONS = {
  grid: LayoutGrid,
  hourglass: Hourglass,
  clipboard: ClipboardList,
  'file-text': FileText,
  people: Users,
  cube: Box,
  gift: Gift,
  search: Search,
  'checkmark-circle': CircleCheck,
  'shield-checkmark': Shield,
  'folder-open': FolderOpen,
  person: User,
  'lock-closed': Lock,
  'bar-chart': BarChart3,
  'hard-drive': HardDrive,
  archive: Archive,
  mail: Mail,
  settings: Settings,
};

export default function AdminSidebar({ badgeCounts = {}, onNavigate, showClose = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, ready } = useSession();
  const { collapsed, toggleCollapsed, pendingHref, setPendingNav } = useSidebar();
  const adminName = session?.userName || 'Administrator';
  const isSuperAdmin = checkSuperAdmin(session);

  function safePrefetch(href) {
    if (!ready || !href) return;
    try {
      router.prefetch(href);
    } catch {
      /* Router can throw before App Router finishes initializing (Turbopack). */
    }
  }

  function safePush(href) {
    if (!href) return;
    try {
      router.push(href);
    } catch {
      window.location.assign(href);
    }
  }

  // Warm nav after router is ready — never during first paint / hydration.
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      NAV_SECTIONS.forEach((section) => {
        section.items.forEach((item) => {
          if (item.superAdminOnly && !isSuperAdmin) return;
          safePrefetch(item.href);
        });
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // safePrefetch closes over ready/router; deps cover those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, router, isSuperAdmin]);

  const isActive = (href, exact) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="glass-sidebar relative flex h-full flex-col text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-10 top-10 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -right-8 bottom-16 h-36 w-36 rounded-full bg-indigo-300/15 blur-3xl" />
        <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        className="absolute -right-3 top-6 z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-white/90 bg-white text-[#1A56DB] shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-blue-50 lg:flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      <div className={`relative px-4 pb-4 pt-5 ${collapsed ? 'lg:px-3' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="relative p-0">
                <Image
                  src="/jazeera_logo.png"
                  alt="JU"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              </div>
            </div>
            <div className={collapsed ? 'lg:hidden' : ''}>
              <p className="text-[15px] font-black leading-tight text-white">JU LOFO</p>
              <p className="mt-0.5 max-w-[150px] truncate text-[11px] font-semibold text-blue-100/85">
                Admin Console
              </p>
            </div>
          </div>

          <div className={`flex shrink-0 items-center gap-1.5 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-2.5 py-1 backdrop-blur-sm">
              <Shield size={11} className="text-sky-200" />
              <span className="text-[9px] font-bold tracking-wider text-white">
                {isSuperAdmin ? 'SUPER' : 'ADMIN'}
              </span>
            </div>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white lg:hidden"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <nav className={`relative flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className={`mb-5 last:mb-2 ${collapsed ? 'lg:mb-3' : ''}`}>
            {!collapsed ? <p className="sidebar-section-title">{section.title}</p> : null}
            <ul className="space-y-1.5">
              {section.items
                .filter((item) => !(item.superAdminOnly && !isSuperAdmin))
                .map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = isActive(item.href, item.exact);
                  const pending = pendingHref === item.href;
                  const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onMouseEnter={() => safePrefetch(item.href)}
                        onClick={(event) => {
                          // Mobile drawer close can race soft nav — force push after init.
                          if (item.href !== pathname) {
                            event.preventDefault();
                            setPendingNav(item.href);
                            onNavigate?.();
                            window.setTimeout(() => safePush(item.href), 0);
                            return;
                          }
                          onNavigate?.();
                        }}
                        title={collapsed ? item.label : undefined}
                        className={`sidebar-nav-link ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${
                          active ? 'sidebar-nav-link-active' : ''
                        } ${pending && !active ? 'sidebar-nav-link-pending' : ''}`}
                      >
                        <span className={`sidebar-nav-icon ${active ? 'sidebar-nav-icon-active' : ''}`}>
                          {Icon ? <Icon size={17} strokeWidth={active ? 2.35 : 2} /> : null}
                        </span>
                        <span
                          className={`sidebar-nav-label ${collapsed ? 'lg:hidden' : ''} ${
                            active ? 'sidebar-nav-label-active' : ''
                          }`}
                        >
                          {item.label}
                        </span>
                        {badge > 0 ? (
                          <span
                            className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-red-500/40 ${
                              active ? 'ring-2 ring-white' : 'border border-red-300/50'
                            } ${collapsed ? 'lg:absolute lg:right-0.5 lg:top-0.5 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[9px]' : ''}`}
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`relative border-t border-white/15 p-3 ${collapsed ? 'lg:px-2' : ''}`}>
        {!collapsed ? (
          <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-black text-white shadow-lg shadow-blue-900/30">
              {(adminName || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{adminName}</p>
              <p className="truncate text-[11px] text-sky-100/70">{session?.email || 'Admin'}</p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300/35 bg-red-500/12 py-3 text-sm font-bold text-red-100 transition hover:border-red-200/50 hover:bg-red-500/22 hover:text-white active:scale-[0.98] ${
            collapsed ? 'lg:h-11 lg:px-0 lg:py-0' : ''
          }`}
        >
          <LogOut size={18} />
          <span className={collapsed ? 'lg:hidden' : ''}>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
