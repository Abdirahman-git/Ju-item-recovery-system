'use client';

import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';

/**
 * Name-based placeholder when an item has no (or hidden) photo.
 * Secure holds stay amber and never show a real photo — only a smart icon.
 */
export default function ItemNamePlaceholder({
  name,
  category,
  secure = false,
  size = 46,
  large = false,
  className = '',
}) {
  const Icon = getItemPlaceholderIcon(name, category);
  const iconSize = large ? Math.max(size, 88) : size;

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center ${
        secure
          ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700'
          : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500'
      } ${className}`}
    >
      <Icon size={iconSize} strokeWidth={1.5} />
    </div>
  );
}
