import { createClient } from '@supabase/supabase-js';
import { ITEM_STATUS, normalizeItemStatus } from './itemStatus';
import { buildDashboardTrendRows } from './dashboardAnalytics';
import { mapInventoryItem, mapRecentActivityItem, resolveItemImageUrl } from './itemImage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const REQUEST_TIMEOUT_MS = 15000;

async function withTimeout(promise, label = 'Request') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTableCount(table) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

async function fetchRecentFromTable(table, limit = 8) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function fetchTrendSnapshotFromTable(table, limit = 120) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

async function postAuth(path, body) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return payload;
}

function getAdminTokenFromSession() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('userSession');
    if (!raw) return '';
    const session = JSON.parse(raw);
    return String(session?.adminToken || '').trim();
  } catch {
    return '';
  }
}

async function adminApi(path, { method = 'GET', body } = {}) {
  const token = getAdminTokenFromSession();
  if (!token) {
    const err = new Error('Admin session expired. Please log in again.');
    err.code = 'ADMIN_TOKEN_MISSING';
    throw err;
  }
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const err = new Error(payload?.error || `Request failed (${response.status})`);
    err.code = payload?.code || 'ADMIN_API_ERROR';
    throw err;
  }
  return payload;
}

/** Admin web login — passwords never leave the Backend (service_role). */
export async function loginUser(studentId, password) {
  const payload = await postAuth('/api/auth/login', {
    identifier: String(studentId || '').trim(),
    password: String(password || ''),
    adminOnly: true,
  });
  return payload.session;
}

export async function changeAdminPassword({ email, studentId, currentPassword, newPassword }) {
  const normalizedEmail = email?.trim().toLowerCase();
  const sid = studentId?.trim();
  const hasEmail = normalizedEmail && normalizedEmail !== 'null';
  const hasStudentId = sid && sid !== 'null';

  if (!hasEmail && !hasStudentId) {
    throw new Error('Admin session was not found. Please log in again.');
  }

  await postAuth('/api/auth/change-password', {
    email: hasEmail ? normalizedEmail : undefined,
    studentId: hasStudentId ? sid : undefined,
    currentPassword,
    newPassword,
  });
  return { success: true };
}

async function fetchAllFromTable(table) {
  const { data, error } = await supabase.from(table).select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

function parseMissingColumn(error) {
  if (!error || (error.code !== 'PGRST204' && error.code !== '42703')) return null;
  const match = error.message?.match(/Could not find the '([^']+)' column|column "([^"]+)"/i);
  return match?.[1] || match?.[2] || null;
}

async function insertWithColumnFallback(table, payload) {
  let current = { ...payload };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(current).select().single();
    if (!error) return data;

    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      const next = { ...current };
      delete next[missingCol];
      current = next;
      continue;
    }

    throw error;
  }

  throw new Error('Database insert failed after column fallbacks.');
}

async function updateWithColumnFallback(table, id, payload) {
  let current = { ...payload };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase.from(table).update(current).eq('id', id).select().single();
    if (!error) return data;

    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      const next = { ...current };
      delete next[missingCol];
      current = next;
      continue;
    }

    throw error;
  }

  throw new Error('Database update failed after column fallbacks.');
}

function normalizeReportDate(value) {
  if (!value) return '';
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function normalizeReportTime(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (/^\d{2}:\d{2}/.test(str)) return str.slice(0, 5);
  return '';
}

export function mapDraftToReportForm(item, itemType) {
  const isFound = itemType === 'found';
  return {
    itemName: item.itemName || item.item_name || '',
    category: item.category || 'Electronics',
    description: item.description || item.notes || item.details || '',
    location: item.location || item.place || '',
    reportDate: normalizeReportDate(isFound ? item.dateFound || item.date_found : item.dateLost || item.date_lost),
    reportTime: normalizeReportTime(isFound ? item.timeFound || item.time_found : item.timeLost || item.time_lost),
    phone: item.phnum || item.phone || item.phone_number || '',
    notifyMatches: true,
  };
}

async function resolveDraftImageUrl(imageFile, existingImageUrl) {
  if (imageFile) return uploadItemImage(imageFile);
  return existingImageUrl || null;
}

function resolveUploadExtension(file) {
  const mime = String(file?.type || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';

  const name = String(file?.name || '');
  const fromName = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (fromName === 'jpeg') return 'jpg';
  if (fromName && ['png', 'webp', 'gif', 'jpg'].includes(fromName)) return fromName;

  return 'jpg';
}

async function uploadItemImage(file) {
  if (!file) return null;

  let uploadFile = file;
  if (typeof window !== 'undefined') {
    try {
      const { compressImageFile } = await import('./compressImage');
      uploadFile = await compressImageFile(file);
    } catch {
      uploadFile = file;
    }
  }

  const ext = resolveUploadExtension(uploadFile);
  const path = `items/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const contentType =
    uploadFile.type ||
    (ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'gif'
          ? 'image/gif'
          : 'image/jpeg');

  const { error } = await supabase.storage.from('item-images').upload(path, uploadFile, {
    cacheControl: '31536000',
    upsert: true,
    contentType,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('item-images').getPublicUrl(path);
  return data.publicUrl;
}

async function notifyItemWentLive(itemType, row) {
  if (!row?.id) return;
  const type = itemType === 'lost' ? 'lost' : 'found';
  const label = type === 'lost' ? 'Lost' : 'Found';
  const name = String(row.itemName || row.item_name || 'An item').trim() || 'An item';
  const cat = String(row.category || row.public_category || row.publicCategory || '').trim();
  const { error } = await supabase.from('app_notifications').insert({
    type: 'item_live',
    title: `New ${label} item`,
    body: cat ? `${name} (${cat}) is now live on the feed.` : `${name} is now live on the feed.`,
    item_type: type,
    item_id: row.id,
    item_name: name,
    category: cat || null,
  });
  // 23505 = unique_violation (trigger already inserted)
  if (error && error.code !== '23505') console.warn('notifyItemWentLive:', error.message);
}

export async function createAdminLostItem(payload, imageFile) {
  const imageUrl = await uploadItemImage(imageFile);
  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateLost: payload.reportDate || null,
    date_lost: payload.reportDate || null,
    timeLost: payload.reportTime || null,
    ownerName: payload.ownerName,
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: true,
    status: ITEM_STATUS.LIVE,
    approved_at: new Date().toISOString(),
  };

  const saved = await insertWithColumnFallback('lost_items', row);
  await notifyItemWentLive('lost', saved);
  return saved;
}

export async function createAdminLostDraft(payload, imageFile) {
  const imageUrl = await uploadItemImage(imageFile);
  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateLost: payload.reportDate || null,
    date_lost: payload.reportDate || null,
    timeLost: payload.reportTime || null,
    ownerName: payload.ownerName,
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  };

  return insertWithColumnFallback('lost_items', row);
}

export async function createAdminFoundItem(payload, imageFile) {
  const imageUrl = await uploadItemImage(imageFile);
  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateFound: payload.reportDate || null,
    date_found: payload.reportDate || null,
    timeFound: payload.reportTime || null,
    finderName: payload.finderName,
    finderId: payload.finderId || payload.userId || payload.email || 'admin-01',
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: true,
    status: ITEM_STATUS.LIVE,
    approved_at: new Date().toISOString(),
  };

  const saved = await insertWithColumnFallback('found_items', row);
  await notifyItemWentLive('found', saved);
  return saved;
}

export async function createAdminFoundDraft(payload, imageFile) {
  const imageUrl = await uploadItemImage(imageFile);
  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateFound: payload.reportDate || null,
    date_found: payload.reportDate || null,
    timeFound: payload.reportTime || null,
    finderName: payload.finderName,
    finderId: payload.finderId || payload.userId || payload.email || 'admin-01',
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  };

  return insertWithColumnFallback('found_items', row);
}

export async function fetchDraftItemById(itemType, id) {
  const draftId = Number(id);
  if (!draftId) throw new Error('Invalid draft id.');

  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', draftId)
    .eq('status', ITEM_STATUS.DRAFT)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Draft not found or it was already published.');

  return {
    raw: data,
    mapped: mapInventoryItem(data, itemType),
  };
}

export async function updateAdminLostDraft(id, payload, imageFile, existingImageUrl) {
  const imageUrl = await resolveDraftImageUrl(imageFile, existingImageUrl);
  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateLost: payload.reportDate || null,
    date_lost: payload.reportDate || null,
    timeLost: payload.reportTime || null,
    ownerName: payload.ownerName,
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  };

  return updateWithColumnFallback('lost_items', id, row);
}

export async function updateAdminFoundDraft(id, payload, imageFile, existingImageUrl) {
  const imageUrl = await resolveDraftImageUrl(imageFile, existingImageUrl);
  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateFound: payload.reportDate || null,
    date_found: payload.reportDate || null,
    timeFound: payload.reportTime || null,
    finderName: payload.finderName,
    finderId: payload.finderId || payload.userId || payload.email || 'admin-01',
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: false,
    status: ITEM_STATUS.DRAFT,
  };

  return updateWithColumnFallback('found_items', id, row);
}

export async function publishAdminLostDraft(id, payload, imageFile, existingImageUrl) {
  const imageUrl = await resolveDraftImageUrl(imageFile, existingImageUrl);

  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateLost: payload.reportDate || null,
    date_lost: payload.reportDate || null,
    timeLost: payload.reportTime || null,
    ownerName: payload.ownerName,
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: true,
    status: ITEM_STATUS.LIVE,
    approved_at: new Date().toISOString(),
  };

  const saved = await updateWithColumnFallback('lost_items', id, row);
  await notifyItemWentLive('lost', saved);
  return saved;
}

export async function publishAdminFoundDraft(id, payload, imageFile, existingImageUrl) {
  const imageUrl = await resolveDraftImageUrl(imageFile, existingImageUrl);
  if (!imageUrl) throw new Error('Photo required');

  const row = {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateFound: payload.reportDate || null,
    date_found: payload.reportDate || null,
    timeFound: payload.reportTime || null,
    finderName: payload.finderName,
    finderId: payload.finderId || payload.userId || payload.email || 'admin-01',
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    is_approved: true,
    status: ITEM_STATUS.LIVE,
    approved_at: new Date().toISOString(),
  };

  const saved = await updateWithColumnFallback('found_items', id, row);
  await notifyItemWentLive('found', saved);
  return saved;
}

function buildSecureFoundRow(payload, imageUrl, status) {
  return {
    itemName: payload.itemName,
    category: payload.category,
    description: payload.description || null,
    location: payload.location,
    dateFound: payload.reportDate || null,
    date_found: payload.reportDate || null,
    timeFound: payload.reportTime || null,
    finderName: payload.finderName || payload.ownerName,
    finderId: payload.finderId || payload.userId || payload.email || 'admin-01',
    email: payload.email,
    userId: payload.userId || payload.email,
    userid: payload.userId || payload.email,
    phnum: payload.phone || '',
    imageURI: imageUrl,
    listing_mode: 'secure',
    public_notice: payload.publicNotice,
    public_category: payload.publicCategory,
    security_location: payload.securityLocation || 'Campus Security Office',
    is_approved: status === ITEM_STATUS.LIVE,
    approved_at: status === ITEM_STATUS.LIVE ? new Date().toISOString() : null,
    status,
  };
}

export function mapSecureDraftToReportForm(item) {
  return {
    name: item.itemName || item.item_name || '',
    category: item.category || item.public_category || item.publicCategory || 'Electronics',
    description: item.public_notice || item.publicNotice || item.description || '',
  };
}

export async function fetchSecureDraftItemById(id) {
  const draftId = Number(id);
  if (!draftId) throw new Error('Invalid draft id.');

  const { data, error } = await supabase
    .from('found_items')
    .select('*')
    .eq('id', draftId)
    .eq('status', ITEM_STATUS.DRAFT)
    .eq('listing_mode', 'secure')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Secure draft not found or it was already published.');

  return { raw: data, mapped: mapInventoryItem(data, 'found') };
}

export async function createAdminSecureFoundDraft(payload, imageFile) {
  const imageUrl = await uploadItemImage(imageFile);
  const row = buildSecureFoundRow(payload, imageUrl, ITEM_STATUS.DRAFT);
  return insertWithColumnFallback('found_items', row);
}

export async function createAdminSecureFoundItem(payload, imageFile) {
  const imageUrl = await uploadItemImage(imageFile);
  const row = buildSecureFoundRow(payload, imageUrl, ITEM_STATUS.LIVE);
  const saved = await insertWithColumnFallback('found_items', row);
  await notifyItemWentLive('found', saved);
  return saved;
}

export async function updateAdminSecureFoundDraft(id, payload, imageFile, existingImageUrl) {
  const imageUrl = await resolveDraftImageUrl(imageFile, existingImageUrl);
  const row = buildSecureFoundRow(payload, imageUrl, ITEM_STATUS.DRAFT);
  return updateWithColumnFallback('found_items', id, row);
}

export async function publishAdminSecureFoundDraft(id, payload, imageFile, existingImageUrl) {
  const imageUrl = await resolveDraftImageUrl(imageFile, existingImageUrl);
  const row = buildSecureFoundRow(payload, imageUrl, ITEM_STATUS.LIVE);
  const saved = await updateWithColumnFallback('found_items', id, row);
  await notifyItemWentLive('found', saved);
  return saved;
}

export async function fetchActiveSecureFoundItems() {
  const { data, error } = await supabase
    .from('found_items')
    .select('*')
    .eq('listing_mode', 'secure')
    .eq('status', ITEM_STATUS.LIVE)
    .order('id', { ascending: false });

  if (error) throw error;
  return (data || []).map((item) => mapInventoryItem(item, 'found'));
}

function pickReturnedReportTiming(item, itemType) {
  const isLost = String(itemType || '').toUpperCase() === 'LOST';
  const dateReported = isLost
    ? item?.dateLost || item?.date_lost || null
    : item?.dateFound || item?.date_found || null;
  const timeReported = isLost
    ? item?.timeLost || item?.time_lost || null
    : item?.timeFound || item?.time_found || null;
  const submittedAt = item?.created_at || item?.createdAt || null;

  return {
    submitted_at: submittedAt || null,
    date_reported: dateReported ? String(dateReported).slice(0, 10) : null,
    time_reported: timeReported ? String(timeReported).slice(0, 5) : null,
  };
}

async function insertReturnedArchiveRow(row) {
  const { error } = await supabase.from('returned_items').insert(row);
  if (!error) return;

  const missingTimingColumn =
    /submitted_at|date_reported|time_reported|column/i.test(error.message || '') ||
    error.code === 'PGRST204' ||
    error.code === '42703';

  if (!missingTimingColumn) {
    throw new Error(error.message || 'Failed to archive returned item.');
  }

  const { submitted_at, date_reported, time_reported, ...legacy } = row;
  const retry = await supabase.from('returned_items').insert(legacy);
  if (retry.error) {
    throw new Error(retry.error.message || 'Failed to archive returned item.');
  }
}

export async function markSecureFoundReturned(id) {
  const { data: item, error: fetchError } = await supabase
    .from('found_items')
    .select('*')
    .eq('id', id)
    .eq('listing_mode', 'secure')
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!item) throw new Error('Secure found item not found.');

  const returnedRow = {
    item_name: item.itemName || item.item_name || 'Secure hold item',
    category: item.category || item.public_category || 'General',
    description: item.description || item.public_notice || null,
    location: item.location || item.security_location || null,
    imageuri: item.imageURI || item.imageuri || item.image_url || null,
    type: 'FOUND',
    original_reporter: item.finderName || item.finder_name || 'Campus Security',
    reporter_email: item.email || null,
    recipient_name: 'Verified in person',
    recipient_student_id: null,
    returned_at: new Date().toISOString(),
    ...pickReturnedReportTiming(item, 'FOUND'),
  };

  await insertReturnedArchiveRow(returnedRow);

  const { error: deleteError } = await supabase.from('found_items').delete().eq('id', id);
  if (deleteError) throw new Error(deleteError.message || 'Failed to remove secure hold.');

  return { success: true };
}

export async function markInventoryItemReturned(item, recipientName, recipientStudentId = null) {
  if (!item?.id) throw new Error('Item not found.');
  const itemType = item.itemType || 'lost';
  const table = itemType === 'found' ? 'found_items' : 'lost_items';

  const { data: row, error: fetchError } = await supabase.from(table).select('*').eq('id', item.id).maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) throw new Error('Item not found or already returned.');

  const typeLabel = itemType === 'found' ? 'FOUND' : 'LOST';
  const returnedRow = {
    item_name: row.itemName || row.item_name || item.displayName || 'Item',
    category: row.category || item.displayCategory || 'General',
    description: row.description || item.displayDescription || null,
    location: row.location || item.displayLocation || null,
    imageuri: row.imageURI || row.imageuri || row.image_url || item.imageUrl || null,
    type: typeLabel,
    original_reporter:
      typeLabel === 'LOST'
        ? row.ownerName || row.owner_name || 'Unknown'
        : row.finderName || row.finder_name || 'Unknown',
    reporter_email: row.email || null,
    recipient_name: recipientName || null,
    recipient_student_id: recipientStudentId || null,
    returned_at: new Date().toISOString(),
    ...pickReturnedReportTiming(row, typeLabel),
  };

  await insertReturnedArchiveRow(returnedRow);

  const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id);
  if (deleteError) throw new Error(deleteError.message || 'Failed to remove item from inventory.');

  return { success: true };
}

export async function fetchAdminUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    const fallback = await supabase.from('users').select('*').order('id', { ascending: false });
    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  }

  return data || [];
}

export async function updateAdminUserApproval(email, isApproved) {
  await adminApi('/api/admin/users/set-approval', {
    method: 'POST',
    body: { email, isApproved },
  });
}

export async function deleteAdminUser(email, { deletedBy } = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new Error('User email is required.');
  await adminApi('/api/admin/users/delete', {
    method: 'POST',
    body: { email: normalized, deletedBy },
  });
}

async function fetchPendingFromTable(table) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('status', ITEM_STATUS.PENDING_REVIEW)
      .order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    // Fallback when status column is missing ? never include drafts in Pending
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('is_approved', false)
      .order('id', { ascending: false });
    if (error) return [];
    return (data || []).filter((row) => {
      const status = normalizeItemStatus(row);
      return status !== ITEM_STATUS.DRAFT && status !== ITEM_STATUS.LIVE && status !== ITEM_STATUS.RETURNED;
    });
  }
}

export async function fetchDashboardData() {
  const [
    users,
    lostCount,
    foundCount,
    returnedCount,
    pendingLost,
    pendingFound,
    recentLost,
    recentFound,
    trendLost,
    trendFound,
    claimsResult,
  ] = await withTimeout(
    Promise.all([
      supabase.from('users').select('role, is_approved').then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      fetchTableCount('lost_items'),
      fetchTableCount('found_items'),
      fetchTableCount('returned_items').catch(() => 0),
      fetchPendingFromTable('lost_items'),
      fetchPendingFromTable('found_items'),
      fetchRecentFromTable('lost_items', 8),
      fetchRecentFromTable('found_items', 8),
      fetchTrendSnapshotFromTable('lost_items').catch(() => []),
      fetchTrendSnapshotFromTable('found_items').catch(() => []),
      supabase
        .from('item_claims')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count, error }) => (error ? 0 : count || 0))
        .catch(() => 0),
    ]),
    'Dashboard data'
  );

  const students = users.filter((u) => u.role === 'user');
  const activeUsers = students.filter((u) => u.is_approved === true);
  const pendingUsers = students.filter((u) => u.is_approved !== true);
  const pendingReports = pendingLost.length + pendingFound.length;
  const totalItems = lostCount + foundCount;
  const recovered = returnedCount;
  const recoveryRate = totalItems > 0 ? Math.round((recovered / totalItems) * 100) : 0;
  const inVault = Math.max(totalItems - recovered, 0);

  const recentLostMapped = recentLost.map((item) => {
    const mapped = mapRecentActivityItem(item, 'lost');
    mapped.displayStatus = getActivityStatus(item, 'lost');
    return mapped;
  });

  const recentFoundMapped = recentFound.map((item) => {
    const mapped = mapRecentActivityItem(item, 'found');
    mapped.displayStatus = getActivityStatus(item, 'found');
    return mapped;
  });

  const recentActivity = [...recentLostMapped, ...recentFoundMapped]
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 8);

  const trendRows = buildDashboardTrendRows(trendLost, trendFound);

  return {
    stats: {
      totalItems,
      lostCount,
      foundCount,
      pendingReports,
      pendingUsers: pendingUsers.length,
      successfulRecoveries: recovered,
      activeUsers: activeUsers.length,
      claimsCount: claimsResult,
    },
    health: {
      recoveryRate,
      recovered,
      inVault: Math.max(inVault, 0),
      lostCount,
      foundCount,
    },
    actionItems: buildActionItems({
      pendingUsers: pendingUsers.length,
      pendingReports,
      claimsCount: claimsResult,
      recoveryRate,
    }),
    recentActivity,
    trendRows,
    badgeCounts: {
      pending: pendingReports,
      claims: claimsResult,
    },
  };
}

function getActivityStatus(item, itemType) {
  const status = normalizeItemStatus(item);
  if (status === ITEM_STATUS.RETURNED) return { label: 'Returned', tone: 'returned' };
  if (item.status === 'matched') return { label: 'Matched', tone: 'matched' };
  if (status === ITEM_STATUS.PENDING_REVIEW) return { label: 'Pending', tone: 'pending' };
  return itemType === 'found'
    ? { label: 'Found', tone: 'found' }
    : { label: 'Lost', tone: 'lost' };
}

function buildActionItems({ pendingUsers, pendingReports, claimsCount, recoveryRate }) {
  const items = [];
  if (pendingUsers > 0) {
    items.push({
      title: `Verify ${pendingUsers} New User${pendingUsers > 1 ? 's' : ''}`,
      subtitle: 'Student accounts awaiting approval',
      href: '/admin/users',
      icon: 'users',
    });
  }
  if (claimsCount > 0) {
    items.push({
      title: 'Review Flagged Match',
      subtitle: `${claimsCount} ownership request${claimsCount > 1 ? 's' : ''} pending`,
      href: '/admin/claims',
      icon: 'clipboard',
    });
  }
  if (pendingReports > 0) {
    items.push({
      title: `Review ${pendingReports} Pending Report${pendingReports > 1 ? 's' : ''}`,
      subtitle: 'Lost & found submissions need review',
      href: '/admin/pending',
      icon: 'alert',
    });
  }
  if (recoveryRate >= 85) {
    items.push({
      title: `Vault at ${recoveryRate}% capacity`,
      subtitle: 'High recovery rate this period',
      href: '/admin/items',
      icon: 'vault',
    });
  }
  if (items.length === 0) {
    items.push({
      title: 'All caught up',
      subtitle: 'No urgent tasks right now',
      href: '/admin',
      icon: 'check',
    });
  }
  return items.slice(0, 3);
}

export async function fetchPendingReports() {
  const [pendingLost, pendingFound] = await withTimeout(
    Promise.all([fetchPendingFromTable('lost_items'), fetchPendingFromTable('found_items')]),
    'Pending reports'
  );

  const onlyPending = (rows) =>
    (rows || []).filter((row) => {
      const status = normalizeItemStatus(row);
      return status === ITEM_STATUS.PENDING_REVIEW || (!row.status && row.is_approved === false);
    }).filter((row) => normalizeItemStatus(row) !== ITEM_STATUS.DRAFT);

  const lost = onlyPending(pendingLost);
  const found = onlyPending(pendingFound);
  const reporterLookup = await fetchReporterLookup([...lost, ...found]);

  const combined = [
    ...lost.map((item) => normalizePendingRow(item, 'lost', reporterLookup)),
    ...found.map((item) => normalizePendingRow(item, 'found', reporterLookup)),
  ].sort((a, b) => b.id - a.id);

  return { lost, found, combined };
}

function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function addReporterLookup(lookup, keys, studentId) {
  if (!studentId) return;
  keys.filter(Boolean).forEach((key) => {
    lookup[key] = studentId;
  });
}

async function fetchReporterLookup(items) {
  if (!items.length) return { lookup: {} };

  const emails = [...new Set(items.map((item) => normalizeLookupKey(item.email)).filter(Boolean))];

  const tasks = [];
  if (emails.length) {
    tasks.push(supabase.from('users').select('email, student_id, name, phone').in('email', emails));
    tasks.push(
      supabase
        .from('student_directory')
        .select('student_id, studentId, email, full_name, name, phone_number, phone, phnum')
        .in('email', emails)
    );
  }

  const results = await Promise.allSettled(tasks);
  const lookup = {};

  results.forEach((result) => {
    if (result.status !== 'fulfilled' || result.value.error) return;
    (result.value.data || []).forEach((row) => {
      const studentId = row.student_id || row.studentId;
      addReporterLookup(
        lookup,
        [
          `email:${normalizeLookupKey(row.email)}`,
          `name:${normalizeLookupKey(row.name || row.full_name)}`,
          `phone:${normalizePhone(row.phone || row.phone_number || row.phnum)}`,
        ],
        studentId
      );
    });
  });

  return { lookup, emails };
}

function normalizePendingRow(item, type, reporterLookup = {}) {
  const name = item.itemName || item.item_name || 'Unnamed item';
  const prefix = type === 'lost' ? 'REC' : 'FND';
  const reporterName = type === 'lost' ? item.ownerName || item.owner_name : item.finderName || item.finder_name;
  const studentId =
    item.student_id ||
    item.studentId ||
    reporterLookup.lookup?.[`email:${normalizeLookupKey(item.email)}`] ||
    reporterLookup.lookup?.[`phone:${normalizePhone(item.phnum || item.phone || item.phone_number)}`] ||
    reporterLookup.lookup?.[`name:${normalizeLookupKey(reporterName)}`] ||
    '';
  return {
    ...item,
    reportType: type,
    displayName: name,
    displayCategory: item.category || 'General',
    reporterName,
    reporterEmail: item.email || '',
    reporterStudentId: studentId,
    refId: `#${prefix}-${String(item.id).padStart(5, '0')}`,
    imageUrl: resolveItemImageUrl(item),
    reportedAt:
      item.created_at ||
      item.date_reported ||
      item.dateLost ||
      item.dateFound ||
      item.date_lost ||
      item.date_found ||
      null,
  };
}

async function setItemStatus(table, id, status) {
  const isLive = status === ITEM_STATUS.LIVE;
  const nowIso = new Date().toISOString();
  const patch = { status, is_approved: isLive, approved_at: isLive ? nowIso : null };
  const { error } = await supabase.from(table).update(patch).eq('id', id);
  if (error) {
    const missingCol = parseMissingColumn(error);
    if (missingCol === 'approved_at') {
      const { error: fb } = await supabase
        .from(table)
        .update({ status, is_approved: isLive })
        .eq('id', id);
      if (fb) throw fb;
      return;
    }

    const { error: fb } = await supabase.from(table).update({ is_approved: isLive }).eq('id', id);
    if (fb) throw fb;
  }
}

export async function approvePendingReport(type, id) {
  const table = type === 'lost' ? 'lost_items' : 'found_items';
  const itemType = type === 'lost' ? 'lost' : 'found';
  const { data: item } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  await setItemStatus(table, id, ITEM_STATUS.LIVE);
  await notifyItemWentLive(itemType, { ...(item || {}), id });
}

export async function rejectPendingReport(type, id) {
  const table = type === 'lost' ? 'lost_items' : 'found_items';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

function normalizeClaimItem(item, itemType) {
  if (!item) return null;
  const displayName = item.itemName || item.item_name || 'Unnamed item';
  return {
    ...item,
    itemType,
    displayName,
    displayCategory: item.category || 'General',
    displayLocation: item.location || 'Campus',
    reporterName: itemType === 'lost' ? item.ownerName || item.owner_name : item.finderName || item.finder_name,
    reporterEmail: item.email || '',
    refId: `${itemType === 'lost' ? 'LOST' : 'FOUND'}-${String(item.id).padStart(4, '0')}`,
    imageUrl: resolveItemImageUrl(item),
  };
}

function parseClaimBreakdown(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Snapshot saved on the claim when submitted — survives approve (live row deleted). */
function buildClaimItemFromBreakdown(row) {
  const breakdown = parseClaimBreakdown(row?.match_breakdown);
  if (!breakdown) return null;

  const displayName = breakdown.item_name || breakdown.itemName || null;
  const imageUri = breakdown.image_uri || breakdown.imageURI || breakdown.imageuri || null;
  if (!displayName && !imageUri) return null;

  const itemType = breakdown.item_type || row.item_type || 'found';
  return normalizeClaimItem(
    {
      id: row.item_id || row.found_item_id || row.lost_item_id || null,
      item_name: displayName || 'Unnamed item',
      category: breakdown.category || 'General',
      location: breakdown.location || 'Campus',
      imageuri: imageUri,
      imageURI: imageUri,
    },
    itemType === 'lost' ? 'lost' : 'found'
  );
}

async function fetchClaimItemFromReturned(row) {
  const itemId = row.item_id || row.found_item_id || row.lost_item_id;
  const claimerName = String(row.claimer_name || '').trim();
  if (!claimerName && !itemId) return null;

  try {
    let query = supabase
      .from('returned_items')
      .select('*')
      .order('returned_at', { ascending: false })
      .limit(12);

    if (claimerName) {
      query = query.ilike('recipient_name', claimerName);
    }

    const { data, error } = await query;
    if (error || !data?.length) return null;

    const match =
      data.find((entry) => {
        const recipientId = String(entry.recipient_student_id || '').trim().toLowerCase();
        const claimId = String(row.claimer_student_id || '').trim().toLowerCase();
        if (claimId && recipientId && claimId === recipientId) return true;
        return Boolean(claimerName);
      }) || data[0];

    if (!match) return null;

    const itemType = String(match.type || row.item_type || 'found').toLowerCase() === 'lost' ? 'lost' : 'found';
    return normalizeClaimItem(
      {
        id: itemId || match.id,
        item_name: match.item_name || match.itemName || 'Unnamed item',
        category: match.category || 'General',
        location: match.location || 'Campus',
        imageuri: match.imageuri || match.imageURI || match.image_url || null,
        description: match.description || null,
      },
      itemType
    );
  } catch {
    return null;
  }
}

async function fetchClaimItem(row) {
  const preferredType = row.item_type || null;
  const preferredId = row.item_id || null;
  const candidates = [];

  if (preferredType && preferredId) candidates.push({ type: preferredType, id: preferredId });
  if (row.found_item_id) candidates.push({ type: 'found', id: row.found_item_id });
  if (row.lost_item_id) candidates.push({ type: 'lost', id: row.lost_item_id });

  const seen = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.type}-${candidate.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const table = candidate.type === 'lost' ? 'lost_items' : 'found_items';
    const { data, error } = await supabase.from(table).select('*').eq('id', candidate.id).maybeSingle();
    if (!error && data) return normalizeClaimItem(data, candidate.type);
  }

  // Approved claims delete the live row — recover name/photo from claim snapshot.
  const fromBreakdown = buildClaimItemFromBreakdown(row);
  if (fromBreakdown) return fromBreakdown;

  return fetchClaimItemFromReturned(row);
}

function normalizeClaimRow(row, targetItem) {
  const itemType = targetItem?.itemType || row.item_type || 'found';
  const createdAt = row.created_at || null;
  const rawStatus = row.status || 'pending';
  const displayStatus =
    rawStatus === 'approved'
      ? 'Approved'
      : rawStatus === 'rejected'
        ? 'Rejected'
        : row.match_score > 0
          ? 'Reviewing'
          : 'Pending';

  return {
    ...row,
    itemType,
    itemId: targetItem?.id || row.item_id || row.found_item_id || row.lost_item_id,
    targetItem,
    displayStatus,
    refId: `CLM-${String(row.id).padStart(4, '0')}`,
    requestedAt: createdAt,
  };
}

export async function fetchPendingItemClaims() {
  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to load ownership requests.');

  const enriched = await Promise.all(
    (data || []).map(async (row) => normalizeClaimRow(row, await fetchClaimItem(row)))
  );

  return enriched;
}

export async function approveItemClaim(claim) {
  const itemType = claim.itemType || claim.item_type || 'found';
  const itemId = claim.itemId || claim.item_id || claim.found_item_id || claim.lost_item_id;
  const table = itemType === 'lost' ? 'lost_items' : 'found_items';
  const reviewedAt = new Date().toISOString();

  if (!itemId) throw new Error('This ownership request is missing a linked item.');

  // Load live item first ? do NOT mark claim approved until archive + remove succeed
  let item = claim.targetItem;
  if (!item?.id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', itemId).maybeSingle();
    if (error) throw new Error(error.message || 'Could not load linked item.');
    item = data;
  }
  if (!item) throw new Error('Linked item was not found. It may already have been returned or deleted.');

  const returnedRow = {
    item_name: item.itemName || item.item_name || 'Unnamed item',
    category: item.category || 'General',
    description: item.description || null,
    location: item.location || null,
    imageuri: item.imageURI || item.imageuri || item.image_url || null,
    type: String(itemType).toUpperCase(),
    original_reporter:
      itemType === 'lost'
        ? item.ownerName || item.owner_name || 'Unknown'
        : item.finderName || item.finder_name || 'Unknown',
    reporter_email: item.email || null,
    recipient_name: claim.claimer_name || null,
    recipient_student_id: claim.claimer_student_id || null,
    returned_at: reviewedAt,
    ...pickReturnedReportTiming(item, itemType),
  };

  try {
    await insertReturnedArchiveRow(returnedRow);
  } catch (err) {
    throw new Error(err.message || 'Could not archive item as returned. Approve cancelled.');
  }

  const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id);
  if (deleteError) {
    throw new Error(
      deleteError.message ||
        'Item was archived as returned, but could not be removed from live inventory. Approve cancelled ? check Returned Items and delete the live row manually if needed.'
    );
  }

  const { error: claimError } = await supabase
    .from('item_claims')
    .update({ status: 'approved', reviewed_at: reviewedAt })
    .eq('id', claim.id);

  if (claimError) {
    throw new Error(
      claimError.message ||
        'Item was returned, but claim status could not be updated. Refresh and check Returned Items.'
    );
  }

  return { success: true };
}

export async function rejectItemClaim(claimId, adminNote = '') {
  const { error } = await supabase
    .from('item_claims')
    .update({
      status: 'rejected',
      admin_note: adminNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) throw new Error(error.message || 'Failed to reject ownership request.');
  return { success: true };
}

export async function deleteItemClaim(claimId) {
  const { error } = await supabase.from('item_claims').delete().eq('id', claimId);
  if (error) throw new Error(error.message || 'Failed to delete ownership request.');
  return { success: true };
}

export async function fetchAllInventoryItems() {
  const [lost, found] = await withTimeout(
    Promise.all([fetchAllFromTable('lost_items'), fetchAllFromTable('found_items')]),
    'All items'
  );

  return [
    ...lost.map((item) => mapInventoryItem(item, 'lost')),
    ...found.map((item) => mapInventoryItem(item, 'found')),
  ].sort((a, b) => b.sortKey - a.sortKey);
}

export async function fetchDraftInventoryItems() {
  const items = await fetchAllInventoryItems();
  return items.filter((item) => normalizeItemStatus(item) === ITEM_STATUS.DRAFT);
}

async function deleteRelatedItemClaims(item) {
  const { itemType, id } = item;
  const queries = [
    supabase.from('item_claims').delete().eq('item_type', itemType).eq('item_id', id),
    itemType === 'lost'
      ? supabase.from('item_claims').delete().eq('lost_item_id', id)
      : supabase.from('item_claims').delete().eq('found_item_id', id),
  ];

  for (const query of queries) {
    const { error } = await query;
    if (error && !/column|does not exist/i.test(error.message || '')) {
      throw new Error(error.message || 'Could not remove linked ownership requests.');
    }
  }
}

export async function deleteInventoryItem(item, { deletedBy } = {}) {
  if (!item?.id || !item?.itemType) throw new Error('Invalid item.');

  await adminApi('/api/admin/items/delete-to-recycle', {
    method: 'POST',
    body: {
      id: item.id,
      itemType: item.itemType,
      deletedBy,
    },
  });
  return { success: true };
}

export async function deleteDraftInventoryItem(item) {
  if (normalizeItemStatus(item) !== ITEM_STATUS.DRAFT) {
    throw new Error('Only draft items can be deleted from this page.');
  }
  return deleteInventoryItem(item);
}

/** Move a live inventory item out of the student app into archived_items (Super Admin). */
export async function archiveInventoryItem(item, { archivedBy, reason } = {}) {
  if (!item?.id || !item?.itemType) throw new Error('Invalid item.');

  await adminApi('/api/admin/archive-item', {
    method: 'POST',
    body: {
      id: item.id,
      itemType: item.itemType,
      archivedBy,
      reason: reason || 'Unclaimed / stale item',
    },
  });
  return { success: true };
}

function normalizeArchivedItem(row) {
  const archivedAt = row.archived_at || row.created_at || null;
  const archivedMs = archivedAt ? new Date(archivedAt).getTime() : NaN;
  return {
    ...row,
    displayName: row.item_name || row.itemName || 'Unnamed item',
    displayCategory: row.category || 'General',
    displayDescription: row.description || 'Archived from live inventory.',
    displayLocation: row.location || 'Campus',
    displayType: String(row.type || 'LOST').toUpperCase(),
    displayOriginalReporter: row.original_reporter || 'Unknown reporter',
    displayReporterEmail: row.reporter_email || '',
    displayReason: row.reason || 'Unclaimed / stale item',
    displayArchivedBy: row.archived_by || 'Super Admin',
    refId: `ARC-${String(row.id).padStart(4, '0')}`,
    archivedAt,
    sortKey: Number.isFinite(archivedMs) ? archivedMs : Number(row.id) || 0,
    imageUrl: resolveItemImageUrl(row),
  };
}

export async function fetchArchivedItems() {
  const payload = await adminApi('/api/admin/archived');
  return (payload.items || []).map(normalizeArchivedItem);
}

export async function restoreArchivedItem(archived) {
  const id = archived?.id;
  if (!id) throw new Error('Invalid archived item.');
  await adminApi('/api/admin/archived/restore', { method: 'POST', body: { id } });
  return { success: true };
}

/** Permanently remove an archived record (does not restore to live inventory). */
export async function purgeArchivedItem(archived) {
  const id = archived?.id;
  if (!id) throw new Error('Invalid archived item.');
  await adminApi('/api/admin/archived/purge', { method: 'POST', body: { id } });
  return { success: true };
}

function inferSubmittedAtFromImage(item) {
  const raw =
    item?.imageUrl ||
    item?.imageuri ||
    item?.imageURI ||
    item?.image_url ||
    item?.imageUri ||
    '';
  const match = String(raw).match(/(?:^|\/)items\/(\d{12,14})_/i);
  if (!match) return null;
  const ms = Number(match[1]);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 2020 || year > 2035) return null;
  return date.toISOString();
}

function claimMatchesReturned(claim, item) {
  const claimName = String(claim.claimer_name || '').trim().toLowerCase();
  const claimId = String(claim.claimer_student_id || '').trim().toLowerCase();
  const recipientName = String(item.displayRecipient || item.recipient_name || '').trim().toLowerCase();
  const recipientId = String(item.displayRecipientId || item.recipient_student_id || '')
    .trim()
    .toLowerCase();

  if (!claimName || !recipientName || claimName !== recipientName) return false;
  if (claimId && recipientId && claimId !== recipientId) return false;

  const reviewedMs = claim.reviewed_at ? new Date(claim.reviewed_at).getTime() : NaN;
  const returnedMs = item.returnedAt || item.returned_at ? new Date(item.returnedAt || item.returned_at).getTime() : NaN;
  if (!Number.isFinite(reviewedMs) || !Number.isFinite(returnedMs)) return true;
  return Math.abs(reviewedMs - returnedMs) <= 3 * 86_400_000;
}

async function enrichReturnedSubmittedTimes(items) {
  const needs = items.filter((item) => !item.submittedAt && !item.dateReported);
  if (!needs.length) return items;

  const { data: claims, error } = await supabase
    .from('item_claims')
    .select('claimer_name, claimer_student_id, reviewed_at, created_at, status')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false });

  if (error || !Array.isArray(claims) || !claims.length) return items;

  return items.map((item) => {
    if (item.submittedAt || item.dateReported) return item;
    const match = claims.find((claim) => claimMatchesReturned(claim, item));
    if (!match?.created_at) return item;
    return { ...item, submittedAt: match.created_at };
  });
}

function normalizeReturnedItem(item) {
  const returnedAt = item.returned_at || item.created_at || null;
  const returnedMs = returnedAt ? new Date(returnedAt).getTime() : NaN;
  const dateReported = item.date_reported || null;
  const timeReported = item.time_reported || null;
  const imageUrl = resolveItemImageUrl(item);
  const submittedAt =
    item.submitted_at ||
    inferSubmittedAtFromImage({ ...item, imageUrl }) ||
    null;

  return {
    ...item,
    displayName: item.item_name || item.itemName || 'Unnamed item',
    displayCategory: item.category || 'General',
    displayDescription: item.description || 'Returned to its verified owner.',
    displayLocation: item.location || 'Campus',
    displayType: String(item.type || 'FOUND').toUpperCase(),
    displayOriginalReporter: item.original_reporter || 'Unknown reporter',
    displayReporterEmail: item.reporter_email || '',
    displayRecipient: item.recipient_name || 'Not recorded',
    displayRecipientId: item.recipient_student_id || '',
    refId: `RET-${String(item.id).padStart(4, '0')}`,
    returnedAt,
    submittedAt,
    dateReported,
    timeReported,
    sortKey: Number.isFinite(returnedMs) ? returnedMs : Number(item.id) || 0,
    imageUrl,
  };
}

export async function fetchReturnedItems() {
  const { data, error } = await supabase
    .from('returned_items')
    .select('*')
    .order('returned_at', { ascending: false, nullsFirst: false });

  if (error) {
    const fallback = await supabase.from('returned_items').select('*').order('id', { ascending: false });
    if (fallback.error) throw fallback.error;
    return enrichReturnedSubmittedTimes((fallback.data || []).map(normalizeReturnedItem));
  }

  return enrichReturnedSubmittedTimes((data || []).map(normalizeReturnedItem));
}

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

/** @param {{ includePrivilegedSources?: boolean }} [options]
 *  Privileged sources (Deleted Records + Archived Items) are Super Admin only.
 */
export async function fetchSystemReportsData({ includePrivilegedSources = false } = {}) {
  const baseFetches = [
    fetchAdminUsers(),
    fetchAllInventoryItems(),
    fetchReturnedItems(),
    fetchPendingItemClaims(),
    fetchPendingReports(),
    fetchActiveSecureFoundItems(),
  ];

  const [users, items, returnedItems, claims, pendingData, secureItems, recycleRes, archivedItems] =
    await withTimeout(
      Promise.all([
        ...baseFetches,
        includePrivilegedSources
          ? fetchRecycleBinItems().catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
        includePrivilegedSources ? fetchArchivedItems().catch(() => []) : Promise.resolve([]),
      ]),
      'System reports'
    );

  const recycleItems = includePrivilegedSources ? recycleRes?.items || [] : [];
  const archived = includePrivilegedSources && Array.isArray(archivedItems) ? archivedItems : [];
  const archivedLost = archived.filter((item) => String(item.displayType || item.type || '').toUpperCase() === 'LOST');
  const archivedFound = archived.filter((item) => String(item.displayType || item.type || '').toUpperCase() === 'FOUND');

  const lostItems = items.filter((item) => item.itemType === 'lost');
  const foundItems = items.filter((item) => item.itemType === 'found');
  const draftItems = items.filter((item) => normalizeItemStatus(item) === ITEM_STATUS.DRAFT);
  const liveItems = items.filter((item) => normalizeItemStatus(item) === ITEM_STATUS.LIVE);
  const pendingReviewItems = items.filter(
    (item) => normalizeItemStatus(item) === ITEM_STATUS.PENDING_REVIEW
  );

  const students = users.filter((user) => user.role === 'user');
  const admins = users.filter((user) => user.role !== 'user');
  const approvedStudents = students.filter((user) => user.is_approved === true);
  const pendingStudents = students.filter((user) => user.is_approved !== true);

  const pendingClaims = claims.filter((claim) => claim.status === 'pending');
  const approvedClaims = claims.filter((claim) => claim.status === 'approved');
  const rejectedClaims = claims.filter((claim) => claim.status === 'rejected');

  const categoryMap = {};
  items.forEach((item) => {
    const category = item.displayCategory || item.category || 'Other';
    categoryMap[category] = (categoryMap[category] || 0) + 1;
  });

  const categories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const totalItems = items.length;
  const recovered = returnedItems.length;
  const recoveryRate = totalItems > 0 ? Math.round((recovered / totalItems) * 100) : 0;

  const dataSources = [
    {
      id: 'users',
      label: 'Registered Users',
      description: 'Students and administrators across campus',
      href: '/admin/users',
      count: users.length,
      meta: `${approvedStudents.length} approved - ${pendingStudents.length} pending`,
    },
    {
      id: 'inventory',
      label: 'Global Inventory',
      description: 'All lost and found property records',
      href: '/admin/items',
      count: totalItems,
      meta: `${lostItems.length} lost - ${foundItems.length} found`,
    },
    {
      id: 'lost',
      label: 'Lost Reports',
      description: 'Items reported missing on campus',
      href: '/admin/items',
      count: lostItems.length,
      meta: `${pendingReviewItems.filter((item) => item.itemType === 'lost').length} awaiting review`,
    },
    {
      id: 'found',
      label: 'Found Reports',
      description: 'Recovered items logged in the system',
      href: '/admin/items',
      count: foundItems.length,
      meta: `${liveItems.filter((item) => item.itemType === 'found').length} live listings`,
    },
    {
      id: 'returned',
      label: 'Returned Items',
      description: 'Successfully reunited with owners',
      href: '/admin/returned',
      count: recovered,
      meta: `${recoveryRate}% recovery rate`,
    },
    {
      id: 'pending',
      label: 'Pending Reports',
      description: 'Submissions waiting for admin review',
      href: '/admin/pending',
      count: pendingData.combined?.length || 0,
      meta: 'Requires verification',
    },
    {
      id: 'claims',
      label: 'Ownership Requests',
      description: 'Student claims on found or lost items',
      href: '/admin/claims',
      count: claims.length,
      meta: `${pendingClaims.length} pending - ${approvedClaims.length} approved`,
    },
    {
      id: 'drafts',
      label: 'Draft Items',
      description: 'Saved reports not yet published',
      href: '/admin/drafts',
      count: draftItems.length,
      meta: 'Unpublished field reports',
    },
    {
      id: 'secure',
      label: 'Secure Found Holds',
      description: 'High-value secure campus notices',
      href: '/admin/secure-found',
      count: secureItems.length,
      meta: 'Active secure listings',
    },
  ];

  if (includePrivilegedSources) {
    dataSources.push(
      {
        id: 'recycle',
        label: 'Deleted Records',
        description: 'Deleted users and inventory waiting to be purged',
        href: '/admin/backup',
        count: recycleItems.length,
        meta: 'Requires Super Admin',
      },
      {
        id: 'archived',
        label: 'Archived Items',
        description: 'Stale unclaimed items removed from the student feed',
        href: '/admin/archived',
        count: archived.length,
        meta: `${archivedLost.length} lost · ${archivedFound.length} found`,
      }
    );
  }

  const records = {
    users: mapSystemReportUsers(users),
    inventory: mapSystemReportItems(items),
    lost: mapSystemReportItems(lostItems),
    found: mapSystemReportItems(foundItems),
    returned: mapSystemReportReturned(returnedItems),
    pending: mapSystemReportPending(pendingData.combined || []),
    claims: mapSystemReportClaims(claims),
    drafts: mapSystemReportItems(draftItems),
    secure: mapSystemReportItems(secureItems),
  };

  if (includePrivilegedSources) {
    records.recycle = mapSystemReportRecycle(recycleItems);
    records.archived = mapSystemReportArchived(archived);
  }

  return {
    summary: {
      totalUsers: users.length,
      students: students.length,
      admins: admins.length,
      approvedStudents: approvedStudents.length,
      pendingStudents: pendingStudents.length,
      totalItems,
      lostItems: lostItems.length,
      foundItems: foundItems.length,
      returnedItems: recovered,
      pendingReports: pendingData.combined?.length || 0,
      draftItems: draftItems.length,
      secureItems: secureItems.length,
      recycleItems: includePrivilegedSources ? recycleItems.length : 0,
      archivedItems: includePrivilegedSources ? archived.length : 0,
      totalClaims: claims.length,
      pendingClaims: pendingClaims.length,
      approvedClaims: approvedClaims.length,
      rejectedClaims: rejectedClaims.length,
      recoveryRate,
    },
    categories,
    dataSources,
    records,
    generatedAt: new Date().toISOString(),
  };
}

function formatReportDate(value) {
  if (!value) return '?';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '?';
  }
}

function toReportDateKey(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function mapSystemReportUsers(users = []) {
  return users.map((user) => ({
    id: user.email || String(user.id),
    name: user.name || '?',
    email: user.email || '?',
    studentId: user.student_id || user.studentId || '?',
    role: user.role === 'admin' ? 'Admin' : 'Student',
    status:
      user.role === 'admin' ? 'Admin' : user.is_approved === true ? 'Active' : 'Pending',
    joined: formatReportDate(user.created_at),
    dateKey: toReportDateKey(user.created_at),
  }));
}

function mapSystemReportItems(items = []) {
  const rawDate = (item) => item.reportedAt || item.created_at;
  return items.map((item) => ({
    id: `${item.itemType}-${item.id}`,
    ref: item.inventoryRef || item.refId || `#${item.id}`,
    name: item.displayName || 'Unnamed item',
    category: item.displayCategory || item.category || 'General',
    location: item.displayLocation || item.location || 'Campus',
    type: item.itemType === 'found' ? 'Found' : 'Lost',
    status: normalizeItemStatus(item),
    reportedAt: formatReportDate(rawDate(item)),
    dateKey: toReportDateKey(rawDate(item)),
  }));
}

function mapSystemReportReturned(items = []) {
  return items.map((item) => ({
    id: String(item.id),
    ref: item.refId || `RET-${item.id}`,
    name: item.displayName || 'Unnamed item',
    category: item.displayCategory || 'General',
    recipient: item.displayRecipient || '?',
    type: item.displayType || 'FOUND',
    returnedAt: formatReportDate(item.returnedAt),
    dateKey: toReportDateKey(item.returnedAt),
  }));
}

function mapSystemReportPending(items = []) {
  const rawDate = (item) => item.reportedAt || item.created_at;
  return items.map((item) => ({
    id: `${item.reportType}-${item.id}`,
    ref: item.refId || `#${item.id}`,
    name: item.displayName || 'Unnamed item',
    category: item.displayCategory || 'General',
    reporter: item.reporterName || '?',
    type: item.reportType === 'found' ? 'Found' : 'Lost',
    reportedAt: formatReportDate(rawDate(item)),
    dateKey: toReportDateKey(rawDate(item)),
  }));
}

function mapSystemReportClaims(claims = []) {
  const rawDate = (claim) => claim.requestedAt || claim.created_at;
  return claims.map((claim) => ({
    id: String(claim.id),
    ref: claim.refId || `CLM-${claim.id}`,
    item: claim.targetItem?.displayName || claim.item_name || 'Unknown item',
    claimer: claim.claimer_name || claim.claimerName || '?',
    studentId: claim.claimer_student_id || claim.claimerStudentId || '?',
    status: claim.status || 'pending',
    requestedAt: formatReportDate(rawDate(claim)),
    dateKey: toReportDateKey(rawDate(claim)),
    reviewedDateKey: toReportDateKey(claim.reviewed_at),
  }));
}

function mapSystemReportRecycle(items = []) {
  return items.map((item) => ({
    id: String(item.id),
    ref: `#DEL-${String(item.id).slice(-4)}`,
    name: item.title || 'Unknown',
    category: item.summary || 'No details',
    type: item.entityType || 'Record',
    status: 'Deleted',
    reportedAt: formatReportDate(item.deletedAt),
    dateKey: toReportDateKey(item.deletedAt),
  }));
}

function mapSystemReportArchived(items = []) {
  return items.map((item) => {
    const type = String(item.displayType || item.type || 'LOST').toUpperCase();
    return {
      id: String(item.id),
      ref: item.refId || `ARC-${String(item.id).padStart(4, '0')}`,
      name: item.displayName || item.item_name || 'Unnamed item',
      category: item.displayCategory || item.category || 'General',
      location: item.displayLocation || item.location || '—',
      type: type === 'FOUND' ? 'Found' : 'Lost',
      status: 'Archived',
      reason: item.displayReason || item.reason || '—',
      archivedBy: item.displayArchivedBy || item.archived_by || '—',
      reportedAt: formatReportDate(item.archivedAt || item.archived_at),
      dateKey: toReportDateKey(item.archivedAt || item.archived_at),
    };
  });
}

// -- Recycle bin --------------------------------------------------------------

const RECYCLE_STORAGE_BUCKET = 'item-images';
const RECYCLE_STORAGE_FOLDER = 'admin-recycle';

function isMissingRelationError(error) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /relation|does not exist|Could not find the table/i.test(message)
  );
}

function mapRecycleRow(row) {
  return {
    id: row.id,
    entityType: row.entity_type || row.entityType,
    entityId: row.entity_id || row.entityId,
    title: row.title || 'Deleted record',
    summary: row.summary || '',
    payload: row.payload,
    deletedBy: row.deleted_by || row.deletedBy,
    deletedAt: row.deleted_at || row.deletedAt,
    backend: row.backend || 'table',
  };
}

async function writeRecycleStorageEntry(entry) {
  const path = `${RECYCLE_STORAGE_FOLDER}/${entry.id}.json`;
  const body = JSON.stringify(entry);
  const blob = typeof Blob !== 'undefined' ? new Blob([body], { type: 'application/json' }) : body;
  const { error } = await supabase.storage.from(RECYCLE_STORAGE_BUCKET).upload(path, blob, {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw new Error(error.message || 'Could not save recycle bin entry to storage.');
  return { success: true, backend: 'storage' };
}

async function readRecycleStorageEntry(id) {
  const path = `${RECYCLE_STORAGE_FOLDER}/${id}.json`;
  const { data, error } = await supabase.storage.from(RECYCLE_STORAGE_BUCKET).download(path);
  if (error) throw new Error(error.message || 'Recycle bin entry not found.');
  const text = await data.text();
  return JSON.parse(text);
}

async function removeRecycleStorageEntry(id) {
  const path = `${RECYCLE_STORAGE_FOLDER}/${id}.json`;
  const { error } = await supabase.storage.from(RECYCLE_STORAGE_BUCKET).remove([path]);
  if (error) {
    // No DELETE policy: mark tombstone via upsert so list can hide it.
    await writeRecycleStorageEntry({ id, purged: true, deleted_at: new Date().toISOString() });
  }
}

async function snapshotToRecycleBin({ entityType, entityId, title, summary, payload, deletedBy }) {
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    entity_type: entityType,
    entity_id: entityId != null ? String(entityId) : null,
    title: title || entityType,
    summary: summary || null,
    payload,
    deleted_by: deletedBy || null,
    deleted_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('admin_recycle_bin').insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    title: entry.title,
    summary: entry.summary,
    payload: entry.payload,
    deleted_by: entry.deleted_by,
    deleted_at: entry.deleted_at,
  });

  if (!error) return { success: true, backend: 'table' };
  if (!isMissingRelationError(error)) {
    throw new Error(error.message || 'Could not save to recycle bin.');
  }

  // Table missing: fall back to existing item-images storage (no SQL required).
  return writeRecycleStorageEntry({ ...entry, backend: 'storage' });
}

async function listRecycleStorageItems() {
  const listed = await supabase.storage.from(RECYCLE_STORAGE_BUCKET).list(RECYCLE_STORAGE_FOLDER, {
    limit: 200,
    sortBy: { column: 'name', order: 'desc' },
  });

  if (listed.error) return [];

  const files = (listed.data || []).filter((file) => file?.name?.endsWith('.json'));
  const items = [];

  for (const file of files) {
    try {
      const entry = await readRecycleStorageEntry(file.name.replace(/\.json$/i, ''));
      if (!entry || entry.purged) continue;
      items.push(mapRecycleRow({ ...entry, backend: 'storage' }));
    } catch {
      /* skip unreadable entries */
    }
  }

  return items;
}

export async function fetchRecycleBinItems() {
  const payload = await adminApi('/api/admin/recycle-bin');
  const tableItems = (payload.items || []).map((row) => mapRecycleRow({ ...row, backend: 'table' }));

  // Legacy storage entries (from before table existed) — still readable via anon storage
  let storageItems = [];
  try {
    storageItems = await listRecycleStorageItems();
  } catch {
    storageItems = [];
  }

  const seen = new Set(tableItems.map((item) => String(item.id)));
  const merged = [...tableItems, ...storageItems.filter((item) => !seen.has(String(item.id)))];
  merged.sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));

  return {
    available: true,
    backend: payload.backend || 'table',
    items: merged,
  };
}

async function restorePayloadRowLocal(payload) {
  const table = payload?.table;
  const row = payload?.row;
  if (!table || !row) throw new Error('Backup payload is incomplete.');

  if (table === 'users') {
    throw new Error('User restore requires Backend. Please restore table entries only.');
  }

  const { error: insertError } = await supabase.from(table).insert(row);
  if (insertError) {
    if (/duplicate|unique/i.test(insertError.message || '')) {
      const { id: _id, ...withoutId } = row;
      const retry = await supabase.from(table).insert(withoutId);
      if (retry.error) throw new Error(retry.error.message || 'Could not restore item.');
      return;
    }
    throw new Error(insertError.message || 'Could not restore item.');
  }
}

export async function restoreRecycleBinItem(id) {
  try {
    await adminApi('/api/admin/recycle-bin/restore', { method: 'POST', body: { id } });
    return { success: true };
  } catch (err) {
    // Fallback: legacy storage-only entries
    const storageEntry = await readRecycleStorageEntry(id);
    if (!storageEntry || storageEntry.purged) throw err;
    await restorePayloadRowLocal(storageEntry.payload || {});
    await removeRecycleStorageEntry(id);
    return { success: true };
  }
}

export async function purgeRecycleBinItem(id) {
  try {
    await adminApi('/api/admin/recycle-bin/purge', { method: 'POST', body: { id } });
    return { success: true };
  } catch {
    await removeRecycleStorageEntry(id);
    return { success: true };
  }
}
