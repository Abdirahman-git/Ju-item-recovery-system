import { useEffect, useMemo, useState } from 'react';
import {
  fetchPickerCategories,
  upsertStoredCategory,
} from '../services/supabase';
import {
  collectCategoriesFromItems,
  resolveSystemCategories,
  toCategoryPickerEntries,
  validateCategoryName,
} from '../utils/categories';

/**
 * @param {array} items
 * @param {{ forAdmin?: boolean }} options - Financial only when forAdmin is true
 */
export function useDynamicCategories(items = [], { forAdmin = false } = {}) {
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchPickerCategories({ forAdmin })
      .then((list) => {
        if (!cancelled) setDbCategories(list);
      })
      .catch((error) => {
        console.error('Failed to load categories:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [forAdmin]);

  const categoryNames = useMemo(
    () =>
      resolveSystemCategories({
        forAdmin,
        extras: [...dbCategories, ...collectCategoriesFromItems(items)],
      }),
    [dbCategories, items, forAdmin]
  );

  const categoryEntries = useMemo(
    () => toCategoryPickerEntries(categoryNames, { forAdmin }),
    [categoryNames, forAdmin]
  );

  async function persistCategory(name) {
    const check = validateCategoryName(name);
    if (!check.valid) {
      throw new Error(check.message);
    }
    const saved = await upsertStoredCategory(check.value, { isAdminOnly: false });
    setDbCategories((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === saved.toLowerCase())) return prev;
      return [...prev, saved].sort((a, b) => a.localeCompare(b));
    });
    return saved;
  }

  return { categoryNames, categoryEntries, loading, persistCategory };
}
