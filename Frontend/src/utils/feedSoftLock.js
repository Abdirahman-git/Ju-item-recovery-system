import { DeviceEventEmitter } from 'react-native';

export const FEED_SOFT_LOCK_EVENT = 'ju_feed_soft_lock';

/** In-memory soft-locks for instant feed updates (same device). */
const locked = new Map();

export function softLockKey(itemType, itemId) {
  const type = itemType === 'found' || String(itemType).toUpperCase() === 'FOUND' ? 'found' : 'lost';
  return `${type}:${Number(itemId)}`;
}

export function isSoftLockedLocally(item) {
  if (!item?.id) return false;
  const typeHint = item.type || item.item_type;
  return locked.has(softLockKey(typeHint, item.id));
}

export function applySoftLockFilter(items) {
  if (!Array.isArray(items) || locked.size === 0) return items;
  return items.filter((item) => !isSoftLockedLocally(item));
}

/**
 * Broadcast soft-lock so All Items / Dashboard hide or restore instantly.
 * @param {{ itemType: string, itemId: number|string, locked: boolean, item?: object }} payload
 */
export function emitFeedSoftLock(payload) {
  const type =
    payload.itemType === 'found' || String(payload.itemType).toUpperCase() === 'FOUND'
      ? 'found'
      : 'lost';
  const id = Number(payload.itemId);
  if (!id) return;

  const key = softLockKey(type, id);
  if (payload.locked) {
    locked.set(key, payload.item || true);
  } else {
    locked.delete(key);
  }

  DeviceEventEmitter.emit(FEED_SOFT_LOCK_EVENT, {
    type,
    id,
    locked: Boolean(payload.locked),
    item: payload.item || null,
  });
}

export function subscribeFeedSoftLock(handler) {
  const sub = DeviceEventEmitter.addListener(FEED_SOFT_LOCK_EVENT, handler);
  return () => sub.remove();
}
