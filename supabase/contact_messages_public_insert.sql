-- Allow public website contact form to insert messages (anon only; no read access).
-- Run once in Supabase SQL Editor after contact_messages.sql

GRANT INSERT ON public.contact_messages TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.contact_messages_id_seq TO anon;

DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;

CREATE POLICY contact_messages_public_insert
  ON public.contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (
    char_length(trim(first_name)) > 0
    AND char_length(trim(last_name)) > 0
    AND char_length(trim(email)) > 3
    AND char_length(trim(subject)) > 0
    AND char_length(trim(message)) >= 5
    AND status = 'new'
  );
