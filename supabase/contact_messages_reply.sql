-- Reply tracking for contact messages (run in Supabase SQL Editor)
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS reply_body TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_by TEXT;
