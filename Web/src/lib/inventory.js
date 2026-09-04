import { ITEM_STATUS, isSecureListing, normalizeItemStatus } from './itemStatus';

function claimsHrefForItem(item, itemType) {
  const id = item?.id;
  if (id == null) return '/admin/claims';
  const type = itemType === 'lost' ? 'lost' : 'found';
  return `/admin/claims?itemId=${encodeURIComponent(String(id))}&itemType=${type}`;
}

export function getInventoryCardMeta(item) {
  const rawStatus = item?.status;
  const normalized = normalizeItemStatus(item);
  const itemType = item?.itemType || 'lost';

  if (normalized === ITEM_STATUS.DRAFT || rawStatus === 'draft') {
    const draftId = item?.id;
    const isSecureDraft = itemType === 'found' && isSecureListing(item);
    const continueHref =
      draftId != null
        ? isSecureDraft
          ? `/admin/secure-found?draft=${draftId}`
          : itemType === 'found'
            ? `/admin/found?draft=${draftId}`
            : `/admin/lost?draft=${draftId}`
        : isSecureDraft
          ? '/admin/secure-found'
          : itemType === 'found'
            ? '/admin/found'
            : '/admin/lost';

    return {
      filterStatus: 'draft',
      badge: { label: isSecureDraft ? 'SECURE DRAFT' : 'DRAFT', className: 'bg-violet-600/95 text-white' },
      overlay: isSecureDraft ? 'Secure Draft' : 'Draft Item',
      action: {
        label: isSecureDraft ? 'Continue Secure' : 'Continue Lost',
        variant: 'primary',
        href: continueHref,
      },
    };
  }

  if (normalized === ITEM_STATUS.RETURNED || rawStatus === 'returned') {
    return {
      filterStatus: 'returned',
      badge: { label: 'RETURNED', className: 'bg-slate-700/90 text-white' },
      overlay: null,
      action: { label: 'Details', variant: 'ghost' },
    };
  }

  if (rawStatus === 'matched' || normalized === 'matched') {
    return {
      filterStatus: 'matched',
      badge: { label: 'MATCHED', className: 'bg-[#1A56DB]/95 text-white' },
      overlay: 'Pending Return',
      action: {
        label: 'Process Return',
        variant: 'primary',
        href: claimsHrefForItem(item, itemType),
      },
    };
  }

  if (normalized === ITEM_STATUS.PENDING_REVIEW) {
    return {
      // Still inventoriable under Lost / All; badge shows review state
      filterStatus: 'lost',
      badge: {
        label: 'PENDING REVIEW',
        className: 'bg-amber-600/95 text-white',
      },
      overlay: 'Awaiting Review',
      action: { label: 'Review', variant: 'primary', href: '/admin/pending' },
    };
  }

  if (itemType === 'found' && isSecureListing(item) && normalized === ITEM_STATUS.LIVE) {
    return {
      filterStatus: 'secure',
      badge: { label: 'LOST', className: 'bg-red-600/95 text-white' },
      overlay: 'Security Hold',
      action: { label: 'Manage', variant: 'primary' },
    };
  }

  const claimHold =
    rawStatus === 'claim_pending' ||
    rawStatus === 'awaiting_pickup' ||
    rawStatus === 'ready_pickup';
  if (claimHold) {
    const physical = rawStatus === 'awaiting_pickup';
    return {
      filterStatus: 'lost',
      badge: { label: 'LOST', className: 'bg-red-600/95 text-white' },
      overlay: physical ? 'Physical verify' : 'Challenge hold',
      action: {
        label: physical ? 'Confirm office' : 'View request',
        variant: 'success',
        href: claimsHrefForItem(item, itemType),
      },
    };
  }

  if (itemType === 'found') {
    return {
      filterStatus: 'lost',
      badge: { label: 'LOST', className: 'bg-red-600/95 text-white' },
      overlay: null,
      action: { label: 'Details', variant: 'ghost' },
    };
  }

  return {
    filterStatus: 'lost',
    badge: { label: 'LOST', className: 'bg-red-600/95 text-white' },
    overlay: null,
    action: { label: 'Details', variant: 'ghost' },
  };
}

/** Live published inventory rows (not draft / pending / claims queue) may be marked returned by admin. */
export function canMarkInventoryItemReturned(item) {
  if (!item) return false;

  const meta = getInventoryCardMeta(item);
  const normalized = normalizeItemStatus(item);
  const rawStatus = item?.status;

  if (meta.filterStatus === 'draft' || meta.filterStatus === 'returned') return false;
  if (normalized === ITEM_STATUS.PENDING_REVIEW) return false;
  if (
    rawStatus === 'matched' ||
    rawStatus === 'claim_pending' ||
    rawStatus === 'awaiting_pickup' ||
    rawStatus === 'ready_pickup'
  ) {
    return false;
  }

  return meta.filterStatus === 'secure' || meta.filterStatus === 'lost';
}

export function sortInventoryItems(items, sortBy) {
  const list = [...items];
  if (sortBy === 'oldest') {
    return list.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
  }
  if (sortBy === 'name') {
    return list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }
  if (sortBy === 'name-desc') {
    return list.sort((a, b) => (b.displayName || '').localeCompare(a.displayName || ''));
  }
  // newest (default)
  return list.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
}

export function filterInventoryItems(items, { status, category, search }) {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    const meta = getInventoryCardMeta(item);
    const matchStatus =
      status === 'all' ||
      (status === 'secure' && meta.filterStatus === 'secure') ||
      (status === 'draft' && meta.filterStatus === 'draft') ||
      (status === 'matched' && meta.filterStatus === 'matched') ||
      (status === 'lost' && (meta.filterStatus === 'lost' || meta.filterStatus === 'found'));
    const matchCategory = category === 'all' || item.displayCategory === category;
    const matchSearch =
      !q ||
      item.displayName?.toLowerCase().includes(q) ||
      item.inventoryRef?.toLowerCase().includes(q) ||
      item.refId?.toLowerCase().includes(q) ||
      item.displayLocation?.toLowerCase().includes(q) ||
      item.displayCategory?.toLowerCase().includes(q) ||
      item.displayDescription?.toLowerCase().includes(q);
    return matchStatus && matchCategory && matchSearch;
  });
}
