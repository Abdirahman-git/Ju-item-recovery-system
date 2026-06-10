import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { readItemTimeField } from '../utils/itemTimeUtils';
import { BACKEND_URL } from '../config/api';
import {
  ITEM_STATUS,
  FEED_STATUSES,
  normalizeItemStatus,
  isFeedVisible,
} from '../utils/itemStatus';

const supabaseUrl = 'https://rzlmlegawumzijcrdijq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bG1sZWdhd3VtemlqY3JkaWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTE2NzMsImV4cCI6MjA5MDM4NzY3M30.lmtQiH-kojObUrqNTu7WhUAy7FbowI4gO29Od29GXvk';

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
  // Local file paths are device-specific and cannot be loaded on other phones
  if (imageURI && !isRemoteImageUri(imageURI)) {
    imageURI = null;
  }

  const normalizeTime = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

  return {
    ...item,
    imageURI,
    status: normalizeItemStatus(item),
    timeLost: normalizeTime(readItemTimeField(item, 'lost')),
    timeFound: normalizeTime(readItemTimeField(item, 'found')),
  };
};

const isApprovedForStatus = (status) => status === ITEM_STATUS.LIVE;

export const setItemStatus = async (table, id, status) => {
  const patch = {
    status,
    is_approved: isApprovedForStatus(status),
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
  const { data, error } = await supabase
    .from('users')
    .update({ is_approved: isApproved })
    .eq('email', email);
  if (error) throw error;
  return data;
};

export const deleteUser = async (email) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('email', email);
  if (error) throw error;
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
export const createLostItem = async (itemData, isAdmin = false) => {
  const prepared = await prepareItemForInsert(itemData);
  const dataToInsert = {
    ...prepared,
    is_approved: isAdmin ? true : false,
    status: isAdmin ? ITEM_STATUS.LIVE : ITEM_STATUS.PENDING_REVIEW,
  };
  const row = await insertItemWithColumnFallback('lost_items', dataToInsert);
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

export const approveLostItem = async (id) => {
  try {
    await setItemStatus('lost_items', id, ITEM_STATUS.LIVE);
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
  };
  const row = await insertItemWithColumnFallback('found_items', dataToInsert);
  return normalizeItemRow(row);
};

export const getAllFoundItems = async () => {
  try {
    const { data, error } = await supabase
      .from('found_items')
      .select('*')
      .in('status', FEED_STATUSES)
      .order('id', { ascending: false });

    if (error) throw error;
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
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
    await setItemStatus('found_items', id, ITEM_STATUS.LIVE);
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

const formatClaimPersistError = (error) => {
  if (isRlsError(error)) {
    return 'Could not send to admin: database permissions. Run supabase/item_claims.sql in Supabase.';
  }
  return error?.message || 'Could not send request to admin.';
};

const persistClaimViaBackend = async (payload) => {
  const response = await fetch(`${BACKEND_URL}/api/claims/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim: payload }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Backend claim save failed');
  return data.row;
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
  if (!user?.student_id?.trim()) throw new Error('Your account is missing a Student ID. Contact admin.');

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

export const getUserPendingClaimForItem = async (itemId, itemType, claimerEmail) => {
  const email = claimerEmail?.trim().toLowerCase();
  if (!email || itemId == null) return null;

  const id = Number(itemId);
  if (!Number.isFinite(id)) return null;

  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('id, status, created_at')
      .eq('claimer_email', email)
      .eq('item_id', id)
      .eq('status', 'pending')
      .maybeSingle();
    if (!error && data) return data;
  } catch (e) {
    /* item_id column may be missing */
  }

  const { data: legacy, error: legacyError } = await supabase
    .from('item_claims')
    .select('id, status, created_at')
    .eq('claimer_email', email)
    .eq('lost_item_id', id)
    .eq('found_item_id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (legacyError) return null;
  return legacy;
};

export const CLAIM_ALREADY_PENDING_MSG =
  'You already sent a request for this item. Wait for admin review.';

export const submitItemClaim = async (item, itemType, claimForm) => {
  if (!item?.id) throw new Error('Item data is missing.');
  if (!claimForm?.description?.trim()) throw new Error('Please describe why this item is yours.');

  const identity = await resolveClaimantIdentity(claimForm.claimerEmail);
  const type = itemType === 'found' ? 'found' : 'lost';
  const itemId = Number(item.id);

  const payload = {
    lost_item_id: itemId,
    found_item_id: itemId,
    item_type: type,
    item_id: itemId,
    claimer_name: identity.claimer_name,
    claimer_email: identity.claimer_email,
    claimer_student_id: identity.claimer_student_id,
    description: claimForm.description.trim(),
    match_score: 0,
    match_breakdown: { source: 'direct', item_type: type },
    status: 'pending',
  };

  let existing = null;
  try {
    const { data } = await supabase
      .from('item_claims')
      .select('id')
      .eq('claimer_email', identity.claimer_email)
      .eq('item_id', itemId)
      .eq('status', 'pending')
      .maybeSingle();
    existing = data;
  } catch (e) {
    /* item_id column may be missing */
  }

  if (!existing) {
    const { data: legacy } = await supabase
      .from('item_claims')
      .select('id')
      .eq('claimer_email', identity.claimer_email)
      .eq('lost_item_id', itemId)
      .eq('found_item_id', itemId)
      .eq('status', 'pending')
      .maybeSingle();
    existing = legacy;
  }

  if (existing) {
    throw new Error(CLAIM_ALREADY_PENDING_MSG);
  }

  let current = { ...payload };
  let inserted;
  let error;
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await supabase.from('item_claims').insert(current).select().single();
    inserted = result.data;
    error = result.error;
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
    if (isRlsError(error)) {
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
  const itemId = claim.itemId || claim.item_id || claim.lost_item_id;
  const table = itemType === 'found' ? 'found_items' : 'lost_items';

  const { error: updateError } = await supabase
    .from('item_claims')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', claim.id);

  if (updateError) throw new Error(updateError.message);

  const itemRow =
    claim.targetItem ||
    (await supabase.from(table).select('*').eq('id', itemId).maybeSingle()).data;

  if (itemRow) {
    await markItemAsReturned(
      itemRow,
      itemType.toUpperCase(),
      claim.claimer_name,
      claim.claimer_student_id
    ).catch((e) => console.warn('Archive skipped:', e?.message));
  }

  return { success: true };
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
    // 1. Prepare data for insertion (using lowercase 'imageuri' to match PostgreSQL auto-lowercasing)
    const dataToInsert = {
      item_name: item.itemName,
      category: item.category,
      description: item.description,
      location: item.location,
      imageuri: item.imageURI || null,
      type: type.toUpperCase(), // 'LOST' or 'FOUND'
      original_reporter: type.toUpperCase() === 'LOST' ? (item.ownerName || 'Unknown') : (item.finderName || 'Unknown'),
      reporter_email: item.email || 'N/A',
      recipient_name: recipientName || null,
      recipient_student_id: recipientStudentId || null
    };

    // 2. Insert into returned_items table
    const { error: insertError } = await supabase
      .from('returned_items')
      .insert(dataToInsert);

    if (insertError) throw insertError;

    // 3. Delete from original table
    const table = type.toLowerCase() === 'lost' ? 'lost_items' : 'found_items';
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', item.id);

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
