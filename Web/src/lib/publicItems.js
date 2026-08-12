import { supabase } from '@/lib/supabase';
import { mapInventoryItem } from '@/lib/itemImage';
import { ITEM_STATUS, isSecureListing, normalizeItemStatus } from '@/lib/itemStatus';

const LOST_COLUMNS_WITH_APPROVED_AT = [
  'id',
  'itemName',
  'category',
  'description',
  'location',
  'dateLost',
  'created_at',
  'approved_at',
  'status',
  'is_approved',
  'imageURI',
].join(',');

const FOUND_COLUMNS_WITH_APPROVED_AT = [
  'id',
  'itemName',
  'category',
  'description',
  'location',
  'dateFound',
  'created_at',
  'approved_at',
  'status',
  'is_approved',
  'imageURI',
  'listing_mode',
  'public_notice',
  'public_category',
  'security_location',
].join(',');

const LOST_COLUMNS_NO_APPROVED_AT = [
  'id',
  'itemName',
  'category',
  'description',
  'location',
  'dateLost',
  'created_at',
  'status',
  'is_approved',
  'imageURI',
].join(',');

const FOUND_COLUMNS_NO_APPROVED_AT = [
  'id',
  'itemName',
  'category',
  'description',
  'location',
  'dateFound',
  'created_at',
  'status',
  'is_approved',
  'imageURI',
  'listing_mode',
  'public_notice',
  'public_category',
  'security_location',
].join(',');

// Fast in-memory cache to prevent database pounding under high traffic
let publicItemsCache = {
  data: null,
  limit: 0,
  timestamp: 0,
};
const CACHE_TTL_MS = 15000; // 15 seconds
// Supabase public feed can be slower on first cold start / network variability.
// Prevent empty landing-page preview from timing out too aggressively.
const PUBLIC_FETCH_TIMEOUT_MS = 15000;

async function withTimeout(promise, label = 'Public feed') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${PUBLIC_FETCH_TIMEOUT_MS}ms`)),
          PUBLIC_FETCH_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function errorText(error) {
  if (typeof error?.message === 'string') return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
}

function mapPublicFeedRows(lostData = [], foundData = []) {
  const mappedLost = lostData.map((item) => mapInventoryItem(item, 'lost'));
  const mappedFound = foundData.map((item) => mapInventoryItem(item, 'found'));
  return [...mappedLost, ...mappedFound].sort((a, b) => b.sortKey - a.sortKey);
}

async function queryPublicFeed({ lostColumns, foundColumns, limit }) {
  const [lostRes, foundRes] = await withTimeout(
    Promise.all([
      supabase
        .from('lost_items')
        .select(lostColumns)
        .or('status.in.(live,matched,claim_pending),is_approved.eq.true')
        .order('id', { ascending: false })
        .limit(limit),
      supabase
        .from('found_items')
        .select(foundColumns)
        .or('status.in.(live,matched,claim_pending),is_approved.eq.true')
        .order('id', { ascending: false })
        .limit(limit),
    ]),
    'Public feed query'
  );

  if (lostRes.error) throw lostRes.error;
  if (foundRes.error) throw foundRes.error;

  return mapPublicFeedRows(lostRes.data || [], foundRes.data || []);
}

/**
 * Public feed: LIVE lost/found + secure holds (mobile parity).
 * Secure cards never expose photos or private contact fields.
 */
export async function fetchPublicLiveItems({ limit = 48 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 48, 6), 100);
  const now = Date.now();
  if (
    publicItemsCache.data &&
    publicItemsCache.limit >= safeLimit &&
    now - publicItemsCache.timestamp < CACHE_TTL_MS
  ) {
    return publicItemsCache.data.slice(0, safeLimit * 2);
  }

  try {
    const combined = await queryPublicFeed({
      lostColumns: LOST_COLUMNS_WITH_APPROVED_AT,
      foundColumns: FOUND_COLUMNS_WITH_APPROVED_AT,
      limit: safeLimit,
    });

    publicItemsCache = {
      data: combined,
      limit: safeLimit,
      timestamp: now,
    };

    return combined;
  } catch (error) {
    const errText = errorText(error);
    const timedOut = /timed out/i.test(errText);
    const missingApprovedAt = errText.toLowerCase().includes('approved_at');
    const missingSecureCol =
      /public_notice|public_category|security_location|listing_mode/i.test(errText);

    if (!timedOut && (missingApprovedAt || missingSecureCol)) {
      try {
        const lostColumns = missingApprovedAt
          ? LOST_COLUMNS_NO_APPROVED_AT
          : LOST_COLUMNS_WITH_APPROVED_AT;
        let foundColumns = missingApprovedAt
          ? FOUND_COLUMNS_NO_APPROVED_AT
          : FOUND_COLUMNS_WITH_APPROVED_AT;
        if (missingSecureCol) {
          foundColumns = foundColumns
            .replace(',public_notice,public_category,security_location', '')
            .replace(',listing_mode,public_notice,public_category,security_location', ',listing_mode');
        }

        const combined = await queryPublicFeed({
          lostColumns,
          foundColumns,
          limit: safeLimit,
        });
        publicItemsCache = {
          data: combined,
          limit: safeLimit,
          timestamp: now,
        };
        return combined;
      } catch (fallbackErr) {
        console.error('Error in fetchPublicLiveItems (fallback retry):', fallbackErr);
      }
    }

    console.error('Error in fetchPublicLiveItems:', error);
    return publicItemsCache.data || [];
  }
}

function isPublicLiveRow(data) {
  if (!data) return false;
  const normalized = String(normalizeItemStatus(data) || '').trim().toLowerCase();
  if (normalized === ITEM_STATUS.LIVE || normalized === 'matched' || normalized === 'claim_pending') {
    return true;
  }
  return data.is_approved === true;
}

async function selectPublicItemById(table, columns, id) {
  const { data, error } = await supabase.from(table).select(columns).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Single-item lookup for the public detail page.
 * Uses the same visibility rules as the public feed (including secure holds).
 */
export async function fetchPublicLiveItemById(itemType, id) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const numericId = Number(id);
  if (!numericId) return null;

  try {
    const feed = await fetchPublicLiveItems();
    const fromFeed = (feed || []).find(
      (row) => row.itemType === type && Number(row.id) === numericId
    );
    if (fromFeed) return fromFeed;
  } catch {
    /* fall through to direct query */
  }

  const table = type === 'found' ? 'found_items' : 'lost_items';
  const withApproved =
    type === 'found' ? FOUND_COLUMNS_WITH_APPROVED_AT : LOST_COLUMNS_WITH_APPROVED_AT;
  const withoutApproved =
    type === 'found' ? FOUND_COLUMNS_NO_APPROVED_AT : LOST_COLUMNS_NO_APPROVED_AT;

  try {
    let data;
    try {
      data = await selectPublicItemById(table, withApproved, numericId);
    } catch (error) {
      const errText = String(error?.message || JSON.stringify(error) || '').toLowerCase();
      if (!errText.includes('approved_at') && !/public_notice|security_location|listing_mode/i.test(errText)) {
        throw error;
      }
      data = await selectPublicItemById(table, withoutApproved, numericId);
    }

    if (!data) return null;
    if (!isPublicLiveRow(data)) return null;

    return mapInventoryItem(data, type);
  } catch (error) {
    console.error(`Error in fetchPublicLiveItemById (${type}, ${numericId}):`, error);
    return null;
  }
}

export function toPublicItemCard(item) {
  if (!item) return null;
  const isSecure = item.itemType === 'found' && isSecureListing(item);
  const notice = String(item.public_notice || item.publicNotice || item.displayDescription || '').trim();
  const title = item.displayName || item.itemName || item.item_name || (isSecure ? 'Secure item' : 'Unnamed item');
  const showNotice = isSecure && notice && notice.toLowerCase() !== String(title).toLowerCase();

  return {
    id: item.id,
    itemType: item.itemType === 'found' ? 'found' : 'lost',
    slug: `${item.itemType === 'found' ? 'found' : 'lost'}-${item.id}`,
    title,
    category:
      (isSecure ? item.public_category || item.publicCategory : null) ||
      item.displayCategory ||
      item.category ||
      'Other',
    location: item.displayLocation || item.location || (isSecure ? 'Campus Security Office' : 'Campus grounds'),
    description: isSecure
      ? showNotice
        ? notice
        : 'Held securely at campus security. Contact the Lost & Found desk via the JU LOFO app.'
      : item.displayDescription || item.description || '',
    // Mobile parity: never show secure hold photos on the public board
    imageUrl: isSecure ? null : item.imageUrl || null,
    reportedAt: item.reportedAt || null,
    refId: item.refId || null,
    isSecure,
  };
}

export function parsePublicItemSlug(slug) {
  const match = String(slug || '').trim().match(/^(lost|found)-(\d+)$/i);
  if (!match) return null;
  return { itemType: match[1].toLowerCase(), id: Number(match[2]) };
}

export function formatPublicDate(value) {
  if (!value) return 'Recently';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'Recently';
  }
}
