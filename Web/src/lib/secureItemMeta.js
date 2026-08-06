const KEYWORD_RULES = [
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

export const SECURE_WEB_ICONS = {
  Electronics: 'Smartphone',
  Keys: 'KeyRound',
  Bags: 'Backpack',
  Documents: 'FileText',
  Accessories: 'Watch',
  Other: 'Shield',
};

export function getSecureWebIconName(category) {
  return SECURE_WEB_ICONS[category] || SECURE_WEB_ICONS.Other;
}
