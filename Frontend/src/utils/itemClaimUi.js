import { isFeedVisible, isSecureListing } from './itemStatus';

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

export const dismissStorageKey = (item, userEmail = '') => {
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  const email = String(userEmail || '').trim().toLowerCase() || 'anon';
  return `claim_dismissed_${email}_${type}_${item.id}`;
};

export const pendingClaimStorageKey = (item, userEmail = '') => {
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  const email = String(userEmail || '').trim().toLowerCase() || 'anon';
  return `claim_pending_${email}_${type}_${item.id}`;
};

export const approvedClaimStorageKey = (item, userEmail = '') => {
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  const email = String(userEmail || '').trim().toLowerCase() || 'anon';
  return `claim_approved_${email}_${type}_${item.id}`;
};

/** Per-user only — never share reject/pending flags across accounts on one device. */
export const rejectedClaimStorageKey = (item, userEmail = '') => {
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  const email = String(userEmail || '').trim().toLowerCase() || 'anon';
  return `claim_rejected_${email}_${type}_${item.id}`;
};

/** Remove old device-wide keys that blocked every account on the same phone. */
export async function clearLegacySharedClaimFlags(item, AsyncStorage) {
  if (!item?.id || !AsyncStorage?.removeItem) return;
  const type = isLostItemRecord(item) ? 'lost' : 'found';
  await Promise.all([
    AsyncStorage.removeItem(`claim_rejected_${type}_${item.id}`),
    AsyncStorage.removeItem(`claim_pending_${type}_${item.id}`),
    AsyncStorage.removeItem(`claim_dismissed_${type}_${item.id}`),
  ]);
}
