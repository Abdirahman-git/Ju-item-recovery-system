'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';

export default function ItemThumbnail({ src, alt, itemType }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          itemType === 'found' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
        }`}
      >
        <Package size={18} />
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
