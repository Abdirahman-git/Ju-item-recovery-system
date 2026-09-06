const ITEM_IMAGES_BUCKET = 'item-images';

/** Canonical hold / visit office label (replaces legacy "Campus Security Office"). */
export const STUDENT_AFFAIRS_OFFICE = 'Student Affairs office';

export function normalizeOfficeLocation(value, fallback = STUDENT_AFFAIRS_OFFICE) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (/^campus\s+security\s+office$/i.test(raw)) return STUDENT_AFFAIRS_OFFICE;
  return raw;
}

function resolveSupabaseHost() {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).host;
    } catch {
      /* fall through */
    }
  }
  return 'rzlmlegawumzijcrdijq.supabase.co';
}

const SUPABASE_HOST = resolveSupabaseHost();

function isRemoteImageUri(uri) {
  return typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'));
}

function readRawImageField(item) {
  if (!item) return null;
  const candidates = [
    item.imageUrl,
    item.imageURI,
    item.imageuri,
    item.image_url,
    item.imageUri,
    item.ImageURI,
    item.photo,
    item.photo_url,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Turn storage paths / public URLs into a browser-loadable https URL. */
export function normalizeImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  // Already absolute http(s)
  if (isRemoteImageUri(value)) {
    // Fix accidental double-encoding or file:// leftovers
    if (value.startsWith('file:') || value.includes('file:///')) return null;
    return value;
  }

  // Reject local device paths from mobile
  if (
    value.startsWith('file:') ||
    value.startsWith('content:') ||
    value.startsWith('ph://') ||
    value.startsWith('assets-library:') ||
    value.startsWith('/')
  ) {
    return null;
  }

  // Bare storage object path → public URL
  const path = value.replace(/^\/+/, '').replace(/^item-images\//, '');
  if (!path || path.includes(' ')) return null;

  return `https://${SUPABASE_HOST}/storage/v1/object/public/${ITEM_IMAGES_BUCKET}/${path}`;
}

export function resolveItemImageUrl(item) {
  return normalizeImageUrl(readRawImageField(item));
}

export function mapRecentActivityItem(item, itemType) {
  const prefix = itemType === 'found' ? 'FOUND' : 'LOST';
  const reportedAt =
    item.approved_at ||
    item.created_at ||
    item.date_reported ||
    item.dateLost ||
    item.dateFound ||
    item.date_lost ||
    item.date_found ||
    item.reported_at ||
    null;
  const sortKey = reportedAt ? new Date(reportedAt).getTime() || item.id : item.id;

  return {
    ...item,
    itemType,
    displayName: item.itemName || item.item_name || 'Unnamed item',
    displayCategory: item.category || 'General',
    displayStatus: null, // filled by caller
    refId: `#${prefix}-${String(item.id).padStart(4, '0')}`,
    reportedAt,
    sortKey,
    imageUrl: resolveItemImageUrl(item),
  };
}

export function mapInventoryItem(item, itemType) {
  const base = mapRecentActivityItem(item, itemType);
  const isSecure = item?.listing_mode === 'secure' || item?.listingMode === 'secure';
  const description = isSecure
    ? item.public_notice || item.publicNotice || item.description || 'Secure campus hold notice.'
    : item.description ||
      item.notes ||
      item.details ||
      (itemType === 'found'
        ? 'Recovered on campus and logged in the university vault.'
        : 'Reported missing within the campus ecosystem.');

  return {
    ...base,
    inventoryRef: `#INV-${String(item.id).padStart(4, '0')}`,
    listing_mode: item.listing_mode || item.listingMode || null,
    listingMode: item.listing_mode || item.listingMode || null,
    public_notice: item.public_notice || item.publicNotice || null,
    publicNotice: item.public_notice || item.publicNotice || null,
    public_category: item.public_category || item.publicCategory || null,
    publicCategory: item.public_category || item.publicCategory || null,
    security_location: normalizeOfficeLocation(
      item.security_location || item.securityLocation || null,
      null
    ),
    displayLocation: isSecure
      ? normalizeOfficeLocation(
          item.security_location || item.securityLocation || item.location,
          STUDENT_AFFAIRS_OFFICE
        )
      : normalizeOfficeLocation(item.location || item.place, 'Campus grounds'),
    displayDescription: description,
    // Keep camelCase dates from mapRecentActivityItem — do not drop dateLost/dateFound
    reportedAt:
      base.reportedAt ||
      item.created_at ||
      item.date_reported ||
      item.dateLost ||
      item.dateFound ||
      item.date_lost ||
      item.date_found ||
      item.reported_at ||
      null,
  };
}
