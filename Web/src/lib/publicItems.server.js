import { unstable_cache } from 'next/cache';
import { fetchPublicLiveItems } from '@/lib/publicItems';

export function getPublicLiveItemsCached(limit = 6) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 100);
  return unstable_cache(
    () => fetchPublicLiveItems({ limit: safeLimit, timeoutMs: 8_000 }),
    ['public-live-items', String(safeLimit)],
    { revalidate: 30 }
  )();
}
