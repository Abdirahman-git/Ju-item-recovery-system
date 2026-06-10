export const ITEM_STATUS = {
  PENDING_REVIEW: 'pending_review',
  LIVE: 'live',
  RETURNED: 'returned',
};

/** Statuses visible on the public student feed (Lost / Found lists). */
export const FEED_STATUSES = [ITEM_STATUS.LIVE];

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
  return FEED_STATUSES.includes(normalizeItemStatus(item));
}

export function isPendingReview(item) {
  return normalizeItemStatus(item) === ITEM_STATUS.PENDING_REVIEW;
}

export function getStatusBadgeConfig(status) {
  const key =
    status === 'matched' || status === 'claim_pending' ? ITEM_STATUS.LIVE : status || ITEM_STATUS.PENDING_REVIEW;
  switch (key) {
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
