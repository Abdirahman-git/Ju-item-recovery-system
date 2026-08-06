-- Preserve original report timing when archiving to returned_items
-- Run once in Supabase SQL Editor

ALTER TABLE public.returned_items
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE public.returned_items
  ADD COLUMN IF NOT EXISTS date_reported TEXT;

ALTER TABLE public.returned_items
  ADD COLUMN IF NOT EXISTS time_reported TEXT;
