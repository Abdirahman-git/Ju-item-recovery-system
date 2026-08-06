import AsyncStorage from '@react-native-async-storage/async-storage';

const keyForEmail = (email) =>
  `notificationsClearedAt:${String(email || '').trim().toLowerCase()}`;

/** ISO timestamp after which inbox items are shown for this user. */
export async function getNotificationsClearedAt(userEmail) {
  const email = String(userEmail || '').trim().toLowerCase();
  if (!email) return null;
  try {
    const raw = await AsyncStorage.getItem(keyForEmail(email));
    if (!raw) return null;
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? raw : null;
  } catch {
    return null;
  }
}

/** Clear inbox: hide everything created at or before now. Newer inserts still appear. */
export async function clearNotificationsInbox(userEmail) {
  const email = String(userEmail || '').trim().toLowerCase();
  if (!email) return null;
  const at = new Date().toISOString();
  await AsyncStorage.setItem(keyForEmail(email), at);
  return at;
}

export function filterNotificationsAfterClear(list, clearedAt) {
  if (!clearedAt) return Array.isArray(list) ? list : [];
  const cut = Date.parse(clearedAt);
  if (!Number.isFinite(cut)) return Array.isArray(list) ? list : [];
  return (list || []).filter((n) => {
    const created = Date.parse(n?.created_at || '');
    return Number.isFinite(created) && created > cut;
  });
}
