import { useEffect, useMemo, useState } from 'react';
import { fetchDistinctCategories } from '../services/supabase';
import {
  collectCategoriesFromItems,
  resolveSystemCategories,
  toCategoryPickerEntries,
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

    fetchDistinctCategories()
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
  }, []);

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

  return { categoryNames, categoryEntries, loading };
}
