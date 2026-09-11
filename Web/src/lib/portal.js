import { supabase } from './supabase';
import { FEED_STATUSES, ITEM_STATUS, isFeedVisible } from './itemStatus';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

export function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function normalizeItemRow(row = {}) {
  const isFound = String(row.type || '').toUpperCase() === 'FOUND';
  return {
    ...row,
    id: row.id,
    itemName: row.itemName || row.item_name || row.title || 'Untitled item',
    description: row.description || '',
    category: row.category || 'Other',
    location: row.location || 'Campus',
    dateLost: row.dateLost || row.date_lost || row.date_found || row.created_at,
    dateFound: row.dateFound || row.date_found || '',
    timeLost: row.timeLost || row.time_lost || '',
    imageURI: row.imageURI || row.image_url || row.image_uri || null,
    ownerName: row.ownerName || row.owner_name || row.full_name || '',
    phnum: row.phnum || row.phone_number || row.phone || '',
    email: (row.email || '').toLowerCase().trim(),
    status: row.status || 'live',
    listing_mode: row.listing_mode || row.listingMode || 'public',
    public_notice: row.public_notice || row.publicNotice || '',
    security_location: row.security_location || row.securityLocation || '',
    type: isFound ? 'FOUND' : 'LOST',
    timeAgo: formatTimeAgo(row.created_at),
  };
}

async function fetchLiveLost(limit) {
  const q = supabase
    .from('lost_items')
    .select('*')
    .in('status', FEED_STATUSES)
    .order('created_at', { ascending: false });
  const { data, error } = limit ? await q.limit(limit) : await q.limit(100);
  if (!error) return (data || []).filter(isFeedVisible).map((i) => ({ ...normalizeItemRow(i), type: 'LOST' }));

  // Fallback without status filter
  const fb = supabase.from('lost_items').select('*').order('created_at', { ascending: false });
  const { data: rows } = limit ? await fb.limit(limit) : await fb.limit(100);
  return (rows || [])
    .filter(isFeedVisible)
    .map((i) => ({ ...normalizeItemRow(i), type: 'LOST' }));
}

async function fetchLiveFound(limit) {
  // Prefer public feed view (redacts secure fields) — same as mobile
  try {
    const q = supabase
      .from('found_items_public_feed')
      .select('*')
      .in('status', FEED_STATUSES)
      .order('created_at', { ascending: false });
    const { data, error } = limit ? await q.limit(limit) : await q.limit(100);
    if (!error) {
      return (data || [])
        .filter(isFeedVisible)
        .map((i) => ({ ...normalizeItemRow({ ...i, type: 'FOUND' }), type: 'FOUND' }));
    }
  } catch {
    /* fall through */
  }

  const q2 = supabase
    .from('found_items')
    .select('*')
    .in('status', FEED_STATUSES)
    .order('created_at', { ascending: false });
  const { data, error } = limit ? await q2.limit(limit) : await q2.limit(100);
  if (!error) {
    return (data || [])
      .filter(isFeedVisible)
      .map((i) => ({ ...normalizeItemRow({ ...i, type: 'FOUND' }), type: 'FOUND' }));
  }

  const fb = supabase.from('found_items').select('*').order('created_at', { ascending: false });
  const { data: rows } = limit ? await fb.limit(limit) : await fb.limit(100);
  return (rows || [])
    .filter(isFeedVisible)
    .map((i) => ({ ...normalizeItemRow({ ...i, type: 'FOUND' }), type: 'FOUND' }));
}

/**
 * Fetch recent feed items for the User Portal Dashboard (mobile parity)
 */
export async function fetchPortalRecentItems(limit = 10) {
  try {
    const [lost, found] = await Promise.all([fetchLiveLost(limit), fetchLiveFound(limit)]);
    return [...lost, ...found]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  } catch (err) {
    console.error('fetchPortalRecentItems error:', err);
    return [];
  }
}

/**
 * Fetch all items for the User Portal Browse page (mobile AllItems parity)
 */
export async function fetchPortalAllItems() {
  try {
    const [lost, found] = await Promise.all([fetchLiveLost(100), fetchLiveFound(100)]);
    return [...lost, ...found].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    console.error('fetchPortalAllItems error:', err);
    return [];
  }
}

/**
 * Fetch items reported by the current logged-in user
 */
export async function fetchPortalUserItems(userEmail) {
  if (!userEmail) return { lost: [], found: [] };
  const email = userEmail.toLowerCase().trim();

  try {
    const [lostRes, foundRes] = await Promise.all([
      supabase
        .from('lost_items')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false }),
      supabase
        .from('found_items')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false }),
    ]);

    return {
      lost: (lostRes.data || []).map((i) => ({ ...normalizeItemRow(i), type: 'LOST', listType: 'lost' })),
      found: (foundRes.data || []).map((i) => ({ ...normalizeItemRow(i), type: 'FOUND', listType: 'found' })),
    };
  } catch (err) {
    console.error('fetchPortalUserItems error:', err);
    return { lost: [], found: [] };
  }
}

/**
 * Withdraw reported item within 15-minute window
 */
export async function withdrawPortalReportedItem(itemId, listType, userEmail) {
  const table = listType === 'found' ? 'found_items' : 'lost_items';
  const email = userEmail?.toLowerCase()?.trim();

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', itemId)
    .eq('email', email);

  if (error) throw error;
  return true;
}

/**
 * Fetch ownership claims submitted by this user
 */
export async function fetchPortalUserClaims(userEmail) {
  if (!userEmail) return [];
  const email = userEmail.toLowerCase().trim();

  try {
    const { data: claims, error } = await supabase
      .from('item_claims')
      .select('*')
      .eq('claimer_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(
        'fetchPortalUserClaims:',
        error.message || error.code || 'query failed'
      );
      return [];
    }
    if (!claims || !claims.length) return [];

    const enriched = await Promise.all(
      claims.map(async (c) => {
        let itemType = String(c.item_type || '').toLowerCase();
        let itemId = c.item_id;
        if (!itemType || itemId == null) {
          if (c.found_item_id) {
            itemType = 'found';
            itemId = c.found_item_id;
          } else if (c.lost_item_id) {
            itemType = 'lost';
            itemId = c.lost_item_id;
          }
        }

        let targetItem = null;
        if (itemId != null && (itemType === 'lost' || itemType === 'found')) {
          const table = itemType === 'found' ? 'found_items' : 'lost_items';
          const { data: itemData } = await supabase
            .from(table)
            .select('*')
            .eq('id', itemId)
            .maybeSingle();
          if (itemData) {
            targetItem = normalizeItemRow({ ...itemData, type: itemType.toUpperCase() });
          }
        }

        return {
          ...c,
          email: c.claimer_email || c.email || email,
          item_type: itemType || c.item_type,
          item_id: itemId ?? c.item_id,
          targetItem,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.warn(
      'fetchPortalUserClaims error:',
      err?.message || err?.code || String(err)
    );
    return [];
  }
}

/**
 * Fetch in-app notifications for portal (with item photos like mobile)
 */
export async function fetchPortalNotifications(userEmail) {
  const email = userEmail?.trim()?.toLowerCase();
  try {
    const { data: notes, error } = await supabase
      .from('app_notifications')
      .select('id, type, title, body, item_type, item_id, item_name, category, created_at')
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) {
      console.warn('fetchPortalNotifications error:', error?.message || error);
      return [];
    }

    let readIds = new Set();
    if (email && notes?.length) {
      const ids = notes.map((n) => n.id);
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_email', email)
        .in('notification_id', ids);

      if (reads) {
        readIds = new Set(reads.map((r) => r.notification_id));
      }
    }

    const withRead = (notes || []).map((n) => ({
      ...n,
      isRead: readIds.has(n.id),
      timeAgo: formatTimeAgo(n.created_at),
    }));

    return enrichPortalNotificationsWithImages(withRead);
  } catch (err) {
    console.warn('fetchPortalNotifications error:', err?.message || String(err));
    return [];
  }
}

async function enrichPortalNotificationsWithImages(notes = []) {
  if (!notes.length) return notes;

  const lostIds = [
    ...new Set(
      notes
        .filter((n) => String(n.item_type || '').toLowerCase() === 'lost' && n.item_id != null)
        .map((n) => Number(n.item_id))
        .filter((id) => Number.isFinite(id))
    ),
  ];
  const foundIds = [
    ...new Set(
      notes
        .filter((n) => String(n.item_type || '').toLowerCase() === 'found' && n.item_id != null)
        .map((n) => Number(n.item_id))
        .filter((id) => Number.isFinite(id))
    ),
  ];

  const imageByKey = new Map();

  const loadTable = async (table, ids, type) => {
    if (!ids.length) return;
    const { data, error } = await supabase.from(table).select('*').in('id', ids);
    if (error) {
      console.warn(`portal notification images ${table}:`, error.message);
      return;
    }
    (data || []).forEach((row) => {
      const normalized = normalizeItemRow({ ...row, type: type.toUpperCase() });
      const listingMode = String(normalized.listing_mode || '').toLowerCase();
      if (listingMode === 'secure') {
        imageByKey.set(`${type}:${row.id}`, null);
        return;
      }
      imageByKey.set(`${type}:${row.id}`, normalized.imageURI || null);
    });
  };

  await Promise.all([
    loadTable('lost_items', lostIds, 'lost'),
    loadTable('found_items', foundIds, 'found'),
  ]);

  return notes.map((n) => {
    const type = String(n.item_type || '').toLowerCase();
    if (!n.item_id || (type !== 'lost' && type !== 'found')) {
      return { ...n, imageURI: null };
    }
    return {
      ...n,
      imageURI: imageByKey.get(`${type}:${Number(n.item_id)}`) || null,
    };
  });
}

export async function markPortalNotificationRead(notificationId, userEmail) {
  const email = userEmail?.trim()?.toLowerCase();
  if (!email || !notificationId) return;
  await supabase.from('notification_reads').upsert({
    notification_id: notificationId,
    user_email: email,
    read_at: new Date().toISOString(),
  });
}

export async function markAllPortalNotificationsRead(userEmail) {
  const email = userEmail?.trim()?.toLowerCase();
  if (!email) return;
  const list = await fetchPortalNotifications(email);
  const unread = list.filter((n) => !n.isRead);
  if (!unread.length) return;
  const rows = unread.map((n) => ({
    notification_id: n.id,
    user_email: email,
    read_at: new Date().toISOString(),
  }));
  await supabase.from('notification_reads').upsert(rows, {
    onConflict: 'notification_id,user_email',
  });
}

/**
 * Upload image to Supabase storage
 */
export async function uploadPortalItemImage(file) {
  if (!file) return null;
  const ext = file.name ? file.name.split('.').pop() : 'jpg';
  const fileName = `portal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `portal/${fileName}`;

  const { error } = await supabase.storage.from('item-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Image upload error:', error);
    throw new Error(error.message || 'Image upload failed');
  }

  const { data } = supabase.storage.from('item-images').getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Create a new lost item report (students → pending_review, like mobile)
 */
export async function createPortalLostItem(itemData) {
  const payload = {
    itemName: itemData.itemName.trim(),
    description: itemData.description.trim(),
    category: itemData.category,
    location: itemData.location.trim(),
    dateLost: itemData.dateLost || new Date().toISOString().split('T')[0],
    timeLost: itemData.timeLost || '',
    ownerName: itemData.ownerName || '',
    phnum: itemData.phnum || '',
    email: itemData.email.toLowerCase().trim(),
    imageURI: itemData.imageURI || null,
    is_approved: false,
    status: ITEM_STATUS.PENDING_REVIEW,
    approved_at: null,
  };

  const { data, error } = await supabase.from('lost_items').insert(payload).select().single();
  if (error) throw error;
  return normalizeItemRow(data);
}

/**
 * Change password
 */
export async function changeUserPassword({ email, studentId, currentPassword, newPassword }) {
  const response = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email?.trim()?.toLowerCase() || undefined,
      studentId: studentId?.trim() || undefined,
      currentPassword,
      newPassword,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Password change failed.');
  }
  return payload;
}

/**
 * Send OTP for account activation
 */
export async function sendPortalOtp({ studentId, email }) {
  const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: studentId?.trim()?.toUpperCase(),
      email: email?.trim()?.toLowerCase(),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to send OTP.');
  }
  return payload;
}

/**
 * Verify OTP
 */
export async function verifyPortalOtp({ studentId, email, otp }) {
  const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: studentId?.trim()?.toUpperCase(),
      email: email?.trim()?.toLowerCase(),
      otp: otp?.trim(),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Incorrect OTP code.');
  }
  return payload;
}

/**
 * Complete account activation
 */
export async function activatePortalAccount({ studentId, email, password, name, phone }) {
  const response = await fetch(`${BACKEND_URL}/api/activate-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: studentId?.trim(),
      email: email?.trim()?.toLowerCase(),
      password,
      name,
      phone,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Activation failed.');
  }
  return payload;
}
