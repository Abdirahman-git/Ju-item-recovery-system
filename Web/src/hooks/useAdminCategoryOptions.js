'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCategorySelectOptions } from '@/components/admin/categoryOptions';
import { validateCategoryName } from '@/lib/categories';
import { fetchPickerCategories, upsertStoredCategory } from '@/lib/supabase';

/**
 * Admin category dropdown options backed by item_categories (+ item distinct).
 */
export function useAdminCategoryOptions() {
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPickerCategories({ forAdmin: true })
      .then((list) => {
        if (!cancelled) setExtras(list);
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

  const options = useMemo(
    () => getCategorySelectOptions({ forAdmin: true, extras }),
    [extras]
  );

  const persistCategory = useCallback(async (name) => {
    const check = validateCategoryName(name);
    if (!check.valid) throw new Error(check.message);
    const saved = await upsertStoredCategory(check.value, { isAdminOnly: false });
    setExtras((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === saved.toLowerCase())) return prev;
      return [...prev, saved].sort((a, b) => a.localeCompare(b));
    });
    return saved;
  }, []);

  return { options, loading, persistCategory };
}
