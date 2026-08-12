-- Public contact form messages (super admin inbox)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  read_by TEXT,
  reply_body TEXT,
  replied_at TIMESTAMPTZ,
  replied_by TEXT
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS contact_messages_status_idx
  ON public.contact_messages (status);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Backend service_role only (public form + admin list go through Express)
REVOKE ALL ON TABLE public.contact_messages FROM anon, authenticated;
GRANT ALL ON TABLE public.contact_messages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.contact_messages_id_seq TO service_role;
