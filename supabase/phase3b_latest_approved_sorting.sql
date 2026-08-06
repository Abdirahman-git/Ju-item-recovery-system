-- =============================================================================
-- JU LOFO — Latest approved ordering (landing feed)
--
-- Adds `approved_at` to lost_items + found_items and backfills it for rows
-- that are already admin-approved.
--
-- After running this SQL:
-- - code can set `approved_at` when admins mark an item LIVE/approved
-- - Web landing sorting can use `approved_at DESC` via sortKey
-- =============================================================================

BEGIN;

ALTER TABLE public.lost_items
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Backfill: if already approved/live, use created_at as the best available proxy.
UPDATE public.lost_items
SET approved_at = COALESCE(approved_at, created_at)
WHERE is_approved = true
  AND approved_at IS NULL;

UPDATE public.found_items
SET approved_at = COALESCE(approved_at, created_at)
WHERE is_approved = true
  AND approved_at IS NULL;

COMMIT;

