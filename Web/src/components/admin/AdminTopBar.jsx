'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  HelpCircle,
  Menu,
  Clock,
  FileText,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { useSidebar } from '@/context/SidebarContext';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { getAdminPageMeta } from '@/lib/adminPages';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';
import {
  fetchPendingReports,
  fetchPendingItemClaims,
  fetchContactMessages,
} from '@/lib/supabase';

function ToolbarDivider() {
  return <div className="mx-0.5 hidden h-6 w-px bg-white/40 sm:block" aria-hidden />;
}

function formatRelativeTime(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMs / 36e5);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function iconForType(type) {
  if (type === 'claim') return ShieldCheck;
  if (type === 'contact') return Mail;
  return FileText;
}

function toneForType(type) {
  if (type === 'claim') return 'bg-blue-50 text-blue-600';
  if (type === 'contact') return 'bg-violet-50 text-violet-600';
  return 'bg-indigo-50 text-indigo-600';
}

export default function AdminTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const { toggle } = useSidebar();
  const { actions, stats } = useAdminHeaderActions();
  const { title, subtitle } = getAdminPageMeta(pathname);
  const showStats = pathname === '/admin' && stats;
  const isSuperAdmin = checkSuperAdmin(session);

  const { badgeCounts, setBadgeCounts } = useAdminBadges();
  const totalBadgeCount =
    (badgeCounts?.pending || 0) + (badgeCounts?.claims || 0) + (badgeCounts?.contact || 0);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ringKey, setRingKey] = useState(0);
  const dropdownRef = useRef(null);
  const prevCountRef = useRef(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const initials = (session?.userName || 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const loadNotifications = async ({ updateBadges = true } = {}) => {
    try {
      setLoading(true);
      const [reportsData, claimsData, contactData] = await Promise.all([
        fetchPendingReports().catch(() => ({ combined: [] })),
        fetchPendingItemClaims().catch(() => []),
        isSuperAdmin ? fetchContactMessages().catch(() => []) : Promise.resolve([]),
      ]);

      const itemsList = [];

      (reportsData.combined || []).forEach((item) => {
        itemsList.push({
          id: `report-${item.id}-${item.itemType}`,
          type: 'report',
          title: `New ${item.itemType === 'lost' ? 'Lost' : 'Found'} Item`,
          description: `"${item.itemName || 'Item'}" waiting for approval in ${item.location || 'Campus'}`,
          time: item.created_at || item.createdAt || null,
          link: '/admin/pending',
        });
      });

      (claimsData || []).forEach((claim) => {
        if (claim.status === 'pending' || claim.status === 'physical' || claim.displayStatus === 'Physical') {
          itemsList.push({
            id: `claim-${claim.id}`,
            type: 'claim',
            title: claim.status === 'physical' ? 'Physical verification' : 'New Ownership Claim',
            description: `${claim.full_name || claim.claimer_name || claim.student_id || 'Student'} claimed "${claim.targetItem?.itemName || 'Item'}"`,
            time: claim.created_at || claim.requestedAt || null,
            link: '/admin/claims',
          });
        }
      });

      const newContacts = (contactData || []).filter((m) => m.status === 'new');
      newContacts.forEach((msg) => {
        itemsList.push({
          id: `contact-${msg.id}`,
          type: 'contact',
          title: 'New Contact Message',
          description: `${msg.fullName || 'Visitor'} · ${msg.subject || 'LOFO contact'}`,
          time: msg.createdAt || msg.created_at || null,
          link: '/admin/contact-messages',
        });
      });

      itemsList.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setNotifications(itemsList);

      if (updateBadges) {
        setBadgeCounts((prev) => ({
          pending: (reportsData.combined || []).length,
          claims: (claimsData || []).filter(
            (c) => c.status === 'pending' || c.status === 'physical' || c.displayStatus === 'Physical'
          ).length,
          contact: isSuperAdmin ? newContacts.length : prev?.contact || 0,
        }));
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSuperAdmin]);

  useEffect(() => {
    loadNotifications({ updateBadges: true });
    const timer = window.setInterval(() => {
      loadNotifications({ updateBadges: true });
    }, 35000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = totalBadgeCount;
      if (totalBadgeCount > 0) setRingKey((k) => k + 1);
      return;
    }
    if (totalBadgeCount > prevCountRef.current) {
      setRingKey((k) => k + 1);
    }
    prevCountRef.current = totalBadgeCount;
  }, [totalBadgeCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="glass-header sticky top-0 z-20 shrink-0">
      <div className="h-px bg-gradient-to-r from-[#1A56DB]/40 via-[#8B5CF6]/35 to-transparent" />

      <div className="flex items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={toggle}
          className="glass-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:text-[#1A56DB] lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 shrink">
          <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">{title}</h1>
          <p className="truncate text-xs font-medium leading-snug text-slate-500">{subtitle}</p>
        </div>

        <div className="min-w-2 flex-1" aria-hidden />

        <div className="glass-panel flex max-w-full items-center gap-1 rounded-[24px] p-1.5">
          {actions ? (
            <>
              <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
              <ToolbarDivider />
            </>
          ) : null}

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/60 hover:text-[#1A56DB] ${isOpen ? 'bg-white/60 text-[#1A56DB]' : ''}`}
              aria-label="Notifications"
            >
              <span
                key={ringKey}
                className={totalBadgeCount > 0 ? 'admin-bell-ring inline-flex' : 'inline-flex'}
              >
                <Bell size={15} />
              </span>
              {totalBadgeCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-black text-white ring-2 ring-white">
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              ) : null}
            </button>

            {isOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 sm:w-96">
                <div className="flex items-center justify-between border-b border-slate-100/80 bg-slate-50/50 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">Notifications</span>
                    {totalBadgeCount > 0 ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
                        {totalBadgeCount} pending
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => loadNotifications()}
                    className="text-xs font-semibold text-[#1A56DB] hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                <div className="max-h-[360px] divide-y divide-slate-50 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((n) => {
                      const Icon = iconForType(n.type);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            router.push(n.link);
                          }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70"
                        >
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneForType(n.type)}`}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold leading-snug text-slate-900">{n.title}</p>
                            <p className="mt-0.5 truncate text-xs leading-relaxed text-slate-500">
                              {n.description}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
                              <Clock size={10} />
                              <span>{formatRelativeTime(n.time)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                        <Bell size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-800">All caught up!</p>
                      <p className="mt-1 max-w-[220px] text-[11px] text-slate-400">
                        No pending reports, ownership requests, or contact messages need your
                        attention.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
                  <div className={`grid gap-2 ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/admin/pending');
                      }}
                      className="rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200/80"
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/admin/claims');
                      }}
                      className="rounded-lg bg-[#1A56DB]/10 px-2 py-1.5 text-[11px] font-bold text-[#1A56DB] transition hover:bg-[#1A56DB]/15"
                    >
                      Claims
                    </button>
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          router.push('/admin/contact-messages');
                        }}
                        className="rounded-lg bg-violet-50 px-2 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100"
                      >
                        Contact
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/60 hover:text-[#1A56DB] sm:flex"
            aria-label="Help"
          >
            <HelpCircle size={15} />
          </button>

          <ToolbarDivider />

          <div className="glass-button flex shrink-0 items-center gap-2 rounded-2xl py-1 pl-2.5 pr-1">
            <div className="hidden text-right md:block">
              <p className="text-[9px] font-black uppercase tracking-wider text-[#1A56DB]/80">Admin</p>
              <p className="max-w-[116px] truncate text-xs font-black text-slate-800">
                {session?.userName || 'Administrator'}
              </p>
            </div>
            {avatarFailed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-[10px] font-black text-white shadow-lg shadow-blue-500/30">
                {initials}
              </div>
            ) : (
              <div className="relative h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/60 shadow-lg shadow-blue-500/20">
                <Image
                  src="/Avatar001.png"
                  alt="Admin avatar"
                  fill
                  className="object-cover"
                  sizes="32px"
                  onError={() => setAvatarFailed(true)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showStats ? (
        <div className="border-t border-white/45 bg-white/[0.12] px-3 pb-3 pt-3 backdrop-blur-md sm:px-5 lg:px-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats}</div>
        </div>
      ) : null}
    </header>
  );
}
