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

/** Statuses visible on the public student feed (match mobile). */
export const FEED_STATUSES = [ITEM_STATUS.LIVE];

export function isSecureListing(item) {
  if (!item) return false;
  return item.listing_mode === LISTING_MODE.SECURE || item.listingMode === LISTING_MODE.SECURE;
}

export function isFeedVisible(item) {
  const raw = typeof item?.status === 'string' ? item.status.trim().toLowerCase() : '';
  if (raw === 'claim_pending' || raw === 'awaiting_pickup' || raw === 'matched') return false;
  return FEED_STATUSES.includes(normalizeItemStatus(item));
}

/** Any secure listing (live hold or secure draft) — amber ! mark. */
export function isSecureFoundItem(item) {
  if (!item) return false;
  return isSecureListing(item);
}

export function normalizeItemStatus(item) {
  if (!item) return ITEM_STATUS.PENDING_REVIEW;
  const raw = typeof item.status === 'string' ? item.status.trim().toLowerCase() : item.status;
  if (raw === 'matched' || raw === 'claim_pending') return ITEM_STATUS.LIVE;
  if (raw && typeof raw === 'string') return raw;
  if (item.is_approved === true) return ITEM_STATUS.LIVE;
  if (item.is_approved === false) return ITEM_STATUS.PENDING_REVIEW;
  return ITEM_STATUS.PENDING_REVIEW;
}

/**
 * UI lifecycle: everything is Lost until Returned (including secure holds).
 * Returned = recovered to owner.
 */
export function getDisplayStatus(item, itemType) {
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.DRAFT) return { label: 'Draft', className: 'bg-violet-50 text-violet-700' };
  if (status === ITEM_STATUS.RETURNED) return { label: 'Returned', className: 'bg-slate-100 text-slate-600' };
  if (item?.status === 'claim_pending' || item?.status === 'awaiting_pickup') {
    return { label: 'Claim hold', className: 'bg-blue-50 text-blue-700' };
  }
  if (status === 'matched' || item.status === 'matched') {
    return { label: 'Matched', className: 'bg-blue-50 text-blue-700' };
  }
  if (status === ITEM_STATUS.PENDING_REVIEW) {
    return { label: 'Pending', className: 'bg-amber-50 text-amber-700' };
  }
  return { label: 'Lost', className: 'bg-red-50 text-red-600' };
}

/** Type chip for tables — Lost / Returned only (secure holds also show Lost). */
export function getDisplayTypeLabel(item, itemType) {
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.RETURNED) return 'Returned';
  return 'Lost';
}
