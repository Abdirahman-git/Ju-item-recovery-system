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

/** Statuses visible on the public student feed. */
export const FEED_STATUSES = [ITEM_STATUS.LIVE];

export function isSecureListing(item) {
  if (!item) return false;
  return item.listing_mode === LISTING_MODE.SECURE || item.listingMode === LISTING_MODE.SECURE;
}

/** Any secure listing (live hold or secure draft) — amber ! mark. */
export function isSecureFoundItem(item) {
  if (!item) return false;
  return isSecureListing(item);
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

export function isFeedVisible(item) {
  const raw = typeof item?.status === 'string' ? item.status.trim().toLowerCase() : '';
  if (raw === 'claim_pending' || raw === 'awaiting_pickup' || raw === 'matched') return false;
  return FEED_STATUSES.includes(normalizeItemStatus(item));
}

export function isPendingReview(item) {
  return normalizeItemStatus(item) === ITEM_STATUS.PENDING_REVIEW;
}

export function isDraftItem(item) {
  return normalizeItemStatus(item) === ITEM_STATUS.DRAFT;
}

/**
 * UI lifecycle: everything is Lost until Returned (including secure holds).
 * Returned = recovered to owner.
 */
export function getDisplayStatus(item) {
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.DRAFT) {
    return { label: 'Draft', bg: '#EDE9FE', color: '#6D28D9' };
  }
  if (status === ITEM_STATUS.RETURNED) {
    return { label: 'Returned', bg: '#E2E8F0', color: '#475569' };
  }
  if (status === 'matched' || item?.status === 'matched') {
    return { label: 'Matched', bg: '#DBEAFE', color: '#1D4ED8' };
  }
  if (status === ITEM_STATUS.PENDING_REVIEW) {
    return { label: 'Pending', bg: '#FEF3C7', color: '#B45309' };
  }
  return { label: 'Lost', bg: '#FEE2E2', color: '#DC2626' };
}

export function getDisplayTypeLabel(item) {
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.RETURNED) return 'Returned';
  return 'Lost';
}

export function getStatusBadgeConfig(status) {
  const key =
    status === 'matched' || status === 'claim_pending' ? ITEM_STATUS.LIVE : status || ITEM_STATUS.PENDING_REVIEW;
  switch (key) {
    case ITEM_STATUS.DRAFT:
      return { label: 'Draft', bg: '#EDE9FE', color: '#6D28D9' };
    case ITEM_STATUS.PENDING_REVIEW:
      return { label: 'Pending review', bg: '#FEF3C7', color: '#B45309' };
    case ITEM_STATUS.LIVE:
      return { label: 'Live', bg: '#DCFCE7', color: '#15803D' };
    case ITEM_STATUS.RETURNED:
      return { label: 'Returned', bg: '#E2E8F0', color: '#475569' };
    default:
      return { label: 'Unknown', bg: '#F1F5F9', color: '#64748B' };
  }
}
