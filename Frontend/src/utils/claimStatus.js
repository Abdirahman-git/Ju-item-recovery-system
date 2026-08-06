export const CLAIM_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export function normalizeClaimStatus(claim) {
  const raw = claim?.status;
  if (raw === CLAIM_STATUS.APPROVED || raw === CLAIM_STATUS.REJECTED || raw === CLAIM_STATUS.PENDING) {
    return raw;
  }
  return CLAIM_STATUS.PENDING;
}

export function getClaimStatusBadgeConfig(status) {
  switch (status) {
    case CLAIM_STATUS.APPROVED:
      return {
        label: 'Approved',
        bg: '#DCFCE7',
        color: '#15803D',
        icon: 'checkmark-circle',
      };
    case CLAIM_STATUS.REJECTED:
      return {
        label: 'Rejected',
        bg: '#FEE2E2',
        color: '#DC2626',
        icon: 'close-circle',
      };
    case CLAIM_STATUS.PENDING:
    default:
      return {
        label: 'Pending review',
        bg: '#FEF3C7',
        color: '#B45309',
        icon: 'time',
      };
  }
}

export function getClaimSnapshot(claim) {
  const breakdown = claim?.match_breakdown || claim?.matchBreakdown;
  if (!breakdown || typeof breakdown !== 'object') return null;
  return {
    itemName: breakdown.item_name || breakdown.itemName || null,
    category: breakdown.category || null,
    imageURI: breakdown.image_uri || breakdown.imageURI || null,
    location: breakdown.location || null,
  };
}
