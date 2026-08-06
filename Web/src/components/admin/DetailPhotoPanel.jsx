'use client';

import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { Package } from 'lucide-react';

/**
 * Full-bleed photo stage for admin detail / review modals.
 * Shows the entire image clearly (object-contain) on a calm stage — no cropping.
 */
export default function DetailPhotoPanel({
  src,
  alt = '',
  badge,
  emptyIcon: EmptyIcon = Package,
  emptyLabel = 'No image uploaded',
  className = '',
}) {
  return (
    <div
      className={`relative flex min-h-[300px] overflow-hidden rounded-2xl border border-slate-200/80 bg-[#eef1f6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)] lg:h-full lg:min-h-[280px] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.9) 0%, transparent 62%), linear-gradient(145deg, #f8fafc 0%, #e8edf5 100%)',
        }}
      />

      {src ? (
        <div className="relative z-[1] h-full min-h-[280px] w-full">
          <SafeRemoteImage
            src={src}
            alt={alt}
            fill
            className="object-contain object-center p-1 sm:p-1.5"
            sizes="(max-width:1024px) 100vw, 640px"
            priority
          />
        </div>
      ) : (
        <div className="relative z-[1] flex h-full min-h-[300px] w-full flex-col items-center justify-center gap-2 text-slate-400">
          <EmptyIcon size={48} strokeWidth={1.5} />
          <p className="text-sm font-semibold">{emptyLabel}</p>
        </div>
      )}

      {badge ? (
        <span
          className={`absolute left-2.5 top-2.5 z-[2] rounded-full border border-white/70 px-2.5 py-1 text-[10px] font-black uppercase shadow-md backdrop-blur-md ${badge.className}`}
        >
          {badge.label}
        </span>
      ) : null}
    </div>
  );
}
