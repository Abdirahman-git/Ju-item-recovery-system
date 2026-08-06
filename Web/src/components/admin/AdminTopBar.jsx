'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, HelpCircle, Menu, Search, Clock, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { useSidebar } from '@/context/SidebarContext';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useAdminBadges } from '@/context/AdminBadgeContext';
import { getAdminPageMeta } from '@/lib/adminPages';
import { fetchPendingReports, fetchPendingItemClaims } from '@/lib/supabase';
import Link from 'next/link';

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

export default function AdminTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const { toggle } = useSidebar();
  const { actions, stats } = useAdminHeaderActions();
  const { title, subtitle } = getAdminPageMeta(pathname);
  const showStats = pathname === '/admin' && stats;

  const { badgeCounts } = useAdminBadges();
  const totalBadgeCount = (badgeCounts?.pending || 0) + (badgeCounts?.claims || 0);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const initials = (session?.userName || 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [reportsData, claimsData] = await Promise.all([
        fetchPendingReports().catch(() => ({ combined: [] })),
        fetchPendingItemClaims().catch(() => [])
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
        if (claim.status === 'pending') {
          itemsList.push({
            id: `claim-${claim.id}`,
            type: 'claim',
            title: `New Ownership Claim`,
            description: `${claim.full_name || claim.student_id || 'Student'} claimed "${claim.targetItem?.itemName || 'Item'}"`,
            time: claim.created_at || claim.requestedAt || null,
            link: '/admin/claims',
          });
        }
      });

      // Sort by time descending
      itemsList.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setNotifications(itemsList);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

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
              <Bell size={15} />
              {totalBadgeCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
                  {totalBadgeCount}
                </span>
              )}
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 border border-white/50 shadow-2xl backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100/80 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">Notifications</span>
                    {totalBadgeCount > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
                        {totalBadgeCount} pending
                      </span>
                    )}
                  </div>
                  {totalBadgeCount > 0 && (
                    <button
                      onClick={loadNotifications}
                      className="text-xs font-semibold text-[#1A56DB] hover:underline"
                    >
                      Refresh
                    </button>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(n.link);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50/70 transition flex items-start gap-3"
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          n.type === 'claim' 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {n.type === 'claim' ? <ShieldCheck size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 leading-snug">{n.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500 truncate leading-relaxed">{n.description}</p>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Clock size={10} />
                            <span>{formatRelativeTime(n.time)}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                        <Bell size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-800">All caught up!</p>
                      <p className="mt-1 text-[11px] text-slate-400 max-w-[200px]">
                        No pending reports or ownership requests need your attention.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/admin/pending');
                      }}
                      className="rounded-lg bg-slate-100 hover:bg-slate-200/80 px-2 py-1.5 text-[11px] font-bold text-slate-700 transition"
                    >
                      Pending Reports
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/admin/claims');
                      }}
                      className="rounded-lg bg-[#1A56DB]/10 hover:bg-[#1A56DB]/15 px-2 py-1.5 text-[11px] font-bold text-[#1A56DB] transition"
                    >
                      Ownership Claims
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-[10px] font-black text-white shadow-lg shadow-blue-500/30">
              {initials}
            </div>
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

