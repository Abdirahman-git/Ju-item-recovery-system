-- Add time columns used by the mobile app (run once in Supabase SQL Editor)

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS "timeFound" TEXT;

ALTER TABLE public.lost_items
  ADD COLUMN IF NOT EXISTS "timeLost" TEXT;
