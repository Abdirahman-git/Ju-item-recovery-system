'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Package, ShieldAlert } from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { formatPublicDate } from '@/lib/publicItems';

export default function ItemCard({ item, index = 0, reveal = true }) {
  const [failed, setFailed] = useState(false);
  const isFound = item.itemType === 'found';
  const isSecure = Boolean(item.isSecure);

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl]);

  const badgeClass = isSecure
    ? 'bg-amber-600'
    : isFound
      ? 'bg-[#1A56DB]'
      : 'bg-amber-500';
  const badgeLabel = isSecure ? 'Secure' : isFound ? 'Found' : 'Lost';

  return (
    <Link
      href={`/browse/${item.slug}`}
      className={`public-item-card group block cursor-pointer overflow-hidden rounded-[14px] bg-white sm:rounded-[20px] ${
        reveal ? 'public-reveal' : ''
      }`}
      style={reveal ? { animationDelay: `${Math.min(index, 8) * 90}ms` } : undefined}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-slate-100 sm:aspect-[4/3]">
        {isSecure || !item.imageUrl || failed ? (
          <div
            className={`relative flex h-full w-full items-center justify-center ${
              isSecure
                ? 'bg-amber-50 text-amber-700'
                : isFound
                  ? 'bg-blue-50 text-[#1A56DB]'
                  : 'bg-amber-50 text-amber-600'
            }`}
          >
            {isSecure ? (
              <span className="relative inline-flex">
                <ShieldAlert className="h-7 w-7 sm:h-10 sm:w-10" strokeWidth={1.5} />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[9px] font-black text-white sm:-right-1 sm:-top-1 sm:h-5 sm:w-5 sm:text-[11px]">
                  !
                </span>
              </span>
            ) : (
              <Package className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.5} />
            )}
          </div>
        ) : (
          <SafeRemoteImage
            src={item.imageUrl}
            alt={item.title}
            fill
            className="public-item-photo object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setFailed(true)}
          />
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px] ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="p-2.5 sm:p-4">
        <p className="truncate text-[13px] font-black leading-snug text-[#0F172A] sm:text-base">
          {item.title}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:mt-1 sm:text-xs">
          {item.category}
        </p>
        {isSecure && item.description ? (
          <p className="mt-1.5 hidden line-clamp-1 text-sm font-medium text-amber-800/80 sm:mt-2 sm:block">
            {item.description}
          </p>
        ) : null}
        <div className="mt-2 flex items-start gap-1 text-[11px] font-medium text-slate-600 sm:mt-3 sm:min-h-10 sm:gap-1.5 sm:text-sm">
          <MapPin size={12} className="mt-0.5 shrink-0 text-[#1A56DB] sm:h-[14px] sm:w-[14px]" />
          <span className="line-clamp-1 text-pretty">{item.location}</span>
        </div>
        <p className="mt-1.5 text-[10px] font-semibold tabular-nums text-slate-400 sm:mt-2 sm:text-xs">
          {formatPublicDate(item.reportedAt)}
        </p>
      </div>
    </Link>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04),0_8px_24px_rgba(15,23,42,0.06)] sm:rounded-[20px]">
      <div className="public-skeleton aspect-[5/4] sm:aspect-[4/3]" />
      <div className="space-y-2 p-2.5 sm:p-4">
        <div className="public-skeleton h-3.5 w-3/4 rounded sm:h-4" />
        <div className="public-skeleton h-2.5 w-1/3 rounded sm:h-3" />
        <div className="public-skeleton h-2.5 w-1/2 rounded sm:h-3" />
      </div>
    </div>
  );
}
