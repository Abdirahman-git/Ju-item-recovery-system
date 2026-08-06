-- Unclaimed / stale items archived by Super Admin (removed from live app feed).
-- Run in Supabase SQL editor once.

create table if not exists public.archived_items (
  id bigserial primary key,
  item_name text,
  category text,
  description text,
  location text,
  imageuri text,
  type text not null default 'LOST',
  original_reporter text,
  reporter_email text,
  source_table text,
  source_id text,
  reason text,
  archived_by text,
  archived_at timestamptz not null default now(),
  payload jsonb
);

create index if not exists archived_items_archived_at_idx
  on public.archived_items (archived_at desc);

create index if not exists archived_items_type_idx
  on public.archived_items (type);

alter table public.archived_items enable row level security;

drop policy if exists "archived_items_all" on public.archived_items;
create policy "archived_items_all"
  on public.archived_items
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.archived_items to anon, authenticated;
grant usage, select on sequence public.archived_items_id_seq to anon, authenticated;
