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

/** Never offer these in pickers (Books + removed vague categories). */
const EXCLUDED_CATEGORIES = new Set(['books', 'personal', 'general']);
const ADMIN_ONLY_SET = new Set(ADMIN_ONLY_CATEGORIES.map((c) => c.toLowerCase()));

/** Lucide icon names mapped like mobile CategoryPills. */
export const CATEGORY_ICON_NAMES = {
  Electronics: 'Laptop',
  Clothing: 'Shirt',
  Accessories: 'Watch',
  Documents: 'FileText',
  Keys: 'KeyRound',
  Bags: 'Briefcase',
  'Sports Equipment': 'Dumbbell',
  'Glasses/Sunglasses': 'Glasses',
  'Wallet/Purse': 'Wallet',
  'ID/Cards': 'IdCard',
  Financial: 'Banknote',
  Other: 'MoreHorizontal',
};

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

export function collectCategoriesFromItems(items = [], field = 'displayCategory') {
  const set = new Set();
  const list = Array.isArray(items) ? items : [];
  list.forEach((item) => {
    const category = normalizeCategory(item?.[field] ?? item?.category);
    if (category && !isExcludedCategory(category)) set.add(category);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function mergeCategoryLists(...lists) {
  const set = new Set();
  lists
    .flat()
    .filter((value) => value != null)
    .forEach((value) => {
      const category = normalizeCategory(value);
      if (category && !isExcludedCategory(category)) set.add(category);
    });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Full category list for pickers/filters.
 * @param {{ forAdmin?: boolean, extras?: string[] } | boolean} options
 */
export function resolveSystemCategories(options = {}, ...extraLists) {
  const forAdmin = typeof options === 'boolean' ? options : Boolean(options?.forAdmin);
  const extras =
    typeof options === 'boolean'
      ? extraLists
      : [options?.extras, ...extraLists].filter(Boolean);
  const base = getBaseCategories(forAdmin);
  const merged = mergeCategoryLists(base, ...extras).filter(
    (name) => forAdmin || !isAdminOnlyCategory(name)
  );
  const baseSet = new Set(base);
  const ordered = base.filter((name) => merged.includes(name));
  const rest = merged.filter((name) => !baseSet.has(name));
  return [...ordered, ...rest];
}

export function categoriesForFilter(items = [], field = 'displayCategory', { forAdmin = true } = {}) {
  return resolveSystemCategories({
    forAdmin,
    extras: collectCategoriesFromItems(items, field),
  });
}

export function isHighValueCategory(category) {
  const value = normalizeCategory(category).toLowerCase();
  if (!value || isExcludedCategory(value)) return false;
  return /electronic|wallet|financial|card|phone|laptop|id\/cards|purse/.test(value);
}
