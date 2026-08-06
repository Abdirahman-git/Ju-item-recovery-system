const KEYWORD_RULES = [
  { category: 'Jewelry', pattern: /dahab|gold|jewel|jewelry|ring|necklace|silver|qaali|chain/i },
  { category: 'Electronics', pattern: /phone|taleefan|mobile|iphone|samsung|laptop|computer|ipad|macbook|tablet|electronic/i },
  { category: 'Keys', pattern: /\bkey\b|fur/i },
  { category: 'Bags', pattern: /bag|backpack|wallet|purse|boors/i },
  { category: 'Documents', pattern: /document|passport|id card|shahaado|certificate/i },
  { category: 'Accessories', pattern: /watch|glasses|sunglass|accessory/i },
];

export function inferSecureItemCategory(name = '', description = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return 'Other';
  const match = KEYWORD_RULES.find((rule) => rule.pattern.test(text));
  return match?.category || 'Other';
}

export const SECURE_CATEGORY_ICONS = {
  Jewelry: 'diamond-stone',
  Electronics: 'cellphone',
  Keys: 'key',
  Bags: 'bag-personal',
  Documents: 'file-document-outline',
  Accessories: 'watch',
  Other: 'shield-lock-outline',
};

export function getSecureCategoryIcon(category) {
  return SECURE_CATEGORY_ICONS[category] || SECURE_CATEGORY_ICONS.Other;
}
