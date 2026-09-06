/**
 * Smart placeholder icon name for items without a photo.
 * Returns a MaterialCommunityIcons glyph based on item name (+ category).
 */
const NAME_RULES = [
  { icon: 'watch', keywords: ['saacad', 'saa cad', 'watch', 'wristwatch', 'clock', 'smartwatch'] },
  {
    icon: 'headphones',
    keywords: [
      'dhago',
      'dhagaxarig',
      'dhago xarig',
      'earphone',
      'earphones',
      'headphone',
      'headphones',
      'earbud',
      'earbuds',
      'airpod',
      'airpods',
      'headset',
    ],
  },
  {
    icon: 'cellphone',
    keywords: [
      'phone',
      'mobile',
      'iphone',
      'android',
      'samsung',
      'telefoon',
      'taleefoon',
      'taleefan',
      'smartphone',
      'cellphone',
      'cell phone',
    ],
  },
  { icon: 'laptop', keywords: ['laptop', 'macbook', 'notebook', 'chromebook', 'computer', 'pc'] },
  { icon: 'tablet', keywords: ['tablet', 'ipad'] },
  { icon: 'mouse', keywords: ['mouse', 'jiir'] },
  { icon: 'power-plug', keywords: ['charger', 'charging', 'cable', 'wire', 'adapter', 'usb-c', 'lightning'] },
  { icon: 'usb-flash-drive', keywords: ['flash', 'usb', 'pendrive', 'thumb drive', 'memory stick'] },
  { icon: 'camera', keywords: ['camera', 'kamera', 'gopro'] },
  { icon: 'key-variant', keywords: ['key', 'keys', 'furan', 'fure'] },
  { icon: 'sunglasses', keywords: ['glasses', 'sunglasses', 'indho', 'indhaha', 'spectacles'] },
  { icon: 'wallet', keywords: ['wallet', 'purse', 'kiish', 'jeeb'] },
  { icon: 'card-account-details', keywords: ['id card', 'student id', 'idcard', 'badge', 'passport', 'kaadh'] },
  { icon: 'briefcase', keywords: ['bag', 'handbag', 'briefcase', 'shanta', 'boorso'] },
  { icon: 'bag-personal', keywords: ['backpack', 'rucksack', 'schoolbag'] },
  { icon: 'tshirt-crew', keywords: ['shirt', 'jacket', 'hoodie', 'sweater', 'coat', 'clothing', 'clothes', 'shaati', 'jaakad'] },
  { icon: 'umbrella', keywords: ['umbrella', 'dallad'] },
  { icon: 'book-open-page-variant', keywords: ['book', 'notebook', 'buug'] },
  { icon: 'file-document', keywords: ['document', 'paper', 'papers', 'file', 'warqad'] },
  { icon: 'cash', keywords: ['money', 'cash', 'financial', 'lacag'] },
];

const CATEGORY_ICONS = {
  electronics: 'laptop',
  clothing: 'tshirt-crew',
  accessories: 'watch',
  documents: 'file-document',
  keys: 'key-variant',
  bags: 'briefcase',
  'sports equipment': 'dumbbell',
  'glasses/sunglasses': 'sunglasses',
  'wallet/purse': 'wallet',
  'id/cards': 'card-account-details',
  financial: 'cash',
  other: 'package-variant',
};

function normalizeHaystack(name, category) {
  return `${String(name || '')} ${String(category || '')}`
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {string} MaterialCommunityIcons icon name */
export function getItemPlaceholderMciIcon(name, category) {
  const hay = normalizeHaystack(name, category);
  if (hay) {
    for (const rule of NAME_RULES) {
      if (rule.keywords.some((keyword) => hay.includes(keyword))) {
        return rule.icon;
      }
    }
  }

  const catKey = String(category || '')
    .trim()
    .toLowerCase();
  if (catKey && CATEGORY_ICONS[catKey]) {
    return CATEGORY_ICONS[catKey];
  }

  return 'package-variant';
}
