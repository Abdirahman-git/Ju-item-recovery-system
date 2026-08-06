-- Item lifecycle status on lost_items and found_items
-- Run in Supabase SQL Editor after existing schema is in place.

ALTER TABLE lost_items
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE found_items
  ADD COLUMN IF NOT EXISTS status text;

-- Migrate legacy is_approved rows
UPDATE lost_items
SET status = CASE
  WHEN status IS NOT NULL AND status <> '' THEN status
  WHEN is_approved = true THEN 'live'
  ELSE 'pending_review'
END
WHERE status IS NULL OR status = '';

UPDATE found_items
SET status = CASE
  WHEN status IS NOT NULL AND status <> '' THEN status
  WHEN is_approved = true THEN 'live'
  ELSE 'pending_review'
END
WHERE status IS NULL OR status = '';

ALTER TABLE lost_items
  ALTER COLUMN status SET DEFAULT 'pending_review';

ALTER TABLE found_items
  ALTER COLUMN status SET DEFAULT 'pending_review';

ALTER TABLE lost_items
  DROP CONSTRAINT IF EXISTS lost_items_status_check;

ALTER TABLE lost_items
  ADD CONSTRAINT lost_items_status_check
  CHECK (status IN (
    'draft',
    'pending_review',
    'live',
    'matched',
    'claim_pending',
    'returned'
  ));

ALTER TABLE found_items
  DROP CONSTRAINT IF EXISTS found_items_status_check;

ALTER TABLE found_items
  ADD CONSTRAINT found_items_status_check
  CHECK (status IN (
    'draft',
    'pending_review',
    'live',
    'matched',
    'claim_pending',
    'returned'
  ));

-- Keep is_approved in sync for older app builds
UPDATE lost_items SET is_approved = (status IN ('live', 'matched', 'claim_pending'));
UPDATE found_items SET is_approved = (status IN ('live', 'matched', 'claim_pending'));
