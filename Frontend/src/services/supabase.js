import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { computeMatchScore, MATCH_THRESHOLD } from '../utils/matchItems';
import { BACKEND_URL } from '../config/api';
import { readItemTimeField } from '../utils/itemTimeUtils';

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
    timeLost: normalizeTime(readItemTimeField(item, 'lost')),
    timeFound: normalizeTime(readItemTimeField(item, 'found')),
  };
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
    console.warn('Image upload skipped — item will save without photo:', e?.message);
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
  const dataToInsert = { ...prepared, is_approved: isAdmin ? true : false };
  const row = await insertItemWithColumnFallback('lost_items', dataToInsert);

  if (row && isAdmin) {
    await runMatchingForItem(row.id, 'lost').catch(() => {});
  }

  return normalizeItemRow(row);
};

export const getAllLostItems = async () => {
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
        return await enrichItemsWithPhone(fbData || []);
      }
      throw error;
    }
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    try {
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      return await enrichItemsWithPhone(data || []);
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
      .eq('is_approved', false)
      .order('id', { ascending: false });
    if (error) {
      if (error.code === '42703') return [];
      throw error;
    }
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    return [];
  }
};

export const approveLostItem = async (id) => {
  try {
    const { error } = await supabase
      .from('lost_items')
      .update({ is_approved: true })
      .eq('id', id);
    if (error) throw error;
    await runMatchingForItem(id, 'lost');
  } catch (err) {
    console.warn("Approve lost item failed, likely column doesn't exist yet:", err.message);
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
  const dataToInsert = { ...prepared, is_approved: isAdmin ? true : false };
  const row = await insertItemWithColumnFallback('found_items', dataToInsert);

  if (row && isAdmin) {
    await runMatchingForItem(row.id, 'found').catch(() => {});
  }

  return normalizeItemRow(row);
};

export const getAllFoundItems = async () => {
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
        return await enrichItemsWithPhone(fbData || []);
      }
      throw error;
    }
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    try {
      const { data, error } = await supabase
        .from('found_items')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      return await enrichItemsWithPhone(data || []);
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
      .eq('is_approved', false)
      .order('id', { ascending: false });
    if (error) {
      if (error.code === '42703') return [];
      throw error;
    }
    return await enrichItemsWithPhone(data || []);
  } catch (err) {
    return [];
  }
};

export const approveFoundItem = async (id) => {
  try {
    const { error } = await supabase
      .from('found_items')
      .update({ is_approved: true })
      .eq('id', id);
    if (error) throw error;
    await runMatchingForItem(id, 'found');
  } catch (err) {
    console.warn("Approve found item failed, likely column doesn't exist yet:", err.message);
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

// ITEM MATCHING (Smart Suggestions)
const enrichMatchRows = async (rows, sourceItemId, sourceType) => {
  if (!rows?.length) return [];

  const lostIds = [...new Set(rows.map((r) => r.lost_item_id))];
  const foundIds = [...new Set(rows.map((r) => r.found_item_id))];

  const [{ data: lostItems }, { data: foundItems }] = await Promise.all([
    supabase.from('lost_items').select('*').in('id', lostIds),
    supabase.from('found_items').select('*').in('id', foundIds),
  ]);

  const [enrichedLost, enrichedFound] = await Promise.all([
    enrichItemsWithPhone(lostItems || []),
    enrichItemsWithPhone(foundItems || []),
  ]);

  const lostMap = Object.fromEntries(enrichedLost.map((i) => [i.id, i]));
  const foundMap = Object.fromEntries(enrichedFound.map((i) => [i.id, i]));

  return rows
    .map((row) => {
      const lostItem = lostMap[row.lost_item_id];
      const foundItem = foundMap[row.found_item_id];
      if (!lostItem || !foundItem) return null;

      const isSourceLost = sourceType === 'lost';
      const sourceItem = isSourceLost ? lostItem : foundItem;
      const oppositeItem = isSourceLost ? foundItem : lostItem;

      return {
        ...row,
        breakdown: row.breakdown || computeMatchScore(lostItem, foundItem).breakdown,
        sourceItem: { ...sourceItem, type: isSourceLost ? 'LOST' : 'FOUND' },
        oppositeItem: { ...oppositeItem, type: isSourceLost ? 'FOUND' : 'LOST' },
        lostItem,
        foundItem,
      };
    })
    .filter(Boolean)
    .filter((m) => m.sourceItem.id === sourceItemId);
};

const MATCH_PERSIST_HELP =
  'Run supabase/fix_item_matches_rls.sql (or item_matches.sql) in Supabase SQL Editor, then try again.';

const isRlsError = (error) =>
  error?.message?.includes('row-level security') ||
  error?.code === '42501';

const isMatchTableMissing = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  error?.message?.toLowerCase().includes('item_matches');

const formatMatchPersistError = (error) => {
  if (isRlsError(error)) {
    return `Match could not be saved: database security (RLS) is blocking writes. ${MATCH_PERSIST_HELP}`;
  }
  if (isMatchTableMissing(error)) {
    return `Match could not be saved: item_matches table is missing. ${MATCH_PERSIST_HELP}`;
  }
  return error?.message || 'Match could not be saved to database.';
};

const throwMatchPersistError = (error) => {
  throw new Error(formatMatchPersistError(error));
};

const persistMatchRowsViaBackend = async (rows) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Backend match persist failed');
  }

  return data.rows || [];
};

const updateMatchStatusViaBackend = async (payload) => {
  const response = await fetch(`${BACKEND_URL}/api/matches/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Backend match status update failed');
  }

  return data;
};

const upsertMatchRow = async (row) => {
  const payload = {
    lost_item_id: Number(row.lost_item_id),
    found_item_id: Number(row.found_item_id),
    score: Math.round(Number(row.score) || 0),
    breakdown: row.breakdown ?? null,
    status: row.status ?? 'suggested',
  };

  if (!payload.lost_item_id || !payload.found_item_id) {
    throw new Error('Match could not be saved: missing lost/found item ids.');
  }

  const { data, error } = await supabase
    .from('item_matches')
    .upsert(payload, { onConflict: 'lost_item_id,found_item_id' })
    .select();

  if (!error && data?.length) return data[0];

  if (error && isRlsError(error)) {
    try {
      const rows = await persistMatchRowsViaBackend([payload]);
      if (rows?.length) return rows[0];
    } catch (backendError) {
      console.warn('Backend match persist failed:', backendError?.message);
    }
    throwMatchPersistError(error);
  }

  if (error) throwMatchPersistError(error);
  throw new Error('Match could not be saved: no row returned from database.');
};

const computeLiveMatches = async (itemId, type) => {
  const isLost = type === 'lost';
  const table = isLost ? 'lost_items' : 'found_items';
  const oppositeTable = isLost ? 'found_items' : 'lost_items';

  const { data: sourceItem } = await supabase.from(table).select('*').eq('id', itemId).single();
  if (!sourceItem?.is_approved) return [];

  const { data: candidates } = await supabase
    .from(oppositeTable)
    .select('*')
    .eq('is_approved', true);

  const results = [];
  for (const candidate of candidates || []) {
    const lostItem = isLost ? sourceItem : candidate;
    const foundItem = isLost ? candidate : sourceItem;
    const { score, breakdown } = computeMatchScore(lostItem, foundItem);
    if (score < MATCH_THRESHOLD) continue;

    results.push({
      id: `live-${lostItem.id}-${foundItem.id}`,
      lost_item_id: lostItem.id,
      found_item_id: foundItem.id,
      score,
      breakdown,
      status: 'suggested',
      sourceItem: { ...sourceItem, type: isLost ? 'LOST' : 'FOUND' },
      oppositeItem: { ...(isLost ? foundItem : lostItem), type: isLost ? 'FOUND' : 'LOST' },
      lostItem,
      foundItem,
    });
  }

  return results.sort((a, b) => b.score - a.score);
};

export const runMatchingForItem = async (itemId, type) => {
  const live = await computeLiveMatches(itemId, type);
  if (live.length === 0) return [];

  const rows = live.map((m) => ({
    lost_item_id: m.lost_item_id,
    found_item_id: m.found_item_id,
    score: m.score,
    breakdown: m.breakdown,
    status: 'suggested',
  }));

  const { error } = await supabase.from('item_matches').upsert(rows, {
    onConflict: 'lost_item_id,found_item_id',
  });

  if (error) {
    if (isRlsError(error)) {
      try {
        await persistMatchRowsViaBackend(rows);
        return live;
      } catch (backendError) {
        console.warn(
          'item_matches persist skipped:',
          backendError.message,
          '— Run supabase/item_matches.sql in Supabase SQL Editor, or set Backend SUPABASE_KEY to service_role.'
        );
        return live;
      }
    }
    console.warn(
      'item_matches persist skipped:',
      error.message,
      '— Run supabase/item_matches.sql in Supabase SQL Editor.'
    );
    return live;
  }

  return live;
};

export const getMatchesForItem = async (itemId, type, { includeDismissed = false } = {}) => {
  const isLost = type === 'lost';
  const col = isLost ? 'lost_item_id' : 'found_item_id';

  try {
    let query = supabase
      .from('item_matches')
      .select('*')
      .eq(col, itemId)
      .order('score', { ascending: false });

    if (!includeDismissed) {
      query = query.eq('status', 'suggested');
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data?.length) {
      return enrichMatchRows(data, itemId, type);
    }
  } catch (e) {
    console.warn('getMatchesForItem DB fallback:', e?.message);
  }

  const live = await computeLiveMatches(itemId, type);
  if (live.length > 0) {
    await runMatchingForItem(itemId, type);
  }
  return live;
};

export const getMatchCountsForItems = async (items, type) => {
  const counts = {};
  if (!items?.length) return counts;

  const approved = items.filter((i) => i.is_approved);
  if (!approved.length) return counts;

  const ids = approved.map((i) => i.id);
  const col = type === 'lost' ? 'lost_item_id' : 'found_item_id';

  try {
    const { data, error } = await supabase
      .from('item_matches')
      .select(`${col}`)
      .in(col, ids)
      .eq('status', 'suggested');

    if (!error && data) {
      data.forEach((row) => {
        const id = row[col];
        counts[id] = (counts[id] || 0) + 1;
      });
      return counts;
    }
  } catch (e) {
    console.warn('getMatchCountsForItems fallback:', e?.message);
  }

  for (const item of approved) {
    const matches = await computeLiveMatches(item.id, type);
    if (matches.length > 0) counts[item.id] = matches.length;
  }
  return counts;
};

export const dismissMatch = async (matchId, matchPayload) => {
  if (String(matchId).startsWith('live-')) {
    if (!matchPayload?.lost_item_id || !matchPayload?.found_item_id) {
      throw new Error('Match data missing for dismiss');
    }
    await upsertMatchRow({
      lost_item_id: matchPayload.lost_item_id,
      found_item_id: matchPayload.found_item_id,
      score: matchPayload.score ?? 0,
      breakdown: matchPayload.breakdown,
      status: 'dismissed',
    });
    return { success: true };
  }

  const { error } = await supabase
    .from('item_matches')
    .update({ status: 'dismissed' })
    .eq('id', matchId);

  if (error) {
    if (isRlsError(error) && matchPayload) {
      try {
        await updateMatchStatusViaBackend({
          id: matchId,
          status: 'dismissed',
          lost_item_id: matchPayload.lost_item_id,
          found_item_id: matchPayload.found_item_id,
          score: matchPayload.score,
          breakdown: matchPayload.breakdown,
        });
        return { success: true };
      } catch (backendError) {
        console.warn('dismiss match backend sync failed:', backendError?.message);
        throwMatchPersistError(error);
      }
    }
    throw error;
  }
  return { success: true };
};

export const linkMatch = async (matchId, matchPayload) => {
  if (String(matchId).startsWith('live-')) {
    if (!matchPayload?.lost_item_id || !matchPayload?.found_item_id) {
      throw new Error('Match data missing for link');
    }
    await upsertMatchRow({
      lost_item_id: matchPayload.lost_item_id,
      found_item_id: matchPayload.found_item_id,
      score: matchPayload.score ?? 0,
      breakdown: matchPayload.breakdown,
      status: 'linked',
    });
    return { success: true };
  }

  const { error } = await supabase
    .from('item_matches')
    .update({ status: 'linked' })
    .eq('id', matchId);

  if (error) {
    if (isRlsError(error) && matchPayload) {
      try {
        await updateMatchStatusViaBackend({
          id: matchId,
          status: 'linked',
          lost_item_id: matchPayload.lost_item_id,
          found_item_id: matchPayload.found_item_id,
          score: matchPayload.score,
          breakdown: matchPayload.breakdown,
        });
        return { success: true };
      } catch (backendError) {
        console.warn('link match backend sync failed:', backendError?.message);
        throwMatchPersistError(error);
      }
    }
    throw error;
  }
  return { success: true };
};

const enrichAllMatchRows = async (rows) => {
  if (!rows?.length) return [];

  const lostIds = [...new Set(rows.map((r) => r.lost_item_id))];
  const foundIds = [...new Set(rows.map((r) => r.found_item_id))];

  const [{ data: lostItems }, { data: foundItems }] = await Promise.all([
    supabase.from('lost_items').select('*').in('id', lostIds),
    supabase.from('found_items').select('*').in('id', foundIds),
  ]);

  const [enrichedLost, enrichedFound] = await Promise.all([
    enrichItemsWithPhone(lostItems || []),
    enrichItemsWithPhone(foundItems || []),
  ]);

  const lostMap = Object.fromEntries(enrichedLost.map((i) => [i.id, i]));
  const foundMap = Object.fromEntries(enrichedFound.map((i) => [i.id, i]));

  return rows
    .map((row) => {
      const lostItem = lostMap[row.lost_item_id];
      const foundItem = foundMap[row.found_item_id];
      if (!lostItem || !foundItem) return null;

      const { breakdown } = computeMatchScore(lostItem, foundItem);

      return {
        ...row,
        breakdown: row.breakdown || breakdown,
        lostItem: { ...lostItem, type: 'LOST' },
        foundItem: { ...foundItem, type: 'FOUND' },
        sourceItem: { ...lostItem, type: 'LOST' },
        oppositeItem: { ...foundItem, type: 'FOUND' },
      };
    })
    .filter(Boolean);
};

export const getConfirmedMatches = async () => {
  try {
    const { data, error } = await supabase
      .from('item_matches')
      .select('*')
      .eq('status', 'linked')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return enrichAllMatchRows(data || []);
  } catch (e) {
    console.warn('getConfirmedMatches failed:', e?.message);
    return [];
  }
};

export const getConfirmedMatchCount = async () => {
  try {
    const { count, error } = await supabase
      .from('item_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'linked');

    if (error) throw error;
    return count || 0;
  } catch (e) {
    return 0;
  }
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
