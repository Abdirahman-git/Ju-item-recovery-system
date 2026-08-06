-- Allow draft status on lost_items and found_items (fixes Save Draft constraint error)
-- Run once in Supabase SQL Editor.

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
