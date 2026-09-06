'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import ItemNamePlaceholder from '@/components/admin/ItemNamePlaceholder';
import { formatPublicDate } from '@/lib/publicItems';

export default function ItemCard({ item, index = 0, reveal = true }) {
  const [failed, setFailed] = useState(false);
  const isSecure = Boolean(item.isSecure);

  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl]);

  const showPhoto = !isSecure && item.imageUrl && !failed;

  return (
    <Link
      href={`/browse/${item.slug}`}
      className={`public-item-card group flex cursor-pointer overflow-hidden rounded-[18px] bg-white p-1.5 sm:block sm:rounded-[20px] sm:p-0 ${
        reveal ? 'public-reveal' : ''
      }`}
      style={reveal ? { animationDelay: `${Math.min(index, 8) * 90}ms` } : undefined}
    >
      <div className="relative h-[6.75rem] w-[6.75rem] shrink-0 overflow-hidden rounded-[12px] bg-slate-100 sm:h-auto sm:w-full sm:aspect-[4/3] sm:rounded-none">
        {showPhoto ? (
          <SafeRemoteImage
            src={item.imageUrl}
            alt={item.title}
            fill
            className="public-item-photo object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 108px, (max-width: 1024px) 50vw, 33vw"
            onError={() => setFailed(true)}
          />
        ) : (
          <ItemNamePlaceholder
            name={item.title || item.itemName}
            category={item.category}
            secure={isSecure}
            size={36}
            className="sm:[&_svg]:h-12 sm:[&_svg]:w-12"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-1.5 sm:p-4">
        <p className="truncate text-[14px] font-black leading-snug text-[#0F172A] sm:text-base">
          {item.title}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:mt-1 sm:text-xs">
          {item.category}
        </p>
        {isSecure && item.description ? (
          <p className="public-item-secure-note mt-1.5 hidden line-clamp-1 text-sm font-medium text-amber-800/80 sm:mt-2 sm:block">
            {item.description}
          </p>
        ) : null}
        <div className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-slate-600 sm:mt-3 sm:min-h-10 sm:gap-1.5 sm:text-sm">
          <MapPin size={12} className="mt-0.5 shrink-0 text-[#1A56DB] sm:h-[14px] sm:w-[14px]" />
          <span className="line-clamp-1 text-pretty">{item.location}</span>
        </div>
        <p className="mt-1 text-[10px] font-semibold tabular-nums text-slate-400 sm:mt-2 sm:text-xs">
          {formatPublicDate(item.reportedAt)}
        </p>
      </div>
    </Link>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="public-item-card flex overflow-hidden rounded-[18px] bg-white p-1.5 sm:block sm:rounded-[20px] sm:p-0">
      <div className="public-skeleton h-[6.75rem] w-[6.75rem] shrink-0 rounded-[12px] sm:h-auto sm:w-full sm:aspect-[4/3] sm:rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-2 px-3 py-1.5 sm:p-4">
        <div className="public-skeleton h-3.5 w-3/4 rounded sm:h-4" />
        <div className="public-skeleton h-2.5 w-1/3 rounded sm:h-3" />
        <div className="public-skeleton h-2.5 w-1/2 rounded sm:h-3" />
      </div>
    </div>
  );
}
