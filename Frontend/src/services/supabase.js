import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { readItemTimeField } from '../utils/itemTimeUtils';
import { BACKEND_URL } from '../config/api';
import {
  ITEM_STATUS,
  FEED_STATUSES,
  LISTING_MODE,
  normalizeItemStatus,
  isFeedVisible,
  isSecureListing,
} from '../utils/itemStatus';
import {
  filterNotificationsAfterClear,
  getNotificationsClearedAt,
} from '../utils/notificationInbox';
import { normalizeOfficeLocation, STUDENT_AFFAIRS_OFFICE } from '../utils/officeLocation';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy Frontend/.env.example to Frontend/.env'
  );
}

if (String(supabaseAnonKey || '').startsWith('sb_secret_')) {
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY must not be a server secret (sb_secret_). Use anon or publishable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const ITEM_IMAGES_BUCKET = 'item-images';

const isRemoteImageUri = (uri) =>
  typeof uri === 'string' &&
  (uri.startsWith('http://') || uri.startsWith('https://'));

export const normalizeItemRow = (item) => {
  if (!item) return item;

  let imageURI = item.imageURI || item.imageuri || null;
  const listingMode = item.listing_mode || item.listingMode || LISTING_MODE.PUBLIC;
  if (listingMode === LISTING_MODE.SECURE) {
    imageURI = null;
  } else if (imageURI && !isRemoteImageUri(imageURI)) {
    const raw = String(imageURI).trim();
    if (
      raw.startsWith('file:') ||
      raw.startsWith('content:') ||
      raw.startsWith('ph://') ||
      raw.startsWith('assets-library:') ||
      raw.startsWith('/')
    ) {
      imageURI = null;
    } else {
      const path = raw.replace(/^\/+/, '').replace(/^item-images\//, '');
      imageURI = path
        ? `${supabaseUrl}/storage/v1/object/public/${ITEM_IMAGES_BUCKET}/${path}`
        : null;
    }
  }

  const normalizeTime = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

  return {
    ...item,
    itemName: item.itemName || item.item_name || item.itemname || 'Unnamed item',
    category: item.category || item.public_category || item.publicCategory || 'General',
    location: normalizeOfficeLocation(
      item.location || item.security_location || item.securityLocation,
      'Unknown'
    ),
    public_notice: item.public_notice || item.publicNotice || null,
    security_location: normalizeOfficeLocation(
      item.security_location || item.securityLocation,
      null
    ),
    imageURI,
    status: normalizeItemStatus(item),
    timeLost: normalizeTime(readItemTimeField(item, 'lost')),
    timeFound: normalizeTime(readItemTimeField(item, 'found')),
  };
};

const isApprovedForStatus = (status) => status === ITEM_STATUS.LIVE;

export const setItemStatus = async (table, id, status) => {
  const isLive = isApprovedForStatus(status);
  const patch = {
    status,
    is_approved: isLive,
    approved_at: isLive ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from(table).update(patch).eq('id', id);
  if (error) {
    const missingCol = parseMissingColumn(error);
    if (missingCol === 'status') {
      const { error: fbError } = await supabase
        .from(table)
        .update({ is_approved: patch.is_approved })
        .eq('id', id);
      if (fbError) throw fbError;
      return;
    }

    if (missingCol === 'approved_at') {
      const { error: fbError } = await supabase
        .from(table)
        .update({ status, is_approved: patch.is_approved })
        .eq('id', id);
      if (fbError) throw fbError;
      return;
    }

    throw error;
  }
};

const normalizeItems = (items) => (items || []).map(normalizeItemRow);

const hasPhone = (value) => typeof value === 'string' && value.trim() !== '';

const buildDirectoryPhoneMaps = (directoryRows = []) => {
  const byStudentId = {};
  const byEmail = {};
  const byName = {};

  directoryRows.forEach((row) => {
    if (!hasPhone(row.phone_number)) return;
    const phone = row.phone_number.trim();
    if (row.student_id) byStudentId[row.student_id.trim().toUpperCase()] = phone;
    if (row.email) byEmail[row.email.trim().toLowerCase()] = phone;
    if (row.full_name) byName[row.full_name.toLowerCase().trim()] = phone;
  });

  return { byStudentId, byEmail, byName };
};

const pickPhone = ({ email, name, studentId, usersPhone } = {}, maps, userEmailMap = {}) => {
  if (hasPhone(usersPhone)) return usersPhone.trim();

  const normalizedEmail = email?.trim().toLowerCase();
  const lookupName = name?.toLowerCase().trim();
  const normalizedStudentId = studentId?.trim().toUpperCase();

  if (normalizedEmail && userEmailMap[normalizedEmail]) {
    const userInfo = userEmailMap[normalizedEmail];
    if (hasPhone(userInfo.phone)) return userInfo.phone.trim();
    if (userInfo.student_id) {
      const sid = userInfo.student_id.trim().toUpperCase();
      if (maps.byStudentId[sid]) return maps.byStudentId[sid];
    }
  }

  if (normalizedStudentId && maps.byStudentId[normalizedStudentId]) {
    return maps.byStudentId[normalizedStudentId];
  }

  if (normalizedEmail && maps.byEmail[normalizedEmail]) {
    return maps.byEmail[normalizedEmail];
  }

  if (lookupName && maps.byName[lookupName]) {
    return maps.byName[lookupName];
  }

  return '';
};

const fetchDirectoryPhoneMaps = async () => {
  const { data, error } = await supabase
    .from('student_directory')
    .select('student_id, full_name, email, phone_number');
  if (error) throw error;
  return buildDirectoryPhoneMaps(data || []);
};

export const resolveReporterPhone = async ({ email, name, studentId, usersPhone } = {}) => {
  try {
    const maps = await fetchDirectoryPhoneMaps();
    return pickPhone({ email, name, studentId, usersPhone }, maps);
  } catch (e) {
    console.warn('resolveReporterPhone failed:', e?.message);
    return '';
  }
};

const enrichUsersWithPhone = async (users) => {
  if (!users?.length) return users;

  try {
    const maps = await fetchDirectoryPhoneMaps();
    return users.map((user) => {
      if (hasPhone(user.phone)) return user;
      const phone = pickPhone(
        { email: user.email, name: user.name, studentId: user.student_id },
        maps
      );
      return phone ? { ...user, phone } : user;
    });
  } catch (e) {
    console.warn('enrichUsersWithPhone failed:', e?.message);
    return users;
  }
};

const ensurePublicImageUri = async (imageUri) => {
  if (!imageUri) return null;
  if (isRemoteImageUri(imageUri)) return imageUri;

  try {
    const fileName = `items/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;
    return await uploadImage(ITEM_IMAGES_BUCKET, fileName, imageUri);
  } catch (e) {
    console.warn('Image upload skipped â€” item will save without photo:', e?.message);
    return null;
  }
};

const prepareItemForInsert = async (itemData) => {
  const payload = { ...itemData };

  if (!hasPhone(payload.phnum)) {
    const phone = await resolveReporterPhone({
      email: payload.email,
      name: payload.ownerName || payload.finderName,
    });
    if (phone) payload.phnum = phone;
  }

  if (payload.imageURI) {
    payload.imageURI = await ensurePublicImageUri(payload.imageURI);
  }

  return payload;
};

const parseMissingColumn = (error) => {
  if (!error || (error.code !== 'PGRST204' && error.code !== '42703')) return null;
  const match = error.message?.match(/Could not find the '([^']+)' column|column "([^"]+)"/i);
  return match?.[1] || match?.[2] || null;
};

const insertItemWithColumnFallback = async (table, payload) => {
  let current = { ...payload };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase.from(table).insert(current).select();
    if (!error) return data[0];

    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      console.warn(`Retrying insert without missing column: ${missingCol}`);
      const next = { ...current };
      delete next[missingCol];
      current = next;
      continue;
    }

    throw new Error(error.message || 'Database insert failed.');
  }

  throw new Error('Database insert failed after column fallbacks.');
};

// USERS
export const getUserProfile = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
  return data;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return enrichUsersWithPhone(data || []);
};

export const updateUserApproval = async (email, isApproved) => {
  const sessionRaw = await AsyncStorage.getItem('userSession');
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  const token = String(session?.adminToken || '').trim();
  if (!token) throw new Error('Admin session required. Please log in again.');

  const response = await fetch(`${BACKEND_URL}/api/admin/users/set-approval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({ email, isApproved }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error(payload?.error || 'Failed to update user approval.');
  return payload;
};

export const deleteUser = async (email) => {
  const sessionRaw = await AsyncStorage.getItem('userSession');
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  const token = String(session?.adminToken || '').trim();
  if (!token) throw new Error('Admin session required. Please log in again.');

  const response = await fetch(`${BACKEND_URL}/api/admin/users/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({
      email,
      deletedBy: session?.email || session?.userName || null,
    }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error(payload?.error || 'Failed to delete user.');
};

// Helper: Enrich items by filling missing phone numbers from users / student_directory
const enrichItemsWithPhone = async (items) => {
  if (!items || items.length === 0) return items;

  const needsPhone = items.filter(i => !hasPhone(i.phnum));
  if (needsPhone.length === 0) return normalizeItems(items);

  const emails = [...new Set(needsPhone.map(i => i.email?.trim().toLowerCase()).filter(Boolean))];
  const userEmailMap = {};

  try {
    const maps = await fetchDirectoryPhoneMaps();

    if (emails.length > 0) {
      const { data: userRows } = await supabase
        .from('users')
        .select('email, phone, student_id')
        .in('email', emails);
      (userRows || []).forEach((u) => {
        userEmailMap[u.email.trim().toLowerCase()] = {
          phone: u.phone,
          student_id: u.student_id,
        };
      });
    }

    return items.map((item) => {
      const result = normalizeItemRow(item);
      if (isSecureListing(result)) return result;
      if (hasPhone(result.phnum)) return result;

      const phone = pickPhone(
        {
          email: item.email,
          name: item.ownerName || item.finderName,
          studentId: userEmailMap[item.email?.trim().toLowerCase()]?.student_id,
        },
        maps,
        userEmailMap
      );

      return phone ? { ...result, phnum: phone } : result;
    });
  } catch (e) {
    console.warn('enrichItemsWithPhone lookup failed:', e?.message);
    return normalizeItems(items);
  }
};

// LOST ITEMS
const notifyItemWentLive = async (itemType, row) => {
  if (!row?.id) return;
  const type = itemType === 'lost' ? 'lost' : 'found';
  const label = type === 'lost' ? 'Lost' : 'Found';
  const name = String(row.itemName || row.item_name || 'An item').trim() || 'An item';
  const cat = String(row.category || row.public_category || row.publicCategory || '').trim();
  try {
    const { error } = await supabase.from('app_notifications').insert({
      type: 'item_live',
      title: `New ${label} item`,
      body: cat ? `${name} (${cat}) is now live on the feed.` : `${name} is now live on the feed.`,
      item_type: type,
      item_id: row.id,
      item_name: name,
      category: cat || null,
    });
    if (error && error.code !== '23505') {
      console.warn('notifyItemWentLive:', error.message);
    }
  } catch (e) {
    console.warn('notifyItemWentLive skipped:', e?.message);
  }
};

export const createLostItem = async (itemData, isAdmin = false) => {
  const prepared = await prepareItemForInsert(itemData);
  const dataToInsert = {
    ...prepared,
    is_approved: isAdmin ? true : false,
    status: isAdmin ? ITEM_STATUS.LIVE : ITEM_STATUS.PENDING_REVIEW,
    approved_at: isAdmin ? new Date().toISOString() : null,
  };
  const row = await insertItemWithColumnFallback('lost_items', dataToInsert);
  if (isAdmin) await notifyItemWentLive('lost', row);
  return normalizeItemRow(row);
};

export const getAllLostItems = async () => {
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .select('*')
      .in('status', FEED_STATUSES)
      .order('id', { ascending: false });

    if (error) throw error;
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    try {
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .eq('is_approved', true)
        .order('id', { ascending: false });
      if (error) {
        if (error.code === '42703') {
          const { data: fbData, error: fbError } = await supabase
            .from('lost_items')
            .select('*')
            .order('id', { ascending: false });
          if (fbError) throw fbError;
          return await enrichItemsWithPhone(
            (fbData || []).filter((row) => isFeedVisible(row))
          );
        }
        throw error;
      }
      return await enrichItemsWithPhone(
        (data || []).filter((row) => isFeedVisible(row))
      );
    } catch (e) {
      return [];
    }
  }
};

/** Fast home-feed fetch: limited rows, no phone directory enrichment. */
export const getRecentFeedItems = async (limit = 10) => {
  const take = Math.max(1, Math.min(Number(limit) || 10, 30));

  const lostPromise = supabase
    .from('lost_items')
    .select('*')
    .in('status', FEED_STATUSES)
    .order('id', { ascending: false })
    .limit(take)
    .then(({ data, error }) => {
      if (error) throw error;
      return normalizeItems(data || []);
    })
    .catch(async () => {
      const { data } = await supabase
        .from('lost_items')
        .select('*')
        .order('id', { ascending: false })
        .limit(take);
      return normalizeItems((data || []).filter((row) => isFeedVisible(row)));
    });

  const foundPromise = supabase
    .from('found_items_public_feed')
    .select('*')
    .in('status', FEED_STATUSES)
    .order('id', { ascending: false })
    .limit(take)
    .then(({ data, error }) => {
      if (error) throw error;
      return normalizeItems(data || []);
    })
    .catch(async () => {
      const { data } = await supabase
        .from('found_items')
        .select('*')
        .in('status', FEED_STATUSES)
        .order('id', { ascending: false })
        .limit(take);
      return normalizeItems(data || []);
    })
    .catch(async () => {
      const { data } = await supabase
        .from('found_items')
        .select('*')
        .order('id', { ascending: false })
        .limit(take);
      return normalizeItems((data || []).filter((row) => isFeedVisible(row)));
    });

  const [lost, found] = await Promise.all([lostPromise, foundPromise]);
  return [
    ...lost.map((row) => ({ ...row, type: 'LOST' })),
    ...found.map((row) => ({ ...row, type: 'FOUND' })),
  ]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, take);
};

export const adminGetAllLostItems = async () => {
  const { data, error } = await supabase
    .from('lost_items')
    .select('*')
    .order('id', { ascending: false });
  if (error) throw error;
  return await enrichItemsWithPhone(data || []);
};

export const getPendingLostItems = async () => {
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .select('*')
      .eq('status', ITEM_STATUS.PENDING_REVIEW)
      .order('id', { ascending: false });
    if (error) throw error;
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    try {
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .eq('is_approved', false)
        .order('id', { ascending: false });
      if (error) {
        if (error.code === '42703') return [];
        throw error;
      }
      return await enrichItemsWithPhone(data || []);
    } catch (e) {
      return [];
    }
  }
};

export const fetchAppNotifications = async (userEmail) => {
  const email = userEmail?.trim().toLowerCase();
  const { data: notes, error } = await supabase
    .from('app_notifications')
    .select('id, type, title, body, item_type, item_id, item_name, category, created_at')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    console.warn('fetchAppNotifications error:', error.code, error.message);
    throw new Error(
      error.message ||
        'Failed to load notifications. Run supabase/app_notifications.sql and NOTIFY pgrst reload schema.'
    );
  }

  const clearedAt = email ? await getNotificationsClearedAt(email) : null;
  const visibleNotes = filterNotificationsAfterClear(notes || [], clearedAt);

  let readIds = new Set();
  if (email && visibleNotes.length) {
    const ids = visibleNotes.map((n) => n.id);
    const { data: reads, error: readErr } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_email', email)
      .in('notification_id', ids);
    if (readErr) {
      console.warn('notification_reads fetch skipped:', readErr.message);
    } else {
      readIds = new Set((reads || []).map((r) => r.notification_id));
    }
  }

  return visibleNotes.map((n) => ({
    ...n,
    isRead: readIds.has(n.id),
  }));
};

export const getUnreadNotificationCount = async (userEmail) => {
  const email = userEmail?.trim().toLowerCase();
  if (!email) return 0;

  try {
    const list = await fetchAppNotifications(email);
    return list.filter((n) => !n.isRead).length;
  } catch {
    return 0;
  }
};

export const markNotificationRead = async (notificationId, userEmail) => {
  const email = userEmail?.trim().toLowerCase();
  if (!email || !notificationId) return;
  const { error } = await supabase.from('notification_reads').upsert(
    {
      notification_id: notificationId,
      user_email: email,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'notification_id,user_email' }
  );
  if (error) console.warn('markNotificationRead:', error.message);
};

export const markAllNotificationsRead = async (userEmail) => {
  const email = userEmail?.trim().toLowerCase();
  if (!email) return;
  const list = await fetchAppNotifications(email);
  const unread = list.filter((n) => !n.isRead);
  if (!unread.length) return;
  const rows = unread.map((n) => ({
    notification_id: n.id,
    user_email: email,
    read_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('notification_reads').upsert(rows, {
    onConflict: 'notification_id,user_email',
  });
  if (error) console.warn('markAllNotificationsRead:', error.message);
};

/**
 * Live updates for in-app inbox (no SMS).
 * Uses Supabase Realtime INSERT + returns an unsubscribe fn.
 */
export const subscribeToAppNotifications = (onChange) => {
  if (typeof onChange !== 'function') return () => {};

  const channel = supabase
    .channel(`app_notifications_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'app_notifications' },
      (payload) => {
        try {
          onChange(payload?.new || null);
        } catch (e) {
          console.warn('notification listener error:', e?.message);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
};

export const approveLostItem = async (id) => {
  try {
    const { data: item } = await supabase.from('lost_items').select('*').eq('id', id).maybeSingle();
    await setItemStatus('lost_items', id, ITEM_STATUS.LIVE);
    await notifyItemWentLive('lost', { ...(item || {}), id });
  } catch (err) {
    console.warn("Approve lost item failed:", err.message);
  }
};

export const getLostItemsByUser = async (email) => {
  const { data, error } = await supabase
    .from('lost_items')
    .select('*')
    .eq('email', email)
    .order('id', { ascending: false });
  if (error) throw error;
  return await enrichItemsWithPhone(data || []);
};

export const deleteLostItem = async (id) => {
  const { error } = await supabase
    .from('lost_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// FOUND ITEMS
export const createFoundItem = async (itemData, isAdmin = false) => {
  const prepared = await prepareItemForInsert(itemData);
  const dataToInsert = {
    ...prepared,
    is_approved: isAdmin ? true : false,
    status: isAdmin ? ITEM_STATUS.LIVE : ITEM_STATUS.PENDING_REVIEW,
    approved_at: isAdmin ? new Date().toISOString() : null,
  };
  const row = await insertItemWithColumnFallback('found_items', dataToInsert);
  if (isAdmin) await notifyItemWentLive('found', row);
  return normalizeItemRow(row);
};

export const getAllFoundItems = async () => {
  const queryPublicFeed = async () => {
    const { data, error } = await supabase
      .from('found_items_public_feed')
      .select('*')
      .in('status', FEED_STATUSES)
      .order('id', { ascending: false });
    if (error) throw error;
    return await enrichItemsWithPhone(data || []);
  };

  try {
    return await queryPublicFeed();
  } catch (err) {
    try {
      const { data, error } = await supabase
        .from('found_items')
        .select('*')
        .in('status', FEED_STATUSES)
        .order('id', { ascending: false });

      if (error) throw error;
      return await enrichItemsWithPhone(data || []);
    } catch (fallbackErr) {
      try {
        const { data, error } = await supabase
          .from('found_items')
          .select('*')
          .eq('is_approved', true)
          .order('id', { ascending: false });
        if (error) {
          if (error.code === '42703') {
            const { data: fbData, error: fbError } = await supabase
              .from('found_items')
              .select('*')
              .order('id', { ascending: false });
            if (fbError) throw fbError;
            return await enrichItemsWithPhone(
              (fbData || []).filter((row) => isFeedVisible(row))
            );
          }
          throw error;
        }
        return await enrichItemsWithPhone(
          (data || []).filter((row) => isFeedVisible(row))
        );
      } catch (e) {
        return [];
      }
    }
  }
};

export const adminGetAllFoundItems = async () => {
  const { data, error } = await supabase
    .from('found_items')
    .select('*')
    .order('id', { ascending: false });
  if (error) throw error;
  return await enrichItemsWithPhone(data || []);
};

export const getPendingFoundItems = async () => {
  try {
    const { data, error } = await supabase
      .from('found_items')
      .select('*')
      .eq('status', ITEM_STATUS.PENDING_REVIEW)
      .order('id', { ascending: false });
    if (error) throw error;
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    try {
      const { data, error } = await supabase
        .from('found_items')
        .select('*')
        .eq('is_approved', false)
        .order('id', { ascending: false });
      if (error) {
        if (error.code === '42703') return [];
        throw error;
      }
      return await enrichItemsWithPhone(data || []);
    } catch (e) {
      return [];
    }
  }
};

export const approveFoundItem = async (id) => {
  try {
    const { data: item } = await supabase.from('found_items').select('*').eq('id', id).maybeSingle();
    await setItemStatus('found_items', id, ITEM_STATUS.LIVE);
    await notifyItemWentLive('found', { ...(item || {}), id });
  } catch (err) {
    console.warn("Approve found item failed:", err.message);
  }
};

export const getFoundItemsByUser = async (email) => {
  const { data, error } = await supabase
    .from('found_items')
    .select('*')
    .eq('email', email)
    .order('id', { ascending: false });
  if (error) throw error;
  return await enrichItemsWithPhone(data || []);
};

export const deleteFoundItem = async (id) => {
  const { error } = await supabase
    .from('found_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// OWNERSHIP CLAIMS (This is mine → admin, no auto-matching)
const isRlsError = (error) =>
  error?.message?.includes('row-level security') || error?.code === '42501';

const isNetworkLikeError = (error) => {
  const message = error?.message?.toLowerCase?.() || '';
  return (
    message.includes('network request failed') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('failed to fetch')
  );
};

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

const formatClaimPersistError = (error) => {
  if (isRlsError(error)) {
    return 'Could not send to admin: database permissions. Run supabase/item_claims.sql in Supabase.';
  }
  return error?.message || 'Could not send request to admin.';
};

const persistClaimViaBackend = async (payload) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 12000) : null;

  try {
    const response = await fetch(`${BACKEND_URL}/api/claims/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: payload }),
      signal: controller?.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Backend claim save failed');
    return data.row;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Check that backend server is running and try again.');
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const resolveClaimantIdentity = async (email) => {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('You must be logged in to submit a request.');

  const { data: user, error } = await supabase
    .from('users')
    .select('name, student_id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  if (!user?.name?.trim()) throw new Error('Your account profile is missing a name. Contact admin.');
  if (!user?.student_id?.trim()) throw new Error('Your account is missing an ID. Contact admin.');

  return {
    claimer_name: user.name.trim(),
    claimer_email: normalizedEmail,
    claimer_student_id: user.student_id.trim(),
  };
};

const enrichClaimRows = async (rows) => {
  if (!rows?.length) return [];

  return (
    await Promise.all(
      rows.map(async (row) => {
        const itemType = row.item_type || (row.lost_item_id === row.found_item_id ? 'lost' : 'found');
        const itemId = row.item_id || row.lost_item_id || row.found_item_id;
        const table = itemType === 'found' ? 'found_items' : 'lost_items';
        const { data: itemRow } = await supabase.from(table).select('*').eq('id', itemId).maybeSingle();
        if (!itemRow) return null;

        const [enriched] = await enrichItemsWithPhone([itemRow]);
        const item = { ...enriched, type: itemType === 'found' ? 'FOUND' : 'LOST' };
        return {
          ...row,
          itemType,
          itemId,
          targetItem: item,
          lostItem: itemType === 'lost' ? item : null,
          foundItem: itemType === 'found' ? item : null,
        };
      })
    )
  ).filter(Boolean);
};

const buildClaimDisplayItem = (row, itemRow) => {
  const itemType = row.item_type || (row.lost_item_id === row.found_item_id ? 'lost' : 'found');
  const snapshot = row.match_breakdown || row.matchBreakdown;

  if (itemRow) {
    return {
      ...itemRow,
      type: itemType === 'found' ? 'FOUND' : 'LOST',
    };
  }

  if (snapshot && typeof snapshot === 'object') {
    return {
      id: row.item_id || row.lost_item_id || row.found_item_id,
      itemName: snapshot.item_name || snapshot.itemName || 'Requested item',
      category: snapshot.category || 'General',
      imageURI: snapshot.image_uri || snapshot.imageURI || null,
      location: snapshot.location || '',
      type: (snapshot.item_type || itemType) === 'found' ? 'FOUND' : 'LOST',
      archived: true,
    };
  }

  return {
    id: row.item_id || row.lost_item_id || row.found_item_id,
    itemName: 'Requested item',
    category: 'General',
    imageURI: null,
    location: '',
    type: itemType === 'found' ? 'FOUND' : 'LOST',
    archived: true,
  };
};

const enrichUserClaimRows = async (rows) => {
  if (!rows?.length) return [];

  return Promise.all(
    rows.map(async (row) => {
      const itemType = row.item_type || (row.lost_item_id === row.found_item_id ? 'lost' : 'found');
      const itemId = row.item_id || row.lost_item_id || row.found_item_id;
      const table = itemType === 'found' ? 'found_items' : 'lost_items';

      let itemRow = null;
      const { data } = await supabase.from(table).select('*').eq('id', itemId).maybeSingle();
      if (data) {
        const [enriched] = await enrichItemsWithPhone([data]);
        itemRow = enriched;
      }

      const item = buildClaimDisplayItem(row, itemRow);
      return {
        ...row,
        itemType,
        itemId,
        targetItem: item,
        lostItem: item.type === 'LOST' ? item : null,
        foundItem: item.type === 'FOUND' ? item : null,
      };
    })
  );
};

export const getUserItemClaims = async (claimerEmail) => {
  const email = claimerEmail?.trim().toLowerCase();
  if (!email) return [];

  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .eq('claimer_email', email)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to load your requests.');
  return enrichUserClaimRows(data || []);
};

export const getUserPendingClaimCount = async (claimerEmail) => {
  const email = claimerEmail?.trim().toLowerCase();
  if (!email) return 0;

  try {
    const { count, error } = await supabase
      .from('item_claims')
      .select('*', { count: 'exact', head: true })
      .eq('claimer_email', email)
      .in('status', ['pending', 'physical']);
    if (error) throw error;
    return count || 0;
  } catch (e) {
    return 0;
  }
};

function claimRowMatchesItemType(row, type) {
  if (!row) return false;
  let breakdown = row.match_breakdown;
  if (typeof breakdown === 'string') {
    try {
      breakdown = JSON.parse(breakdown);
    } catch {
      breakdown = null;
    }
  }
  const rowType = String(row.item_type || breakdown?.item_type || '').toLowerCase();
  if (rowType === 'lost' || rowType === 'found') return rowType === type;
  // Ambiguous dual-FK rows without type must not mark unrelated lost/found ids as pending.
  return false;
}

export const getUserPendingClaimForItem = async (itemId, itemType, claimerEmail) => {
  const email = claimerEmail?.trim().toLowerCase();
  if (!email || itemId == null) return null;

  const id = Number(itemId);
  if (!Number.isFinite(id)) return null;
  const type = itemType === 'found' ? 'found' : 'lost';

  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at, item_type, item_id, match_breakdown')
      .eq('claimer_email', email)
      .eq('item_id', id)
      .eq('item_type', type)
      .in('status', ['pending', 'physical'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data?.[0]) return data[0];
  } catch (e) {
    /* item_id / item_type columns may be missing */
  }

  // Fallback without item_type column — still require type via breakdown.
  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at, item_type, item_id, match_breakdown')
      .eq('claimer_email', email)
      .eq('item_id', id)
      .in('status', ['pending', 'physical'])
      .limit(5);
    if (!error && data?.length) {
      const match = data.find((row) => claimRowMatchesItemType(row, type));
      if (match) return match;
    }
  } catch (e) {
    /* item_id may be missing */
  }

  const fkCol = type === 'lost' ? 'lost_item_id' : 'found_item_id';
  const { data: legacyRows, error: legacyError } = await supabase
    .from('item_claims')
    .select('id, status, created_at, item_type, item_id, match_breakdown, lost_item_id, found_item_id')
    .eq('claimer_email', email)
    .eq(fkCol, id)
    .in('status', ['pending', 'physical'])
    .limit(8);

  if (legacyError || !legacyRows?.length) return null;
  return legacyRows.find((row) => claimRowMatchesItemType(row, type)) || null;
};

/** Latest claim for this user + item (any status) — for UI after approve/return. */
export const getUserLatestClaimForItem = async (itemId, itemType, claimerEmail) => {
  const email = claimerEmail?.trim().toLowerCase();
  if (!email || itemId == null) return null;

  const id = Number(itemId);
  if (!Number.isFinite(id)) return null;
  const type = itemType === 'found' ? 'found' : 'lost';

  const pick = (rows) => {
    if (!Array.isArray(rows) || !rows.length) return null;
    return (
      rows.find((row) => claimRowMatchesItemType(row, type)) ||
      rows[0] ||
      null
    );
  };

  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at, item_type, item_id, challenge_result, challenge_score, match_breakdown')
      .eq('claimer_email', email)
      .eq('item_id', id)
      .eq('item_type', type)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data?.[0]) return data[0];
  } catch (e) {
    /* columns may be missing */
  }

  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at, item_type, item_id, challenge_result, challenge_score, match_breakdown')
      .eq('claimer_email', email)
      .eq('item_id', id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data?.length) {
      const match = pick(data);
      if (match) return match;
    }
  } catch (e) {
    /* item_id may be missing */
  }

  const fkCol = type === 'lost' ? 'lost_item_id' : 'found_item_id';
  const { data: legacyRows, error: legacyError } = await supabase
    .from('item_claims')
    .select(
      'id, status, created_at, item_type, item_id, challenge_result, challenge_score, match_breakdown, lost_item_id, found_item_id'
    )
    .eq('claimer_email', email)
    .eq(fkCol, id)
    .order('created_at', { ascending: false })
    .limit(8);

  if (legacyError || !legacyRows?.length) return null;
  return pick(legacyRows);
};

export const CLAIM_ALREADY_PENDING_MSG =
  'You already sent a request for this item. Wait for admin review.';

export const CLAIM_ALREADY_REJECTED_MSG =
  'You already tried this item and were not matched. You cannot submit again for the same item.';

export const CHALLENGE_NOT_READY_MSG =
  'Ownership Challenge is not ready yet. Please wait for admin.';

/** Same user already failed Ownership Challenge (or admin rejected) for this item. */
export const getUserRejectedClaimForItem = async (itemId, itemType, claimerEmail) => {
  const email = claimerEmail?.trim().toLowerCase();
  if (!email || itemId == null) return null;

  const id = Number(itemId);
  if (!Number.isFinite(id)) return null;
  const type = itemType === 'found' ? 'found' : 'lost';

  const matchesEmail = (row) =>
    String(row?.claimer_email || '').trim().toLowerCase() === email;

  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at, item_type, item_id, challenge_result, claimer_email')
      .eq('item_id', id)
      .eq('item_type', type)
      .or(`status.eq.rejected,challenge_result.eq.reject`)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data?.length) {
      const match = data.find(matchesEmail);
      if (match) return match;
    }
  } catch (e) {
    /* columns may be missing */
  }

  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at, item_type, item_id, match_breakdown, challenge_result, claimer_email')
      .eq('claimer_email', email)
      .eq('item_id', id)
      .eq('status', 'rejected')
      .limit(5);
    if (!error && data?.length) {
      const match = data.find((row) => claimRowMatchesItemType(row, type));
      if (match) return match;
    }
  } catch (e) {
    /* ignore */
  }

  const fkCol = type === 'lost' ? 'lost_item_id' : 'found_item_id';
  const { data: legacyRows, error: legacyError } = await supabase
    .from('item_claims')
    .select('id, status, created_at, item_type, item_id, match_breakdown, lost_item_id, found_item_id, claimer_email, challenge_result')
    .eq(fkCol, id)
    .or(`status.eq.rejected,challenge_result.eq.reject`)
    .limit(12);

  if (legacyError || !legacyRows?.length) return null;
  return (
    legacyRows.find((row) => matchesEmail(row) && claimRowMatchesItemType(row, type)) || null
  );
};

async function setItemLifecycleStatus(itemType, itemId, status) {
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase.from(table).update({ status }).eq('id', itemId);
  if (error) throw new Error(error.message || 'Could not update item status.');
}

export const ITEM_BEING_CLAIMED_MSG =
  'Someone is already answering the Ownership Challenge for this item. Try again shortly.';

/**
 * Soft-lock: hide from live as soon as claimant opens the challenge form.
 * Only succeeds if the item is currently live (first opener wins).
 * Orphan soft-locks (Cancel never ran) are cleared once, then lock retries.
 */
export const reserveItemForClaim = async (itemType, itemId) => {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) throw new Error('Item data is missing.');

  const table = type === 'found' ? 'found_items' : 'lost_items';

  const tryLock = async () => {
    const { data, error } = await supabase
      .from(table)
      .update({ status: 'claim_pending' })
      .eq('id', id)
      .eq('status', 'live')
      .select('id')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Could not reserve this item.');
    return data?.id || null;
  };

  let lockedId = await tryLock();
  if (!lockedId) {
    const open = await getOpenClaimForItem(type, id);
    if (!open) {
      await supabase.from(table).update({ status: 'live' }).eq('id', id).eq('status', 'claim_pending');
      lockedId = await tryLock();
    }
  }

  if (!lockedId) throw new Error(ITEM_BEING_CLAIMED_MSG);
  return true;
};

/**
 * Unlock after Cancel (no submit). Restores live only if still soft-locked
 * and no real claim row is open.
 */
export const releaseItemClaimReserve = async (itemType, itemId) => {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) return false;

  const open = await getOpenClaimForItem(type, id);
  if (open) return false;

  const table = type === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase
    .from(table)
    .update({ status: 'live' })
    .eq('id', id)
    .eq('status', 'claim_pending');

  if (error) throw new Error(error.message || 'Could not restore item to live.');
  return true;
};

/** Public Ownership Challenge (no correct answers). */
export const fetchPublicOwnershipChallenge = async (itemType, itemId) => {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) return null;

  const { data: challenge, error } = await supabase
    .from('ownership_challenges')
    .select('id, item_type, item_id, status')
    .eq('item_type', type)
    .eq('item_id', id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    const msg = String(error.message || '');
    if (/ownership_challenges|does not exist|schema cache/i.test(msg)) {
      throw new Error('Ownership Challenge is not set up yet. Ask admin to run ownership_challenge.sql.');
    }
    throw new Error(error.message || 'Failed to load Ownership Challenge.');
  }
  if (!challenge) return null;

  const { data: questions, error: qErr } = await supabase
    .from('ownership_challenge_questions')
    .select('id, prompt, options, sort_order, question_type')
    .eq('challenge_id', challenge.id)
    .order('sort_order', { ascending: true });

  if (qErr) throw new Error(qErr.message || 'Failed to load challenge questions.');

  const { toPublicChallengeQuestions } = await import('../utils/ownershipChallenge');
  const rows = questions || [];
  return {
    ...challenge,
    questions: toPublicChallengeQuestions(rows),
    questionCount: rows.length,
    hasChallenge: rows.length > 0,
  };
};

async function fetchChallengeWithAnswers(itemType, itemId) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  const { data: challenge, error } = await supabase
    .from('ownership_challenges')
    .select('*')
    .eq('item_type', type)
    .eq('item_id', id)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load challenge.');
  if (!challenge) return null;

  const { data: questions, error: qErr } = await supabase
    .from('ownership_challenge_questions')
    .select('*')
    .eq('challenge_id', challenge.id)
    .order('sort_order', { ascending: true });
  if (qErr) throw new Error(qErr.message || 'Failed to load questions.');
  return { ...challenge, questions: questions || [] };
}

async function getOpenClaimForItem(itemType, itemId) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  const { data, error } = await supabase
    .from('item_claims')
    .select('id, status, claimer_email')
    .eq('item_type', type)
    .eq('item_id', id)
    .in('status', ['pending', 'physical'])
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return null;
  return data?.[0] || null;
}

/**
 * Submit Ownership Challenge answers. Locks live listing; applies score bands.
 */
export const submitOwnershipChallengeClaim = async (item, itemType, form) => {
  if (!item?.id) throw new Error('Item data is missing.');
  const selectedIndexes = Array.isArray(form?.selectedIndexes) ? form.selectedIndexes : null;
  const answers = Array.isArray(form?.answers)
    ? form.answers
    : Array.isArray(selectedIndexes)
      ? selectedIndexes
      : [];
  const identity = await withTimeout(
    resolveClaimantIdentity(form.claimerEmail),
    12000,
    'Could not verify your account. Check your connection and try again.'
  );
  const type = itemType === 'found' ? 'found' : 'lost';
  const itemId = Number(item.id);

  const open = await getOpenClaimForItem(type, itemId);
  if (open) {
    if (String(open.claimer_email || '').toLowerCase() === identity.claimer_email) {
      throw new Error(CLAIM_ALREADY_PENDING_MSG);
    }
    throw new Error('This item already has an ownership request under review.');
  }

  const alreadyPending = await getUserPendingClaimForItem(itemId, type, identity.claimer_email);
  if (alreadyPending) throw new Error(CLAIM_ALREADY_PENDING_MSG);

  const alreadyRejected = await getUserRejectedClaimForItem(itemId, type, identity.claimer_email);
  if (alreadyRejected) throw new Error(CLAIM_ALREADY_REJECTED_MSG);

  const challenge = await fetchChallengeWithAnswers(type, itemId);
  if (!challenge?.questions?.length) throw new Error(CHALLENGE_NOT_READY_MSG);

  const { resolveChallengeOutcome, buildChallengeAnswerReview, challengeResultLabel, OWNERSHIP_OFFICE_VISIT } =
    await import('../utils/ownershipChallenge');
  const { score, correct, total, result, askOnly, askTotal } = resolveChallengeOutcome(
    challenge.questions,
    answers
  );
  const itemName = item.itemName || item.item_name || 'Item';
  const answerReview = buildChallengeAnswerReview(challenge.questions, answers);
  const description =
    askTotal > 0
      ? `Ownership Challenge · Ask review · Physical (${score}% on scored Qs)`
      : askOnly
        ? `Ownership Challenge · Ask review · physical`
        : `Ownership Challenge · ${score}% (${correct}/${total}) · ${result}`;

  const payload = {
    lost_item_id: itemId,
    found_item_id: itemId,
    item_type: type,
    item_id: itemId,
    claimer_name: identity.claimer_name,
    claimer_email: identity.claimer_email,
    claimer_student_id: identity.claimer_student_id,
    description,
    match_score: score,
    match_breakdown: {
      source: 'ownership_challenge',
      item_type: type,
      item_name: itemName,
      category: item.category || null,
      image_uri: item.imageURI || item.imageuri || null,
      location: item.location || null,
      challenge_id: challenge.id,
      score,
      correct,
      total,
      result,
      answer_review: answerReview,
    },
    challenge_id: challenge.id,
    challenge_score: score,
    challenge_result: result,
    challenge_answers: answers,
    status: result === 'reject' ? 'rejected' : result === 'physical' ? 'physical' : 'pending',
  };

  await setItemLifecycleStatus(type, itemId, result === 'physical' ? 'awaiting_pickup' : 'claim_pending');

  let current = { ...payload };
  let inserted;
  let error;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await withTimeout(
        supabase.from('item_claims').insert(current).select().single(),
        15000,
        'Request timed out while sending to admin.'
      );
      inserted = res.data;
      error = res.error;
    } catch (e) {
      error = e;
    }
    if (!error) break;
    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      const next = { ...current };
      delete next[missingCol];
      current = next;
      continue;
    }
    break;
  }

  if (error) {
    await setItemLifecycleStatus(type, itemId, 'live').catch(() => {});
    if (isRlsError(error) || isNetworkLikeError(error)) {
      try {
        const row = await persistClaimViaBackend(current);
        if (row) inserted = row;
        else throw error;
      } catch (backendErr) {
        throw new Error(formatClaimPersistError(backendErr));
      }
    } else {
      throw new Error(formatClaimPersistError(error));
    }
  }

  if (result === 'auto_pass') {
    try {
      await approveItemClaim({
        ...inserted,
        itemType: type,
        itemId,
        targetItem: item,
        claimer_name: identity.claimer_name,
        claimer_student_id: identity.claimer_student_id,
      });
      return {
        claim: { ...inserted, status: 'approved' },
        score,
        result,
        message: `Challenge ${score}% · ${challengeResultLabel('auto_pass')}`,
      };
    } catch (approveErr) {
      // Keep claim open as Physical so admin can Confirm office → Returned Items
      console.warn('Auto-pass archive failed:', approveErr?.message);
      if (inserted?.id) {
        await supabase
          .from('item_claims')
          .update({
            status: 'physical',
            challenge_result: 'physical',
            reviewed_at: null,
          })
          .eq('id', inserted.id);
      }
      await setItemLifecycleStatus(type, itemId, 'awaiting_pickup').catch(() => {});
      return {
        claim: { ...inserted, status: 'physical', challenge_result: 'physical' },
        score,
        result: 'physical',
        message: `Challenge ${score}% · Physical — ${OWNERSHIP_OFFICE_VISIT}. Office must confirm return.`,
      };
    }
  }

  if (result === 'reject') {
    await setItemLifecycleStatus(type, itemId, 'live');
    if (inserted?.id) {
      await supabase
        .from('item_claims')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), challenge_result: 'reject' })
        .eq('id', inserted.id);
    }
    return {
      claim: { ...inserted, status: 'rejected' },
      score,
      result,
      message: 'Score too low — item is live on the board again.',
    };
  }

  return {
    claim: { ...inserted, status: 'physical' },
    score,
    result,
    message:
      askTotal > 0
        ? `Ask answers need office review — ${OWNERSHIP_OFFICE_VISIT}.`
        : `Challenge ${score}% · ${challengeResultLabel('physical')}`,
  };
};

export const submitItemClaim = async (item, itemType, claimForm) => {
  if (!item?.id) throw new Error('Item data is missing.');
  const reason = claimForm?.description?.trim();
  if (!reason) throw new Error('Please describe why this item is yours.');
  if (reason.length < 10) throw new Error('Please write a little more detail for admin review.');

  const identity = await withTimeout(
    resolveClaimantIdentity(claimForm.claimerEmail),
    12000,
    'Could not verify your account. Check your connection and try again.'
  );
  const type = itemType === 'found' ? 'found' : 'lost';
  const itemId = Number(item.id);

  // Schema requires both FKs NOT NULL; item_type + item_id identify the real listing.
  const payload = {
    lost_item_id: itemId,
    found_item_id: itemId,
    item_type: type,
    item_id: itemId,
    claimer_name: identity.claimer_name,
    claimer_email: identity.claimer_email,
    claimer_student_id: identity.claimer_student_id,
    description: reason,
    match_score: 0,
    match_breakdown: {
      source: 'direct',
      item_type: type,
      item_name: item.itemName || item.item_name || 'Unknown item',
      category: item.category || null,
      image_uri: item.imageURI || item.imageuri || null,
      location: item.location || null,
    },
    status: 'pending',
  };

  const alreadyPending = await getUserPendingClaimForItem(itemId, type, identity.claimer_email);
  if (alreadyPending) {
    throw new Error(CLAIM_ALREADY_PENDING_MSG);
  }

  let current = { ...payload };
  let inserted;
  let error;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const result = await withTimeout(
        supabase.from('item_claims').insert(current).select().single(),
        15000,
        'Request timed out while sending to admin.'
      );
      inserted = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }
    if (!error) break;
    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      const next = { ...current };
      delete next[missingCol];
      current = next;
      continue;
    }
    break;
  }

  if (error) {
    if (isRlsError(error) || isNetworkLikeError(error)) {
      const row = await persistClaimViaBackend(current);
      if (row) return row;
    }
    throw new Error(formatClaimPersistError(error));
  }

  return inserted;
};

export const getPendingItemClaims = async () => {
  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to load requests.');
  return enrichClaimRows(data || []);
};

export const getPendingItemClaimById = async (claimId) => {
  const id = Number(claimId);
  if (!Number.isFinite(id)) throw new Error('Invalid claim id.');

  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to load claim details.');
  if (!data) return null;

  const rows = await enrichClaimRows([data]);
  return rows[0] || null;
};

export const getPendingItemClaimCount = async () => {
  try {
    const { count, error } = await supabase
      .from('item_claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    return count || 0;
  } catch (e) {
    return 0;
  }
};

export const approveItemClaim = async (claim) => {
  const itemType = claim.itemType || claim.item_type || 'found';
  const itemId =
    claim.itemId ||
    claim.item_id ||
    claim.found_item_id ||
    claim.lost_item_id;
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const reviewedAt = new Date().toISOString();

  if (!itemId) throw new Error('This ownership request is missing a linked item.');

  let itemRow =
    claim.targetItem ||
    (await supabase.from(table).select('*').eq('id', itemId).maybeSingle()).data;

  // Prefer fresh live row so archive fields are complete
  if (itemRow?.id) {
    const { data: live } = await supabase.from(table).select('*').eq('id', itemRow.id).maybeSingle();
    if (live) itemRow = live;
  }

  if (!itemRow?.id) {
    // Nothing left to archive — still mark claim approved
    const { error: updateError } = await supabase
      .from('item_claims')
      .update({ status: 'approved', reviewed_at: reviewedAt })
      .eq('id', claim.id);
    if (updateError) throw new Error(updateError.message);
    return { success: true, archived: false };
  }

  await markItemAsReturned(
    itemRow,
    itemType.toUpperCase(),
    claim.claimer_name,
    claim.claimer_student_id
  );

  const { error: claimError } = await supabase
    .from('item_claims')
    .update({ status: 'approved', challenge_result: 'auto_pass', reviewed_at: reviewedAt })
    .eq('id', claim.id);

  if (claimError) {
    throw new Error(
      claimError.message ||
        'Item was returned, but claim status could not be updated.'
    );
  }

  return { success: true, archived: true };
};

export const rejectItemClaim = async (claimId, adminNote = '') => {
  const { error } = await supabase
    .from('item_claims')
    .update({
      status: 'rejected',
      admin_note: adminNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) throw new Error(error.message || 'Failed to reject request.');
  return { success: true };
};

// RETURNED ITEMS LOGS
export const markItemAsReturned = async (item, type, recipientName, recipientStudentId) => {
  try {
    const typeUpper = String(type || '').toUpperCase();
    const dataToInsert = {
      item_name: item.itemName || item.item_name || 'Unnamed item',
      category: item.category || 'General',
      description: item.description || null,
      location: item.location || null,
      imageuri: item.imageURI || item.imageuri || item.image_url || null,
      type: typeUpper,
      original_reporter:
        typeUpper === 'LOST'
          ? item.ownerName || item.owner_name || 'Unknown'
          : item.finderName || item.finder_name || 'Unknown',
      reporter_email: item.email || null,
      recipient_name: recipientName || null,
      recipient_student_id: recipientStudentId || null,
      returned_at: new Date().toISOString(),
      submitted_at: item.created_at || item.createdAt || null,
      date_reported:
        typeUpper === 'LOST'
          ? item.dateLost || item.date_lost || null
          : item.dateFound || item.date_found || null,
      time_reported:
        typeUpper === 'LOST'
          ? item.timeLost || item.time_lost || null
          : item.timeFound || item.time_found || null,
    };

    let { error: insertError } = await supabase.from('returned_items').insert(dataToInsert);

    if (insertError && /submitted_at|date_reported|time_reported|column/i.test(insertError.message || '')) {
      const { submitted_at, date_reported, time_reported, ...legacy } = dataToInsert;
      ({ error: insertError } = await supabase.from('returned_items').insert(legacy));
    }

    if (insertError) throw insertError;

    const table = typeUpper === 'LOST' ? 'lost_items' : 'found_items';
    const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (err) {
    console.error('Error marking item as returned:', err);
    throw err;
  }
};

export const getAllReturnedItems = async () => {
  const { data, error } = await supabase
    .from('returned_items')
    .select('*')
    .order('returned_at', { ascending: false });
  if (error) throw error;
  return normalizeItems(data || []);
};

export async function fetchDistinctCategories() {
  const [lostRes, foundRes] = await Promise.all([
    supabase.from('lost_items').select('category'),
    supabase.from('found_items').select('category'),
  ]);

  if (lostRes.error) throw lostRes.error;
  if (foundRes.error) throw foundRes.error;

  const set = new Set();
  [...(lostRes.data || []), ...(foundRes.data || [])].forEach((row) => {
    const category = typeof row.category === 'string' ? row.category.trim() : '';
    if (!category) return;
    const lower = category.toLowerCase();
    if (lower === 'books' || lower === 'personal' || lower === 'general') return;
    set.add(category);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// STORAGE
export const uploadImage = async (bucket, fileName, fileUri) => {
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Failed to read image from device.');
  }

  const arrayBuffer = await response.arrayBuffer();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
};

const updateItemWithColumnFallback = async (table, id, payload) => {
  let current = { ...payload };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase.from(table).update(current).eq('id', id).select();
    if (!error) return data?.[0] || null;

    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      const next = { ...current };
      delete next[missingCol];
      current = next;
      continue;
    }

    throw new Error(error.message || 'Database update failed.');
  }

  throw new Error('Database update failed after column fallbacks.');
};

const withItemType = (item, itemType) =>
  normalizeItemRow({
    ...item,
    itemType,
    type: itemType === 'lost' ? 'LOST' : 'FOUND',
  });

// ── Admin drafts / secure / inventory (web parity) ───────────────────────────

export const createLostDraft = async (itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await insertItemWithColumnFallback('lost_items', {
    ...prepared,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  });
  return normalizeItemRow(row);
};

export const createFoundDraft = async (itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await insertItemWithColumnFallback('found_items', {
    ...prepared,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
    listing_mode: LISTING_MODE.PUBLIC,
  });
  return normalizeItemRow(row);
};

export const updateLostDraft = async (id, itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await updateItemWithColumnFallback('lost_items', id, {
    ...prepared,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  });
  return normalizeItemRow(row);
};

export const updateFoundDraft = async (id, itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await updateItemWithColumnFallback('found_items', id, {
    ...prepared,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  });
  return normalizeItemRow(row);
};

export const publishLostDraft = async (id, itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await updateItemWithColumnFallback('lost_items', id, {
    ...prepared,
    is_approved: true,
    status: ITEM_STATUS.LIVE,
  });
  await notifyItemWentLive('lost', row);
  return normalizeItemRow(row);
};

export const publishFoundDraft = async (id, itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  if (!prepared.imageURI) throw new Error('Photo required to publish.');
  const row = await updateItemWithColumnFallback('found_items', id, {
    ...prepared,
    is_approved: true,
    status: ITEM_STATUS.LIVE,
  });
  await notifyItemWentLive('found', row);
  return normalizeItemRow(row);
};

export const createSecureFoundItem = async (itemData, { asDraft = false } = {}) => {
  const prepared = await prepareItemForInsert(itemData);
  const status = asDraft ? ITEM_STATUS.DRAFT : ITEM_STATUS.LIVE;
  const row = await insertItemWithColumnFallback('found_items', {
    ...prepared,
    finderName: prepared.finderName || prepared.ownerName || 'Campus Security',
    listing_mode: LISTING_MODE.SECURE,
    public_notice: prepared.public_notice || prepared.description || null,
    public_category: prepared.public_category || prepared.category || 'General',
    location: normalizeOfficeLocation(
      prepared.security_location || prepared.location,
      STUDENT_AFFAIRS_OFFICE
    ),
    security_location: normalizeOfficeLocation(
      prepared.security_location || prepared.location,
      STUDENT_AFFAIRS_OFFICE
    ),
    is_approved: status === ITEM_STATUS.LIVE,
    status,
  });
  if (status === ITEM_STATUS.LIVE) await notifyItemWentLive('found', row);
  return withItemType(row, 'found');
};

export const updateSecureFoundDraft = async (id, itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await updateItemWithColumnFallback('found_items', id, {
    ...prepared,
    listing_mode: LISTING_MODE.SECURE,
    public_notice: prepared.public_notice || prepared.description || null,
    public_category: prepared.public_category || prepared.category || 'General',
    location: normalizeOfficeLocation(
      prepared.security_location || prepared.location,
      STUDENT_AFFAIRS_OFFICE
    ),
    security_location: normalizeOfficeLocation(
      prepared.security_location || prepared.location,
      STUDENT_AFFAIRS_OFFICE
    ),
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  });
  return withItemType(row, 'found');
};

export const publishSecureFoundDraft = async (id, itemData) => {
  const prepared = await prepareItemForInsert(itemData);
  const row = await updateItemWithColumnFallback('found_items', id, {
    ...prepared,
    listing_mode: LISTING_MODE.SECURE,
    public_notice: prepared.public_notice || prepared.description || null,
    public_category: prepared.public_category || prepared.category || 'General',
    location: normalizeOfficeLocation(
      prepared.security_location || prepared.location,
      STUDENT_AFFAIRS_OFFICE
    ),
    security_location: normalizeOfficeLocation(
      prepared.security_location || prepared.location,
      STUDENT_AFFAIRS_OFFICE
    ),
    is_approved: true,
    status: ITEM_STATUS.LIVE,
  });
  await notifyItemWentLive('found', row);
  return withItemType(row, 'found');
};

export const fetchDraftInventoryItems = async () => {
  const [lostRes, foundRes] = await Promise.all([
    supabase.from('lost_items').select('*').eq('status', ITEM_STATUS.DRAFT).order('id', { ascending: false }),
    supabase.from('found_items').select('*').eq('status', ITEM_STATUS.DRAFT).order('id', { ascending: false }),
  ]);

  if (lostRes.error && foundRes.error) {
    throw new Error(lostRes.error.message || foundRes.error.message || 'Failed to load drafts.');
  }

  return [
    ...(lostRes.data || []).map((item) => withItemType(item, 'lost')),
    ...(foundRes.data || []).map((item) => withItemType(item, 'found')),
  ].sort((a, b) => (b.id || 0) - (a.id || 0));
};

export const fetchDraftItemById = async (itemType, id) => {
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('status', ITEM_STATUS.DRAFT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Draft not found or already published.');
  return withItemType(data, itemType === 'found' ? 'found' : 'lost');
};

export const fetchSecureDraftItemById = async (id) => {
  const { data, error } = await supabase
    .from('found_items')
    .select('*')
    .eq('id', id)
    .eq('status', ITEM_STATUS.DRAFT)
    .eq('listing_mode', LISTING_MODE.SECURE)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Secure draft not found or already published.');
  return withItemType(data, 'found');
};

export const fetchActiveSecureFoundItems = async () => {
  const { data, error } = await supabase
    .from('found_items')
    .select('*')
    .eq('listing_mode', LISTING_MODE.SECURE)
    .eq('status', ITEM_STATUS.LIVE)
    .order('id', { ascending: false });
  if (error) throw error;
  return (data || []).map((item) => withItemType(item, 'found'));
};

export const markSecureFoundReturned = async (id) => {
  const { data: item, error: fetchError } = await supabase
    .from('found_items')
    .select('*')
    .eq('id', id)
    .eq('listing_mode', LISTING_MODE.SECURE)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!item) throw new Error('Secure found item not found.');

  const returnedRow = {
    item_name: item.itemName || item.item_name || 'Secure hold item',
    category: item.category || item.public_category || 'General',
    description: item.description || item.public_notice || null,
    location: item.location || item.security_location || null,
    imageuri: item.imageURI || item.imageuri || null,
    type: 'FOUND',
    original_reporter: item.finderName || item.finder_name || 'Campus Security',
    reporter_email: item.email || null,
    recipient_name: 'Verified in person',
    recipient_student_id: null,
    returned_at: new Date().toISOString(),
    submitted_at: item.created_at || null,
    date_reported: item.dateFound || item.date_found || null,
    time_reported: item.timeFound || item.time_found || null,
  };

  let { error: insertError } = await supabase.from('returned_items').insert(returnedRow);
  if (insertError && /submitted_at|date_reported|time_reported|column/i.test(insertError.message || '')) {
    const { submitted_at, date_reported, time_reported, ...legacy } = returnedRow;
    ({ error: insertError } = await supabase.from('returned_items').insert(legacy));
  }
  if (insertError) throw insertError;

  const { error: deleteError } = await supabase.from('found_items').delete().eq('id', id);
  if (deleteError) throw deleteError;
  return { success: true };
};

export const deleteInventoryItem = async (item) => {
  const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
  const id = item.id;
  if (!id) throw new Error('Invalid item.');

  await Promise.allSettled([
    supabase.from('item_claims').delete().eq('item_type', itemType).eq('item_id', id),
    itemType === 'lost'
      ? supabase.from('item_claims').delete().eq('lost_item_id', id)
      : supabase.from('item_claims').delete().eq('found_item_id', id),
  ]);

  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return { success: true };
};

export const deleteDraftInventoryItem = async (item) => {
  if (normalizeItemStatus(item) !== ITEM_STATUS.DRAFT) {
    throw new Error('Only draft items can be deleted from this page.');
  }
  return deleteInventoryItem(item);
};

export const fetchAllInventoryItems = async () => {
  const [lostRes, foundRes] = await Promise.all([
    supabase.from('lost_items').select('*').order('id', { ascending: false }),
    supabase.from('found_items').select('*').order('id', { ascending: false }),
  ]);
  if (lostRes.error) throw lostRes.error;
  if (foundRes.error) throw foundRes.error;
  return [
    ...(lostRes.data || []).map((item) => withItemType(item, 'lost')),
    ...(foundRes.data || []).map((item) => withItemType(item, 'found')),
  ];
};

export const deleteItemClaim = async (claimId) => {
  const { error } = await supabase.from('item_claims').delete().eq('id', claimId);
  if (error) throw error;
  return { success: true };
};

export const getAllItemClaims = async () => {
  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Failed to load requests.');
  return enrichClaimRows(data || []);
};

export const changeAdminPassword = async ({ email, studentId, currentPassword, newPassword }) => {
  const response = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email ? String(email).trim().toLowerCase() : undefined,
      studentId: studentId ? String(studentId).trim() : undefined,
      currentPassword,
      newPassword,
    }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to change password.');
  }
  return { success: true };
};

export const loginViaBackend = async ({ identifier, password, adminOnly = false }) => {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: String(identifier || '').trim(),
      password: String(password || ''),
      adminOnly: Boolean(adminOnly),
    }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const err = new Error(payload?.error || 'Sign in unsuccessful.');
    err.code = payload?.code || 'LOGIN_FAILED';
    throw err;
  }
  return payload.session;
};

export const fetchSystemReportsSummary = async () => {
  const [users, lost, found, returned, claims] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('lost_items').select('id', { count: 'exact', head: true }),
    supabase.from('found_items').select('id', { count: 'exact', head: true }),
    supabase.from('returned_items').select('id', { count: 'exact', head: true }),
    supabase.from('item_claims').select('id, status'),
  ]);

  const claimRows = claims.data || [];
  return {
    users: users.count || 0,
    lost: lost.count || 0,
    found: found.count || 0,
    returned: returned.count || 0,
    claimsTotal: claimRows.length,
    claimsPending: claimRows.filter((c) => c.status === 'pending').length,
    claimsApproved: claimRows.filter((c) => c.status === 'approved').length,
    claimsRejected: claimRows.filter((c) => c.status === 'rejected').length,
  };
};
