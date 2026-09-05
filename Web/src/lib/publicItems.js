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

let publicItemsCache = {
  data: null,
  limit: 0,
  timestamp: 0,
};
let inflightRequest = null;
let inflightLimit = 0;

const CACHE_TTL_MS = 5_000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const PREVIEW_FETCH_TIMEOUT_MS = 6_000;

async function withTimeout(promise, label = 'Public feed', timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function isAbortOrTimeout(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  return (
    name === 'AbortError' ||
    /aborted|abort|timed out|timeout/i.test(message)
  );
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
  const mappedLost = lostData.filter(isPublicLiveRow).map((item) => mapInventoryItem(item, 'lost'));
  const mappedFound = foundData.filter(isPublicLiveRow).map((item) => mapInventoryItem(item, 'found'));
  return [...mappedLost, ...mappedFound].sort((a, b) => b.sortKey - a.sortKey);
}

function liveFeedQuery(table, columns, limit, signal) {
  let query = supabase
    .from(table)
    .select(columns)
    // Only true LIVE rows — claim_pending / awaiting_pickup must leave the public board
    .eq('status', 'live')
    .order('id', { ascending: false })
    .limit(limit);
  if (signal && typeof query.abortSignal === 'function') {
    query = query.abortSignal(signal);
  }
  return query;
}

async function queryPublicTable(table, columns, limit, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await liveFeedQuery(table, columns, limit, controller.signal);
    if (result.error) throw result.error;
    return result.data || [];
  } catch (error) {
    if (isAbortOrTimeout(error) || controller.signal.aborted) {
      throw new Error(`${table} feed timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function queryPublicFeed({ lostColumns, foundColumns, limit, timeoutMs }) {
  const perTableLimit = Math.min(Math.max(Number(limit) || 6, 1), 100);
  const [lostSettled, foundSettled] = await Promise.allSettled([
    queryPublicTable('lost_items', lostColumns, perTableLimit, timeoutMs),
    queryPublicTable('found_items', foundColumns, perTableLimit, timeoutMs),
  ]);

  const lostData = lostSettled.status === 'fulfilled' ? lostSettled.value : [];
  const foundData = foundSettled.status === 'fulfilled' ? foundSettled.value : [];

  if (lostSettled.status === 'rejected') {
    const reason = lostSettled.reason?.message || lostSettled.reason;
    if (isAbortOrTimeout(lostSettled.reason)) {
      console.warn('Public lost_items feed timed out');
    } else {
      console.warn('Public lost_items feed failed:', reason);
    }
  }
  if (foundSettled.status === 'rejected') {
    const reason = foundSettled.reason?.message || foundSettled.reason;
    if (isAbortOrTimeout(foundSettled.reason)) {
      console.warn('Public found_items feed timed out');
    } else {
      console.warn('Public found_items feed failed:', reason);
    }
  }

  // Soft-fail: never block the page when Supabase is slow/unreachable
  if (!lostData.length && !foundData.length) {
    return [];
  }

  return mapPublicFeedRows(lostData, foundData);
}

function resolveTimeoutMs(limit) {
  return limit <= 8 ? PREVIEW_FETCH_TIMEOUT_MS : DEFAULT_FETCH_TIMEOUT_MS;
}

function readCachedFeed(safeLimit) {
  const now = Date.now();
  if (
    publicItemsCache.data &&
    publicItemsCache.limit >= safeLimit &&
    now - publicItemsCache.timestamp < CACHE_TTL_MS
  ) {
    return publicItemsCache.data
      .filter((row) => {
        const s = String(row?.status || '').trim().toLowerCase();
        return s !== 'claim_pending' && s !== 'awaiting_pickup' && s !== 'matched';
      })
      .slice(0, safeLimit * 2);
  }
  return null;
}

/** Clear in-memory public feed (e.g. after claim lock). */
export function invalidatePublicItemsCache() {
  publicItemsCache = { data: null, limit: 0, timestamp: 0 };
}

function writeCachedFeed(combined, safeLimit) {
  publicItemsCache = {
    data: combined,
    limit: safeLimit,
    timestamp: Date.now(),
  };
  return combined;
}

async function fetchPublicLiveItemsInternal({ limit = 48, timeoutMs, skipCache = false } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 48, 1), 100);
  const effectiveTimeout = timeoutMs || resolveTimeoutMs(safeLimit);
  if (!skipCache) {
    const cached = readCachedFeed(safeLimit);
    if (cached) return cached;
  }

  try {
    const combined = await queryPublicFeed({
      lostColumns: LOST_COLUMNS_WITH_APPROVED_AT,
      foundColumns: FOUND_COLUMNS_WITH_APPROVED_AT,
      limit: safeLimit,
      timeoutMs: effectiveTimeout,
    });
    return writeCachedFeed(combined, safeLimit);
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
          timeoutMs: effectiveTimeout,
        });
        return writeCachedFeed(combined, safeLimit);
      } catch (fallbackErr) {
        console.error('Error in fetchPublicLiveItems (fallback retry):', fallbackErr);
      }
    }

    if (publicItemsCache.data?.length) {
      console.warn('Public feed refresh failed; serving cached items.', error?.message || error);
      return publicItemsCache.data.slice(0, safeLimit * 2);
    }

    if (isAbortOrTimeout(error)) {
      console.warn('Public feed unavailable (timeout); showing empty list.');
    } else {
      console.error('Error in fetchPublicLiveItems:', error);
    }
    return [];
  }
}

/**
 * Public feed: LIVE lost/found + secure holds (mobile parity).
 * Secure cards never expose photos or private contact fields.
 */
export async function fetchPublicLiveItems(options = {}) {
  const safeLimit = Math.min(Math.max(Number(options.limit) || 48, 1), 100);
  if (!options.skipCache) {
    const cached = readCachedFeed(safeLimit);
    if (cached) return cached;
  }

  if (inflightRequest && inflightLimit >= safeLimit && !options.skipCache) {
    return inflightRequest;
  }

  inflightLimit = safeLimit;
  inflightRequest = fetchPublicLiveItemsInternal(options).finally(() => {
    inflightRequest = null;
    inflightLimit = 0;
  });

  return inflightRequest;
}

function isPublicLiveRow(data) {
  if (!data) return false;
  const raw = String(data.status || '').trim().toLowerCase();
  // Hidden while an ownership claim is in progress
  if (raw === 'claim_pending' || raw === 'awaiting_pickup' || raw === 'matched') return false;
  const normalized = String(normalizeItemStatus(data) || '').trim().toLowerCase();
  if (normalized === ITEM_STATUS.LIVE) return true;
  return data.is_approved === true && !raw;
}

async function selectPublicItemById(table, columns, id) {
  const { data, error } = await withTimeout(
    supabase.from(table).select(columns).eq('id', id).maybeSingle(),
    `${table} item ${id}`,
    PREVIEW_FETCH_TIMEOUT_MS
  );
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

  const cachedFeed = readCachedFeed(100);
  const fromCache = (cachedFeed || []).find(
    (row) => row.itemType === type && Number(row.id) === numericId
  );
  if (fromCache) return fromCache;

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
