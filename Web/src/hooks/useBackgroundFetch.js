'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminCache, isAdminCacheFresh, setAdminCache, subscribeAdminCache } from '@/lib/adminDataCache';

/**
 * Always show cached/placeholder data immediately; refresh silently in background.
 * No blocking loading spinners.
 */
export function useBackgroundFetch(cacheKey, fetchFn, options = {}) {
  const { onSuccess, fallback = null, staleMs = 5000 } = options;
  const fetchRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  fetchRef.current = fetchFn;
  onSuccessRef.current = onSuccess;

  const [data, setData] = useState(() => getAdminCache(cacheKey)?.data ?? fallback);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(null);

  const run = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    inFlightRef.current = (async () => {
      try {
        const result = await fetchRef.current();
        setAdminCache(cacheKey, result);
        setData(result);
        setError(null);
        onSuccessRef.current?.(result);
      } catch (e) {
        const hasData = getAdminCache(cacheKey) != null;
        if (!hasData) {
          setError(e?.message || 'Failed to load');
        }
      } finally {
        inFlightRef.current = null;
      }
    })();

    return inFlightRef.current;
  }, [cacheKey]);

  useEffect(() => {
    const cached = getAdminCache(cacheKey);
    if (cached) {
      setData(cached.data);
    }
    if (!isAdminCacheFresh(cacheKey, staleMs)) {
      run();
    }

    return subscribeAdminCache(cacheKey, (next) => {
      if (next != null) {
        setData(next);
        setError(null);
        onSuccessRef.current?.(next);
      }
    });
  }, [cacheKey, run, staleMs]);

  const refresh = useCallback(() => run(), [run]);

  const patchData = useCallback(
    (updater) => {
      setData((prev) => {
        const base = prev ?? fallback;
        const next = typeof updater === 'function' ? updater(base) : updater;
        setAdminCache(cacheKey, next);
        return next;
      });
    },
    [cacheKey, fallback]
  );

  return { data, error, refresh, setData, patchData };
}
