'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Package } from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { formatPublicDate } from '@/lib/publicItems';

export default function ItemCard({ item, index = 0, reveal = true }) {
  const [failed, setFailed] = useState(false);
  const isFound = item.itemType === 'found';

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl]);

  return (
    <Link
      href={`/browse/${item.slug}`}
      className={`public-item-card group block cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(26,86,219,0.12)] active:scale-[0.99] ${
        reveal ? 'public-reveal' : ''
      }`}
      style={reveal ? { animationDelay: `${Math.min(index, 8) * 60}ms` } : undefined}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {!item.imageUrl || failed ? (
          <div
            className={`flex h-full w-full items-center justify-center ${
              isFound ? 'bg-blue-50 text-[#1A56DB]' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Package size={36} strokeWidth={1.5} />
          </div>
        ) : (
          <SafeRemoteImage
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => setFailed(true)}
          />
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm ${
            isFound ? 'bg-[#1A56DB]' : 'bg-amber-500'
          }`}
        >
          {isFound ? 'Found' : 'Lost'}
        </span>
      </div>

      <div className="p-4">
        <p className="truncate text-base font-black text-[#0F172A]">{item.title}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.category}</p>
        <div className="mt-3 flex items-start gap-1.5 text-sm font-medium text-slate-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#1A56DB]" />
          <span className="line-clamp-1">{item.location}</span>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-400">{formatPublicDate(item.reportedAt)}</p>
      </div>
    </Link>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="public-skeleton aspect-[4/3]" />
      <div className="space-y-2 p-4">
        <div className="public-skeleton h-4 w-3/4 rounded" />
        <div className="public-skeleton h-3 w-1/3 rounded" />
        <div className="public-skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
