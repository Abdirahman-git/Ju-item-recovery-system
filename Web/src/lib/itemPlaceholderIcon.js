/**
 * Smart placeholder icon from item name (+ category fallback).
 * Matches English + common Somali campus wording (e.g. saacad → Watch).
 */
import {
  Backpack,
  Banknote,
  BookOpen,
  Briefcase,
  Cable,
  Camera,
  FileText,
  Glasses,
  Headphones,
  IdCard,
  KeyRound,
  Laptop,
  Mouse,
  Package,
  Shirt,
  Smartphone,
  Tablet,
  Umbrella,
  Usb,
  Wallet,
  Watch,
} from 'lucide-react';

/** @type {{ icon: import('lucide-react').LucideIcon, keywords: string[] }[]} */
const NAME_RULES = [
  { icon: Watch, keywords: ['saacad', 'saa cad', 'watch', 'wristwatch', 'clock', 'smartwatch'] },
  {
    icon: Headphones,
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
  { icon: Smartphone, keywords: ['phone', 'mobile', 'iphone', 'android', 'samsung', 'telefoon', 'taleefoon', 'taleefan', 'smartphone', 'cellphone', 'cell phone'] },
  { icon: Laptop, keywords: ['laptop', 'macbook', 'notebook', 'chromebook', 'computer', 'pc'] },
  { icon: Tablet, keywords: ['tablet', 'ipad'] },
  { icon: Mouse, keywords: ['mouse', 'jiir'] },
  { icon: Cable, keywords: ['charger', 'charging', 'cable', 'wire', 'adapter', 'usb-c', 'lightning'] },
  { icon: Usb, keywords: ['flash', 'usb', 'pendrive', 'thumb drive', 'memory stick'] },
  { icon: Camera, keywords: ['camera', 'kamera', 'gopro'] },
  { icon: KeyRound, keywords: ['key', 'keys', 'furan', 'fure'] },
  { icon: Glasses, keywords: ['glasses', 'sunglasses', 'indho', 'indhaha', 'spectacles'] },
  { icon: Wallet, keywords: ['wallet', 'purse', 'kiish', 'jeeb'] },
  { icon: IdCard, keywords: ['id card', 'student id', 'idcard', 'badge', 'passport', 'kaadh'] },
  { icon: Briefcase, keywords: ['bag', 'handbag', 'briefcase', 'shanta', 'boorso'] },
  { icon: Backpack, keywords: ['backpack', 'rucksack', 'schoolbag'] },
  { icon: Shirt, keywords: ['shirt', 'jacket', 'hoodie', 'sweater', 'coat', 'clothing', 'clothes', 'shaati', 'jaakad'] },
  { icon: Umbrella, keywords: ['umbrella', 'dallad'] },
  { icon: BookOpen, keywords: ['book', 'notebook', 'buug'] },
  { icon: FileText, keywords: ['document', 'paper', 'papers', 'file', 'warqad'] },
  { icon: Banknote, keywords: ['money', 'cash', 'financial', 'lacag'] },
];

const CATEGORY_ICONS = {
  electronics: Laptop,
  clothing: Shirt,
  accessories: Watch,
  documents: FileText,
  keys: KeyRound,
  bags: Briefcase,
  'sports equipment': Package,
  'glasses/sunglasses': Glasses,
  'wallet/purse': Wallet,
  'id/cards': IdCard,
  financial: Banknote,
  other: Package,
};

function normalizeHaystack(name, category) {
  return `${String(name || '')} ${String(category || '')}`
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {import('lucide-react').LucideIcon} */
export function getItemPlaceholderIcon(name, category) {
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

  return Package;
}
