import { ITEM_STATUS, isSecureListing, normalizeItemStatus } from './itemStatus';

/** Live published inventory rows (not draft / pending / claims queue) may be marked returned by admin. */
export function canMarkInventoryItemReturned(item) {
  if (!item) return false;

  const normalized = normalizeItemStatus(item);
  const rawStatus = item?.status;
  const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');

  if (normalized === ITEM_STATUS.DRAFT || rawStatus === 'draft') return false;
  if (normalized === ITEM_STATUS.RETURNED || rawStatus === 'returned') return false;
  if (normalized === ITEM_STATUS.PENDING_REVIEW) return false;
  if (rawStatus === 'matched' || rawStatus === 'claim_pending' || rawStatus === 'ready_pickup') return false;

  // Treat approved / live inventory as returnable (covers older rows without status column).
  const isLive =
    normalized === ITEM_STATUS.LIVE ||
    item.is_approved === true ||
    rawStatus === 'live' ||
    rawStatus === 'approved';

  if (!isLive) return false;

  if (itemType === 'found' && isSecureListing(item)) return true;
  if (itemType === 'found' || itemType === 'lost') return true;

  return false;
}
