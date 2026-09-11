'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building,
  Tag,
  Search,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { fetchPortalUserClaims } from '@/lib/portal';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'physical', label: 'Visit Office' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function PortalMyRequestsPage() {
  const { session } = useSession();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const loadClaims = useCallback(async () => {
    if (!session?.email) return;
    setLoading(true);
    try {
      const data = await fetchPortalUserClaims(session.email);
      setClaims(data);
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.email]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const filteredClaims = useMemo(() => {
    if (activeTab === 'all') return claims;
    return claims.filter((c) => {
      const s = String(c.status || '').toLowerCase();
      if (activeTab === 'physical') return s === 'physical' || s === 'visit_office';
      return s === activeTab;
    });
  }, [claims, activeTab]);

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') {
      return {
        label: 'Approved',
        icon: CheckCircle2,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (s === 'physical' || s === 'visit_office') {
      return {
        label: 'Visit Office',
        icon: Building,
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    if (s === 'rejected') {
      return {
        label: 'Rejected',
        icon: XCircle,
        bg: 'bg-red-50 text-red-700 border-red-200',
      };
    }
    return {
      label: 'Pending Review',
      icon: Clock,
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">My Ownership Requests</h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
          Track the status of your verification challenges and claims for recovered items.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 pb-2 scrollbar-none">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count =
            tab.key === 'all'
              ? claims.length
              : claims.filter((c) => {
                  const s = String(c.status || '').toLowerCase();
                  if (tab.key === 'physical') return s === 'physical' || s === 'visit_office';
                  return s === tab.key;
                }).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-[#1A56DB] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#1A56DB]" />
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No requests found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            When you claim an item from the browse feed, your claim status and office visit updates will appear here.
          </p>
          <div className="mt-5">
            <Link
              href="/portal/browse"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A56DB] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Search size={15} />
              <span>Browse Items to Claim</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const badge = getStatusBadge(claim.status);
            const BadgeIcon = badge.icon;
            const item = claim.targetItem || {};

            return (
              <div
                key={claim.id}
                className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  {/* Item preview + title */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {item.imageURI ? (
                        <Image src={item.imageURI} alt={item.itemName || 'Item'} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-blue-50 text-[#1A56DB]">
                          <Search size={22} className="opacity-50" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {claim.item_type === 'found' ? 'Found Item' : 'Lost Item'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Claimed {new Date(claim.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-black text-slate-950">
                        {item.itemName || 'Claimed Item'}
                      </h3>
                      {item.location && (
                        <p className="text-xs text-slate-500 mt-0.5">Location: {item.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badge.bg}`}
                  >
                    <BadgeIcon size={14} />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Claim details */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs">
                  <p className="font-bold text-slate-700">Your Statement / Evidence:</p>
                  <p className="mt-1 text-slate-600 font-medium italic">
                    "{claim.description || claim.reason || 'Verification challenge submitted'}"
                  </p>
                </div>

                {/* Admin notes & pickup info */}
                {claim.status === 'approved' && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black">Claim Approved!</p>
                      <p className="mt-0.5 font-medium">
                        Please visit the Student Affairs / Lost &amp; Found office with your University ID card to collect your item.
                      </p>
                    </div>
                  </div>
                )}

                {(claim.status === 'physical' || claim.status === 'visit_office') && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3.5 text-xs text-amber-800">
                    <Building size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black">Office Verification Required</p>
                      <p className="mt-0.5 font-medium">
                        Please visit the Lost &amp; Found desk in person to present matching proof (unlock code, matching receipt, or physical identification).
                      </p>
                    </div>
                  </div>
                )}

                {claim.admin_notes && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Desk Officer Note: </span>
                    <span>{claim.admin_notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
