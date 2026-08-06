-- Optional: run ONLY if you previously ran secure_lost_items.sql
-- Moves secure rows back to found_items (original design).

INSERT INTO public.found_items (
  "itemName",
  category,
  description,
  location,
  "dateFound",
  "timeFound",
  "finderName",
  email,
  "userId",
  userid,
  phnum,
  "imageURI",
  listing_mode,
  public_notice,
  public_category,
  security_location,
  is_approved,
  status
)
SELECT
  COALESCE(l."itemName", l.item_name, 'Secure item'),
  COALESCE(l.public_category, l.category, 'Other'),
  COALESCE(l.public_notice, l.description),
  COALESCE(l.security_location, l.location, 'Campus Security Office'),
  COALESCE(l."dateLost", l.date_lost, CURRENT_DATE::text),
  l."timeLost",
  COALESCE(l."ownerName", l.owner_name, 'Campus Security'),
  l.email,
  l."userId",
  l.userid,
  l.phnum,
  l."imageURI",
  'secure',
  l.public_notice,
  COALESCE(l.public_category, l.category, 'Other'),
  COALESCE(l.security_location, 'Campus Security Office'),
  COALESCE(l.is_approved, true),
  COALESCE(l.status, 'live')
FROM public.lost_items l
WHERE l.listing_mode = 'secure';

DELETE FROM public.lost_items WHERE listing_mode = 'secure';

-- Restore original found public feed (includes secure rows)
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

DROP VIEW IF EXISTS public.lost_items_public_feed;
