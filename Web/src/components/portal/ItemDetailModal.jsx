'use client';

import { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Tag,
  Clock,
  Calendar,
  ShieldCheck,
  UserCheck,
  Package,
} from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { isSecureListing, normalizeItemStatus, ITEM_STATUS } from '@/lib/itemStatus';
import { getSecureItemDisplay } from '@/lib/secureItemDisplay';
import { normalizeOfficeLocation, STUDENT_AFFAIRS_OFFICE } from '@/lib/officeLocation';

export default function ItemDetailModal({ item, onClose, currentUserEmail, onClaimClick }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [item?.id, item?.imageURI]);

  if (!item) return null;

  const isOwner =
    currentUserEmail &&
    item.email &&
    item.email.toLowerCase() === currentUserEmail.toLowerCase();
  const isSecure = isSecureListing(item);
  const isReturned = normalizeItemStatus(item) === ITEM_STATUS.RETURNED;
  const secureDisplay = isSecure ? getSecureItemDisplay(item) : null;
  const displayName = isSecure ? secureDisplay.name : item.itemName;
  const displayLocation = isSecure
    ? normalizeOfficeLocation(
        item.security_location || item.location,
        STUDENT_AFFAIRS_OFFICE
      )
    : normalizeOfficeLocation(item.location, item.location || 'Campus');
  const typeLabel = isReturned ? 'Returned' : 'Lost Item';
  const typeColor = isReturned ? 'bg-slate-500' : 'bg-blue-600';
  const showPhoto = !isSecure && Boolean(item.imageURI) && !photoFailed;
  const listedVia = isOwner
    ? 'You'
    : isSecure
      ? 'Campus Security'
      : 'JU LOFO Desk';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${typeColor}`}
            >
              {isSecure && !isReturned ? 'Secure Hold' : typeLabel}
            </span>
            <span className="text-xs font-semibold text-slate-400">· {item.timeAgo}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div
            className={`relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-100 ${
              isSecure
                ? 'bg-amber-50'
                : 'bg-[linear-gradient(145deg,#f8fafc_0%,#eef2f7_100%)]'
            }`}
          >
            {showPhoto ? (
              <SafeRemoteImage
                src={item.imageURI}
                alt={displayName}
                fill
                className="object-contain object-center p-2"
                sizes="(max-width: 640px) 100vw, 500px"
                priority
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <div
                className={`flex h-full w-full flex-col items-center justify-center gap-2 ${
                  isSecure ? 'text-amber-600' : 'text-[#1A56DB]'
                }`}
              >
                <Package size={48} strokeWidth={1.5} className="opacity-70" />
                {isSecure ? (
                  <span className="text-xs font-bold uppercase tracking-wide">Photo hidden · Secure hold</span>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-950">{displayName}</h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Listed via <span className="text-slate-600">{listedVia}</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-slate-700">
                <Tag size={15} className="flex-shrink-0 text-slate-400" />
                <span className="truncate font-semibold">{item.category || 'Other'}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-slate-700">
                <MapPin size={15} className="flex-shrink-0 text-slate-400" />
                <span className="truncate font-semibold">{displayLocation}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-slate-700">
                <Calendar size={15} className="flex-shrink-0 text-slate-400" />
                <span className="truncate font-semibold">
                  {item.dateLost || item.dateFound || 'Recently'}
                </span>
              </div>
              {item.timeLost ? (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-slate-700">
                  <Clock size={15} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate font-semibold">{item.timeLost}</span>
                </div>
              ) : null}
            </div>
          </div>

          {isSecure && secureDisplay?.showNotice ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Public notice
              </span>
              <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-amber-950">
                {secureDisplay.notice}
              </p>
            </div>
          ) : null}

          {!isSecure && item.description ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Description
              </span>
              <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-700">
                {item.description}
              </p>
            </div>
          ) : null}

          {isOwner ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-[#1A56DB]">
              <UserCheck size={18} className="flex-shrink-0" />
              <span className="font-semibold">
                You reported this item. Track its status under{' '}
                <strong className="font-bold">My Items</strong>.
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-[#1A56DB]" />
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    {isSecure ? 'Claim this secure hold?' : 'Recognize this item?'}
                  </p>
                  <p className="mt-0.5 text-slate-500">
                    {isSecure
                      ? 'Photos are hidden for security. Submit an ownership challenge or visit Student Affairs office.'
                      : 'If this belongs to you, claim ownership with a verification challenge or visit the Lost & Found office.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {isOwner ? 'Close' : 'Not mine'}
          </button>
          {!isOwner ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onClaimClick?.(item);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A56DB] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
            >
              <ShieldCheck size={15} />
              <span>{isSecure ? 'Claim Secure Item' : 'Claim Item'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
