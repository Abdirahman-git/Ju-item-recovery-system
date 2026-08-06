-- Secure Found Hold: redacted public listings for high-value items
-- Run the ENTIRE script top-to-bottom in Supabase SQL Editor (do not run only the VIEW section).

-- ── Step 1: Add columns to found_items ──────────────────────────────────────

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS listing_mode TEXT DEFAULT 'public';

UPDATE public.found_items
SET listing_mode = 'public'
WHERE listing_mode IS NULL;

ALTER TABLE public.found_items
  ALTER COLUMN listing_mode SET DEFAULT 'public';

ALTER TABLE public.found_items
  ALTER COLUMN listing_mode SET NOT NULL;

ALTER TABLE public.found_items
  DROP CONSTRAINT IF EXISTS found_items_listing_mode_check;

ALTER TABLE public.found_items
  ADD CONSTRAINT found_items_listing_mode_check
  CHECK (listing_mode IN ('public', 'secure'));

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS public_notice TEXT;

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS public_category TEXT;

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS security_location TEXT DEFAULT 'Campus Security Office';

-- ── Step 2: Public feed view (requires Step 1 columns) ───────────────────────

DROP VIEW IF EXISTS public.found_items_public_feed;

CREATE VIEW public.found_items_public_feed AS
SELECT
  id,
  status,
  "dateFound",
  "timeFound",
  listing_mode,
  public_notice,
  public_category,
  security_location,
  CASE WHEN listing_mode = 'secure' THEN public_category ELSE category END AS category,
  "itemName",
  CASE
    WHEN listing_mode = 'secure' THEN COALESCE(security_location, 'Campus Security Office')
    ELSE location
  END AS location,
  CASE WHEN listing_mode = 'secure' THEN NULL ELSE description END AS description,
  CASE WHEN listing_mode = 'secure' THEN NULL ELSE "imageURI" END AS "imageURI",
  CASE WHEN listing_mode = 'secure' THEN NULL ELSE "finderName" END AS "finderName",
  CASE WHEN listing_mode = 'secure' THEN NULL ELSE phnum END AS phnum,
  CASE WHEN listing_mode = 'secure' THEN true ELSE is_approved END AS is_approved,
  email
FROM public.found_items;

GRANT SELECT ON public.found_items_public_feed TO anon, authenticated, service_role;
