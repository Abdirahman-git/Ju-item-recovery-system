'use client';

import {
  Banknote,
  Briefcase,
  Dumbbell,
  FileText,
  Gem,
  Glasses,
  IdCard,
  KeyRound,
  Laptop,
  MoreHorizontal,
  Shirt,
  Tag,
  Wallet,
  Watch,
} from 'lucide-react';
import { CATEGORY_ICON_NAMES, resolveSystemCategories } from '@/lib/categories';

const LUCIDE_BY_NAME = {
  Laptop,
  Shirt,
  Watch,
  FileText,
  KeyRound,
  Briefcase,
  Dumbbell,
  Glasses,
  Wallet,
  Gem,
  IdCard,
  Banknote,
  MoreHorizontal,
  Tag,
};

/** Resolve Lucide component for a category (same mapping idea as mobile pills). */
export function getCategoryIcon(category) {
  const iconName = CATEGORY_ICON_NAMES[category] || 'Tag';
  return LUCIDE_BY_NAME[iconName] || Tag;
}

/**
 * Options for ReportSelect with icons — matches student CategoryPills feel.
 * @param {{ forAdmin?: boolean, extras?: string[] }} options
 */
export function getCategorySelectOptions({ forAdmin = true, extras = [] } = {}) {
  const names = resolveSystemCategories({ forAdmin, extras });
  return names.map((name) => ({
    value: name,
    label: name,
    icon: getCategoryIcon(name),
  }));
}

/** Default admin category options (includes Financial + icons). */
export const ADMIN_CATEGORY_OPTIONS = getCategorySelectOptions({ forAdmin: true });
