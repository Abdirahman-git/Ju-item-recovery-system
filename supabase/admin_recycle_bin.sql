-- Admin recycle bin: snapshot deleted users/items before hard delete.
-- Run in Supabase SQL editor once.

create table if not exists public.admin_recycle_bin (
  id bigserial primary key,
  entity_type text not null,
  entity_id text,
  title text,
  summary text,
  payload jsonb not null,
  deleted_by text,
  deleted_at timestamptz not null default now()
);

create index if not exists admin_recycle_bin_deleted_at_idx
  on public.admin_recycle_bin (deleted_at desc);

create index if not exists admin_recycle_bin_entity_type_idx
  on public.admin_recycle_bin (entity_type);

alter table public.admin_recycle_bin enable row level security;

drop policy if exists "admin_recycle_bin_all" on public.admin_recycle_bin;
create policy "admin_recycle_bin_all"
  on public.admin_recycle_bin
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.admin_recycle_bin to anon, authenticated;
grant usage, select on sequence public.admin_recycle_bin_id_seq to anon, authenticated;
