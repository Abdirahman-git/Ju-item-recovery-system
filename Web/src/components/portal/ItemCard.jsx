'use client';

import { useState } from 'react';
import {
  MapPin,
  Tag,
  Calendar,
  ShieldCheck,
  Package,
  ArrowUpRight,
} from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { isSecureListing, normalizeItemStatus, ITEM_STATUS } from '@/lib/itemStatus';
import { getSecureItemDisplay } from '@/lib/secureItemDisplay';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';
import { normalizeOfficeLocation, STUDENT_AFFAIRS_OFFICE } from '@/lib/officeLocation';

const LOST_BLUE = '#1A56DB';
const SECURE_AMBER = '#D97706';
const RETURNED_SLATE = '#64748B';

function isAdminPosted(item) {
  const email = String(item?.email || '').toLowerCase();
  return (
    (email && email.includes('admin')) ||
    item?.userId === 'admin-01' ||
    item?.finderId === 'admin-01'
  );
}

function PhotoStage({
  src,
  alt,
  isSecure,
  PlaceholderIcon,
  typeColor,
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed && !isSecure;

  if (!showPhoto) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            isSecure ? 'bg-amber-100' : 'bg-blue-50'
          }`}
        >
          <PlaceholderIcon
            size={28}
            strokeWidth={1.5}
            style={{ color: isSecure ? SECURE_AMBER : typeColor }}
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isSecure ? 'Secure hold' : 'No photo'}
        </span>
      </div>
    );
  }

  return (
    <SafeRemoteImage
      src={src}
      alt={alt}
      fill
      className="object-contain object-center p-2 transition duration-300 group-hover:scale-[1.02]"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Vertical column card — full photo visible (no crop), details below.
 * Public UI shows LOST until RETURNED; secure listings hide photos.
 */
export default function ItemCard({ item, onClick }) {
  const isSecure = isSecureListing(item);
  const isReturned = normalizeItemStatus(item) === ITEM_STATUS.RETURNED;
  const secureDisplay = isSecure ? getSecureItemDisplay(item) : null;
  const typeColor = isReturned ? RETURNED_SLATE : LOST_BLUE;
  const typeLabel = isReturned ? 'RETURNED' : 'LOST';
  const displayName = isSecure ? secureDisplay.name : item.itemName;
  const displayLocation = isSecure
    ? normalizeOfficeLocation(
        item.security_location || item.location,
        STUDENT_AFFAIRS_OFFICE
      )
    : normalizeOfficeLocation(item.location, item.location || 'Campus');
  const displayDate = isSecure
    ? item.dateFound || item.date_found || item.timeAgo || ''
    : item.timeAgo || item.dateLost || item.dateFound || '';
  const PlaceholderIcon = getItemPlaceholderIcon(displayName, item.category) || Package;

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className="group flex w-full flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white text-left shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_32px_rgba(26,86,219,0.12)]"
    >
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden ${
          isSecure
            ? 'bg-amber-50'
            : 'bg-[linear-gradient(145deg,#f8fafc_0%,#eef2f7_100%)]'
        }`}
      >
        <PhotoStage
          src={item.imageURI}
          alt={displayName || 'Item'}
          isSecure={isSecure}
          PlaceholderIcon={PlaceholderIcon}
          typeColor={typeColor}
        />

        <span
          className="absolute left-3 top-3 z-[1] rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-md"
          style={{ backgroundColor: typeColor }}
        >
          {typeLabel}
        </span>

        {isAdminPosted(item) && !isSecure ? (
          <span className="absolute right-3 top-3 z-[1] inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-white/95 px-2 py-0.5 text-[9px] font-extrabold text-blue-800 shadow-sm backdrop-blur-sm">
            <ShieldCheck size={10} />
            ADMIN
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="inline-flex w-fit max-w-full items-center gap-1 truncate rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          <Tag size={11} className="flex-shrink-0 text-slate-400" />
          <span className="truncate">{item.category || 'General'}</span>
        </span>

        <h3 className="line-clamp-1 text-[15px] font-black text-slate-900 transition group-hover:text-[#1A56DB]">
          {displayName}
        </h3>

        {isSecure && secureDisplay?.showNotice ? (
          <p className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-600">
            {secureDisplay.notice}
          </p>
        ) : null}

        {!isSecure && item.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="inline-flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500">
              <MapPin size={12} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{displayLocation}</span>
            </span>
            {displayDate ? (
              <span className="inline-flex items-center gap-1 truncate text-[11px] font-semibold text-slate-400">
                <Calendar size={12} className="flex-shrink-0" />
                <span className="truncate">{displayDate}</span>
              </span>
            ) : null}
          </div>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB] transition group-hover:bg-[#1A56DB] group-hover:text-white">
            <ArrowUpRight size={15} strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </button>
  );
}
