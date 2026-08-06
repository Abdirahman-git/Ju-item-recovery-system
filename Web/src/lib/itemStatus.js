export const ITEM_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  LIVE: 'live',
  RETURNED: 'returned',
};

export const LISTING_MODE = {
  PUBLIC: 'public',
  SECURE: 'secure',
};

export function isSecureListing(item) {
  if (!item) return false;
  return item.listing_mode === LISTING_MODE.SECURE || item.listingMode === LISTING_MODE.SECURE;
}

/** Any secure found listing (live hold or secure draft) — use for the amber ! mark. */
export function isSecureFoundItem(item) {
  if (!item) return false;
  const type = item.itemType || item.type;
  const isFound = type === 'found' || String(type || '').toUpperCase() === 'FOUND';
  return isFound && isSecureListing(item);
}

export function normalizeItemStatus(item) {
  if (!item) return ITEM_STATUS.PENDING_REVIEW;
  const raw = item.status;
  if (raw === 'matched' || raw === 'claim_pending') return ITEM_STATUS.LIVE;
  if (raw && typeof raw === 'string') return raw.trim();
  if (item.is_approved === true) return ITEM_STATUS.LIVE;
  if (item.is_approved === false) return ITEM_STATUS.PENDING_REVIEW;
  return ITEM_STATUS.PENDING_REVIEW;
}

export function getDisplayStatus(item, itemType) {
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.DRAFT) return { label: 'Draft', className: 'bg-violet-50 text-violet-700' };
  if (status === ITEM_STATUS.RETURNED) return { label: 'Returned', className: 'bg-slate-100 text-slate-600' };
  if (status === 'matched' || item.status === 'matched') {
    return { label: 'Matched', className: 'bg-blue-50 text-blue-700' };
  }
  if (status === ITEM_STATUS.PENDING_REVIEW) {
    return { label: 'Pending', className: 'bg-amber-50 text-amber-700' };
  }
  if (itemType === 'found') {
    return { label: 'Found', className: 'bg-emerald-50 text-emerald-700' };
  }
  return { label: 'Lost', className: 'bg-red-50 text-red-600' };
}
