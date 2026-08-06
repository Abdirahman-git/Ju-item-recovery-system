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
  'imageURI'
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
  'listing_mode'
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
  'imageURI'
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
  'listing_mode'
].join(',');

// Fast in-memory cache to prevent database pounding under high traffic
let publicItemsCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 15000; // 15 seconds

/** 
 * Public feed: LIVE only, no secure holds, no contact fields exposed downstream.
 * Fetches only required columns and implements database-level filters & limits.
 */
export async function fetchPublicLiveItems() {
  const now = Date.now();
  if (publicItemsCache.data && now - publicItemsCache.timestamp < CACHE_TTL_MS) {
    return publicItemsCache.data;
  }

  try {
    const fetchWithColumns = async ({ lostColumns, foundColumns }) => {
      const [lostRes, foundRes] = await Promise.all([
        supabase
          .from('lost_items')
          .select(lostColumns)
          .or('status.in.(live,matched,claim_pending),is_approved.eq.true')
          .order('id', { ascending: false })
          .limit(100),
        supabase
          .from('found_items')
          .select(foundColumns)
          .or('status.in.(live,matched,claim_pending),is_approved.eq.true')
          .order('id', { ascending: false })
          .limit(100),
      ]);

      if (lostRes.error) throw lostRes.error;
      if (foundRes.error) throw foundRes.error;

      const lostData = lostRes.data || [];
      const foundData = foundRes.data || [];

      // Filter out secure listings in JS
      const filteredFound = foundData.filter((item) => {
        const mode = item.listing_mode || item.listingMode;
        return mode !== 'secure';
      });

      // Map using standard mapper to maintain schema consistency
      const mappedLost = lostData.map((item) => mapInventoryItem(item, 'lost'));
      const mappedFound = filteredFound.map((item) => mapInventoryItem(item, 'found'));

      return [...mappedLost, ...mappedFound].sort((a, b) => b.sortKey - a.sortKey);
    };

    // Fetch only needed columns & only active approved items (limited to latest 100 per table for extreme performance)
    const combined = await fetchWithColumns({
      lostColumns: LOST_COLUMNS_WITH_APPROVED_AT,
      foundColumns: FOUND_COLUMNS_WITH_APPROVED_AT,
    });

    publicItemsCache = {
      data: combined,
      timestamp: now,
    };

    return combined;
  } catch (error) {
    const errText =
      typeof error?.message === 'string'
        ? error.message
        : (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return '';
            }
          })();

    const missingApprovedAt = errText.toLowerCase().includes('approved_at');

    if (missingApprovedAt) {
      // Column not present yet (migration not run in this environment).
      // Retry without `approved_at` so landing doesn't go blank.
      try {
        const combined = await (async () => {
          const [lostRes, foundRes] = await Promise.all([
            supabase
              .from('lost_items')
              .select(LOST_COLUMNS_NO_APPROVED_AT)
              .or('status.in.(live,matched,claim_pending),is_approved.eq.true')
              .order('id', { ascending: false })
              .limit(100),
            supabase
              .from('found_items')
              .select(FOUND_COLUMNS_NO_APPROVED_AT)
              .or('status.in.(live,matched,claim_pending),is_approved.eq.true')
              .order('id', { ascending: false })
              .limit(100),
          ]);

          if (lostRes.error) throw lostRes.error;
          if (foundRes.error) throw foundRes.error;

          const lostData = lostRes.data || [];
          const foundData = foundRes.data || [];

          const filteredFound = foundData.filter((item) => {
            const mode = item.listing_mode || item.listingMode;
            return mode !== 'secure';
          });

          const mappedLost = lostData.map((item) => mapInventoryItem(item, 'lost'));
          const mappedFound = filteredFound.map((item) => mapInventoryItem(item, 'found'));

          return [...mappedLost, ...mappedFound].sort((a, b) => b.sortKey - a.sortKey);
        })();

        publicItemsCache = {
          data: combined,
          timestamp: now,
        };

        return combined;
      } catch (fallbackErr) {
        console.error('Error in fetchPublicLiveItems (fallback retry):', fallbackErr);
      }
    }

    console.error('Error in fetchPublicLiveItems:', error);
    return publicItemsCache.data || []; // Return stale cached data on failure if available
  }
}

/**
 * Highly optimized single-item lookup for the public detail page.
 * Uses index lookup to retrieve a single item instantly.
 */
export async function fetchPublicLiveItemById(itemType, id) {
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const columns =
    itemType === 'found' ? FOUND_COLUMNS_WITH_APPROVED_AT : LOST_COLUMNS_WITH_APPROVED_AT;
  try {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    // Direct status check before showing publicly
    const normalized = normalizeItemStatus(data);
    const isLive = normalized === ITEM_STATUS.LIVE || data.is_approved === true;
    if (!isLive) return null;

    // Secure listings cannot be shown on the public browse detail pages
    if (itemType === 'found' && isSecureListing(data)) return null;

    return mapInventoryItem(data, itemType);
  } catch (error) {
    console.error(`Error in fetchPublicLiveItemById (${itemType}, ${id}):`, error);
    return null;
  }
}

export function toPublicItemCard(item) {
  if (!item) return null;
  return {
    id: item.id,
    itemType: item.itemType === 'found' ? 'found' : 'lost',
    slug: `${item.itemType === 'found' ? 'found' : 'lost'}-${item.id}`,
    title: item.displayName || item.itemName || item.item_name || 'Unnamed item',
    category: item.displayCategory || item.category || 'Other',
    location: item.displayLocation || item.location || 'Campus grounds',
    description: item.displayDescription || item.description || '',
    imageUrl: item.imageUrl || null,
    reportedAt: item.reportedAt || null,
    refId: item.refId || null,
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
