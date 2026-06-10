import { isFeedVisible } from './itemStatus';

export function isLostItemRecord(item) {
  const t = String(item?.type || '').toUpperCase();
  if (t === 'FOUND') return false;
  if (t === 'LOST') return true;
  if (item?.dateFound || item?.finderName) return false;
  return !!(item?.dateLost || item?.ownerName);
}

export function isOwnReportedItem(item, userEmail, sessionUserName = '') {
  if (!item) return false;

  const user = userEmail?.trim().toLowerCase();
  if (user && item.email?.trim().toLowerCase() === user) return true;

  const sessionName = sessionUserName?.trim().toLowerCase();
  const names = [item.ownerName, item.finderName]
    .map((n) => n?.trim().toLowerCase())
    .filter(Boolean);
  return !!sessionName && names.includes(sessionName);
}

/** Someone else's live/found listing — can request ownership. */
export function canShowThisIsMine(item, userEmail, sessionUserName = '') {
  if (!userEmail || !item || !isFeedVisible(item)) return false;
  return !isOwnReportedItem(item, userEmail, sessionUserName);
}

export function canShowNotMine(item, userEmail, sessionUserName = '') {
  return canShowThisIsMine(item, userEmail, sessionUserName);
}

export function shouldShowClaimSection(item, userEmail, sessionUserName = '', dismissed = false) {
  if (dismissed) return false;
  return canShowThisIsMine(item, userEmail, sessionUserName);
}

export const dismissStorageKey = (item) => {
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  return `claim_dismissed_${type}_${item.id}`;
};

export const pendingClaimStorageKey = (item) => {
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  return `claim_pending_${type}_${item.id}`;
};
