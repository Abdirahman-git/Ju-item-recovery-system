import { unstable_cache } from 'next/cache';
import { fetchPublicLiveItems } from '@/lib/publicItems';

export function getPublicLiveItemsCached(limit = 6) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 100);
  return unstable_cache(
    () => fetchPublicLiveItems({ limit: safeLimit, timeoutMs: 6_000, skipCache: true }),
    ['public-live-items-v3', String(safeLimit)],
    { revalidate: 30 }
  )();
}
