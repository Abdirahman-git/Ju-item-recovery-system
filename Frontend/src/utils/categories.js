/** Public categories (students + shared pickers). Financial is admin-only. */
export const PUBLIC_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Accessories',
  'Documents',
  'Keys',
  'Bags',
  'Sports Equipment',
  'Glasses/Sunglasses',
  'Wallet/Purse',
  'ID/Cards',
  'Other',
];

/** Admin-only category — not shown to students when reporting. */
export const ADMIN_ONLY_CATEGORIES = ['Financial'];

/** Full system list for admins (public + Financial). */
export const SYSTEM_CATEGORIES = [...PUBLIC_CATEGORIES.slice(0, -1), 'Financial', 'Other'];

const CATEGORY_ICON_DEFS = {
  Electronics: { icon: 'laptop', type: 'MaterialCommunityIcons' },
  Clothing: { icon: 'tshirt', type: 'FontAwesome5' },
  Accessories: { icon: 'watch', type: 'MaterialCommunityIcons' },
  Documents: { icon: 'file-document-outline', type: 'MaterialCommunityIcons' },
  Keys: { icon: 'key', type: 'MaterialCommunityIcons' },
  Bags: { icon: 'bag-personal', type: 'MaterialCommunityIcons' },
  'Sports Equipment': { icon: 'basketball', type: 'MaterialCommunityIcons' },
  'Glasses/Sunglasses': { icon: 'glasses', type: 'MaterialCommunityIcons' },
  'Wallet/Purse': { icon: 'wallet-outline', type: 'MaterialCommunityIcons' },
  'ID/Cards': { icon: 'card-account-details-outline', type: 'MaterialCommunityIcons' },
  Financial: { icon: 'cash-multiple', type: 'MaterialCommunityIcons' },
  Other: { icon: 'dots-horizontal-circle-outline', type: 'MaterialCommunityIcons' },
};

const DEFAULT_ICON = { icon: 'tag-outline', type: 'MaterialCommunityIcons' };
/** Never offer these in pickers (Books, Jewelry, vague categories). */
const EXCLUDED_CATEGORIES = new Set(['books', 'personal', 'general', 'jewelry']);
const ADMIN_ONLY_SET = new Set(ADMIN_ONLY_CATEGORIES.map((c) => c.toLowerCase()));
/** Obvious junk labels that should never become categories. */
const BLOCKED_CATEGORY_LABELS = new Set([
  'cream',
  'test',
  'testing',
  'dummy',
  'asdf',
  'qwerty',
  'spam',
  'none',
  'null',
  'undefined',
  'n/a',
  'na',
  'xxx',
  'abc',
]);

export const CATEGORY_ICONS = Object.fromEntries(
  Object.entries(CATEGORY_ICON_DEFS).map(([name, def]) => [name, def.icon])
);

export function normalizeCategory(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Title-case category labels: "perfume" → "Perfume", "sports equipment" → "Sports Equipment". */
export function formatCategoryLabel(value) {
  const raw = normalizeCategory(value);
  if (!raw) return '';
  return raw
    .split(/(\s+|\/)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === '/') return part;
      return part.charAt(0).toLocaleUpperCase() + part.slice(1);
    })
    .join('');
}

export function isExcludedCategory(value) {
  return EXCLUDED_CATEGORIES.has(normalizeCategory(value).toLowerCase());
}

/**
 * Strip report/status prefixes like "Found - Electronics" → "Electronics".
 */
export function canonicalizeCategory(value) {
  const raw = normalizeCategory(value);
  if (!raw) return '';
  const prefixed = raw.match(/^(lost|found|returned|secure|draft|pending)\s*[-–—:/]\s*(.+)$/i);
  if (prefixed) return formatCategoryLabel(prefixed[2]);
  return formatCategoryLabel(raw);
}

export function isStatusPrefixedCategory(value) {
  return /^(lost|found|returned|secure|draft|pending)\s*[-–—:/]/i.test(normalizeCategory(value));
}

/**
 * Rejects numbers-only / symbols-only / spam / status-prefixed labels.
 */
export function isJunkCategoryName(value) {
  const category = normalizeCategory(value);
  if (!category) return true;
  if (isStatusPrefixedCategory(category)) return true;
  if (isExcludedCategory(category)) return true;
  if (BLOCKED_CATEGORY_LABELS.has(category.toLowerCase())) return true;
  if (category.length < 2 || category.length > 40) return true;

  const letters = category.match(/[\p{L}]/gu) || [];
  if (letters.length < 2) return true;

  const digits = category.match(/\d/g) || [];
  if (digits.length > 0 && digits.length >= letters.length) return true;

  const compact = category.replace(/\s+/g, '').toLowerCase();
  if (compact.length >= 3 && /^(.)\1+$/u.test(compact)) return true;
  if (compact.length >= 6 && /^(..)\1{2,}$/u.test(compact)) return true;

  return false;
}

export function validateCategoryName(value) {
  const category = formatCategoryLabel(value);
  if (!category) {
    return { valid: false, message: 'Select or enter a category.' };
  }
  if (isJunkCategoryName(category)) {
    return {
      valid: false,
      message: 'Category must be a real name with letters — not only numbers, status labels, or symbols.',
    };
  }
  return { valid: true, value: category };
}

export function categoriesMatch(rowCategory, filterCategory) {
  const filter = canonicalizeCategory(filterCategory);
  if (!filter || filter === 'all') return true;
  return canonicalizeCategory(rowCategory).toLowerCase() === filter.toLowerCase();
}

export function isAdminOnlyCategory(value) {
  return ADMIN_ONLY_SET.has(normalizeCategory(value).toLowerCase());
}

export function getBaseCategories(forAdmin = false) {
  return forAdmin ? SYSTEM_CATEGORIES : PUBLIC_CATEGORIES;
}

export function collectCategoriesFromItems(items = []) {
  const set = new Set();
  items.forEach((item) => {
    const category = canonicalizeCategory(item?.category);
    if (category && !isExcludedCategory(category) && !isJunkCategoryName(category)) set.add(category);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function mergeCategoryLists(...lists) {
  const set = new Set();
  lists.flat().forEach((value) => {
    const category = canonicalizeCategory(value);
    if (category && !isExcludedCategory(category) && !isJunkCategoryName(category)) set.add(category);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Full category list for pickers/filters.
 * @param {{ forAdmin?: boolean }} options
 * @param {...string[]} extraLists
 */
export function resolveSystemCategories(options = {}, ...extraLists) {
  const forAdmin = typeof options === 'boolean' ? options : Boolean(options?.forAdmin);
  const extras = typeof options === 'boolean' ? extraLists : [options?.extras, ...extraLists].filter(Boolean);
  const base = getBaseCategories(forAdmin);
  const merged = mergeCategoryLists(base, ...extras).filter(
    (name) => forAdmin || !isAdminOnlyCategory(name)
  );
  const baseSet = new Set(base);
  const ordered = base.filter((name) => merged.includes(name));
  const rest = merged.filter((name) => !baseSet.has(name));
  return [...ordered, ...rest];
}

export function toCategoryPickerEntries(names = [], { forAdmin = false } = {}) {
  const ordered = resolveSystemCategories({ forAdmin, extras: names });
  return ordered.map((name) => ({
    name,
    ...(CATEGORY_ICON_DEFS[name] || DEFAULT_ICON),
  }));
}

export function isHighValueCategory(category) {
  const value = normalizeCategory(category).toLowerCase();
  if (!value || isExcludedCategory(value)) return false;
  return /electronic|wallet|financial|card|phone|laptop|id\/cards|purse|jewelry/.test(value);
}
