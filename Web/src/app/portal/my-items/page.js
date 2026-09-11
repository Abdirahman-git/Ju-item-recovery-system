'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FolderOpen,
  PlusCircle,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Tag,
  Loader2,
  Search,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { fetchPortalUserItems, withdrawPortalReportedItem } from '@/lib/portal';

const WITHDRAW_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export default function PortalMyItemsPage() {
  const { session } = useSession();
  const [items, setItems] = useState({ lost: [], found: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('live'); // 'live' | 'pending'
  const [nowTs, setNowTs] = useState(Date.now());
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [notice, setNotice] = useState(null);

  // Update clock every 30s for withdrawal timer
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadItems = useCallback(async () => {
    if (!session?.email) return;
    setLoading(true);
    try {
      const data = await fetchPortalUserItems(session.email);
      setItems(data);
    } catch (err) {
      console.error('Error fetching user items:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.email]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const allUserItems = useMemo(() => {
    return [...(items.lost || []), ...(items.found || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    return allUserItems.filter((i) => {
      const isPending = i.status === 'pending_review' || i.status === 'pending';
      return statusFilter === 'pending' ? isPending : !isPending;
    });
  }, [allUserItems, statusFilter]);

  const handleWithdraw = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to withdraw "${item.itemName}"? This report will be removed.`
    );
    if (!confirmed) return;

    setWithdrawingId(item.id);
    setNotice(null);
    try {
      await withdrawPortalReportedItem(item.id, item.listType, session.email);
      setNotice({ type: 'success', text: `Withdrew report for "${item.itemName}".` });
      await loadItems();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not withdraw item.' });
    } finally {
      setWithdrawingId(null);
    }
  };

  const getWithdrawInfo = (createdAt) => {
    if (!createdAt) return { canWithdraw: false, minutesLeft: 0 };
    const createdMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdMs)) return { canWithdraw: false, minutesLeft: 0 };

    const elapsed = Math.max(0, nowTs - createdMs);
    const remainingMs = WITHDRAW_WINDOW_MS - elapsed;
    const canWithdraw = remainingMs > 0;
    const minutesLeft = canWithdraw ? Math.ceil(remainingMs / 60000) : 0;

    return { canWithdraw, minutesLeft };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">My Reported Items</h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Track and manage lost item reports submitted under your student/staff account.
          </p>
        </div>

        <Link
          href="/portal/lost"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1A56DB] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <PlusCircle size={16} />
          <span>Report New Item</span>
        </Link>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold ${
            notice.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setStatusFilter('live')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            statusFilter === 'live'
              ? 'bg-[#1A56DB] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Live Items ({allUserItems.filter((i) => i.status !== 'pending_review' && i.status !== 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            statusFilter === 'pending'
              ? 'bg-[#1A56DB] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Pending Review ({allUserItems.filter((i) => i.status === 'pending_review' || i.status === 'pending').length})
        </button>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#1A56DB]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center">
          <FolderOpen size={40} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">
            {statusFilter === 'live' ? 'No active reports' : 'No pending reviews'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'live'
              ? "You haven't submitted any active lost item reports yet."
              : 'None of your submitted items are currently awaiting review.'}
          </p>
          <div className="mt-5">
            <Link
              href="/portal/lost"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A56DB] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <PlusCircle size={15} />
              <span>Report a Lost Item</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredItems.map((item) => {
            const { canWithdraw, minutesLeft } = getWithdrawInfo(item.created_at);
            const isWithdrawing = withdrawingId === item.id;

            return (
              <div
                key={`${item.listType}-${item.id}`}
                className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] w-full sm:w-36 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {item.imageURI ? (
                    <Image src={item.imageURI} alt={item.itemName} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-[#1A56DB]">
                      <Search size={24} className="opacity-50" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                    LOST
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-black text-slate-900">{item.itemName}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          String(item.status || '').includes('pending')
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {String(item.status || '').includes('pending') ? 'Pending' : 'Live'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {item.category && (
                        <span className="inline-flex items-center gap-1">
                          <Tag size={12} className="text-slate-400" />
                          {item.category}
                        </span>
                      )}
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          {item.location}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Footer & Withdrawal Action */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                    <span className="text-slate-400">Reported {item.timeAgo}</span>
                    {canWithdraw ? (
                      <button
                        onClick={() => handleWithdraw(item)}
                        disabled={isWithdrawing}
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>{isWithdrawing ? 'Withdrawing…' : `Withdraw (${minutesLeft}m left)`}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
