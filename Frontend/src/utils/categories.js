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
  'Jewelry',
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
  Jewelry: { icon: 'diamond-stone', type: 'MaterialCommunityIcons' },
  'ID/Cards': { icon: 'card-account-details-outline', type: 'MaterialCommunityIcons' },
  Financial: { icon: 'cash-multiple', type: 'MaterialCommunityIcons' },
  Other: { icon: 'dots-horizontal-circle-outline', type: 'MaterialCommunityIcons' },
};

const DEFAULT_ICON = { icon: 'tag-outline', type: 'MaterialCommunityIcons' };
/** Never offer these in pickers (Books + removed vague categories). */
const EXCLUDED_CATEGORIES = new Set(['books', 'personal', 'general']);
const ADMIN_ONLY_SET = new Set(ADMIN_ONLY_CATEGORIES.map((c) => c.toLowerCase()));

export const CATEGORY_ICONS = Object.fromEntries(
  Object.entries(CATEGORY_ICON_DEFS).map(([name, def]) => [name, def.icon])
);

export function normalizeCategory(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isExcludedCategory(value) {
  return EXCLUDED_CATEGORIES.has(normalizeCategory(value).toLowerCase());
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
    const category = normalizeCategory(item?.category);
    if (category && !isExcludedCategory(category)) set.add(category);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function mergeCategoryLists(...lists) {
  const set = new Set();
  lists.flat().forEach((value) => {
    const category = normalizeCategory(value);
    if (category && !isExcludedCategory(category)) set.add(category);
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
