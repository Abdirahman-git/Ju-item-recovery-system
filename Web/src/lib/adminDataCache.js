/** In-memory cache so admin pages reopen instantly with stale data while refreshing. */
const store = new Map();
const listeners = new Map();
const DEFAULT_STALE_MS = 5000;

function notify(key, data) {
  listeners.get(key)?.forEach((cb) => {
    try {
      cb(data);
    } catch {
      /* ignore listener errors */
    }
  });
}

export function getAdminCache(key) {
  return store.get(key) ?? null;
}

/** Convenience: returns cached payload array/object, or null. */
export function getAdminCacheData(key) {
  return store.get(key)?.data ?? null;
}

export function isAdminCacheFresh(key, maxAgeMs = DEFAULT_STALE_MS) {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.at < maxAgeMs;
}

export function setAdminCache(key, data) {
  store.set(key, { data, at: Date.now() });
  notify(key, data);
}

export function clearAdminCache(key) {
  store.delete(key);
  notify(key, null);
}

/** Drop caches so the next page visit refetches immediately (avoids 5s stale window). */
export function invalidateAdminCaches(...keys) {
  keys.forEach((key) => {
    if (key) clearAdminCache(key);
  });
}

export const INVENTORY_CACHE_KEYS = [
  'admin:items',
  'admin:drafts',
  'admin:returned',
  'admin:dashboard',
  'admin:reports',
  'admin:pending',
];

export const CLAIM_CACHE_KEYS = ['admin:claims', 'admin:items', 'admin:returned', 'admin:dashboard', 'admin:reports'];

/** Prefer this over spreading INVENTORY_CACHE_KEYS across modules (avoids HMR/bundle undefined spreads). */
export function invalidateInventoryCaches() {
  invalidateAdminCaches(
    'admin:items',
    'admin:drafts',
    'admin:returned',
    'admin:dashboard',
    'admin:reports',
    'admin:pending'
  );
}

export function invalidateClaimCaches() {
  invalidateAdminCaches('admin:claims', 'admin:items', 'admin:returned', 'admin:dashboard', 'admin:reports');
}

export function subscribeAdminCache(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key)?.delete(callback);
}
