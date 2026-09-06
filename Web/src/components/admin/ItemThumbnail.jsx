'use client';

import { useEffect, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';

export default function ItemThumbnail({ src, alt, itemType, itemName, category }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const PlaceholderIcon = getItemPlaceholderIcon(itemName || alt, category);
    return (
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          itemType === 'found' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
        }`}
      >
        <PlaceholderIcon size={18} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <SafeRemoteImage
        src={src}
        alt={alt || 'Item photo'}
        fill
        className="object-cover"
        sizes="44px"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
