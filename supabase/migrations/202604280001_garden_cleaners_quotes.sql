-- Phase 20: Dedicated Garden Cleaners Quotes Table
-- Durable persistence for all Garden Cleaners quote submissions

create extension if not exists pgcrypto;

create table if not exists garden_cleaners_quotes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  address text,
  city text,
  region text,
  postal_code text,
  property_type text,
  service_type text,
  service_frequency text,
  preferred_date text,
  preferred_time text,
  message text,
  status text not null default 'new',
  source text not null default 'garden_cleaners_quote_form',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint garden_cleaners_quotes_status_check check (status in ('new', 'triaged', 'scheduled', 'completed', 'cancelled')),
  constraint garden_cleaners_quotes_email_length_check check (char_length(email) <= 120),
  constraint garden_cleaners_quotes_name_length_check check (char_length(name) between 2 and 100)
);

create index if not exists idx_garden_cleaners_quotes_created_at on garden_cleaners_quotes(created_at desc);
create index if not exists idx_garden_cleaners_quotes_status on garden_cleaners_quotes(status);
create index if not exists idx_garden_cleaners_quotes_region on garden_cleaners_quotes(region);
create index if not exists idx_garden_cleaners_quotes_email on garden_cleaners_quotes(email);

alter table garden_cleaners_quotes enable row level security;

-- Public insert allowed (unauthenticated quote form submissions)
create policy "public_insert_garden_cleaners_quotes"
  on garden_cleaners_quotes for insert
  to anon
  with check (true);

-- Only admin can read/update/delete
create policy "admin_read_garden_cleaners_quotes"
  on garden_cleaners_quotes for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "admin_update_garden_cleaners_quotes"
  on garden_cleaners_quotes for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud')
  with check (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "admin_delete_garden_cleaners_quotes"
  on garden_cleaners_quotes for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create or replace function set_garden_cleaners_quotes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists garden_cleaners_quotes_updated_at on garden_cleaners_quotes;
create trigger garden_cleaners_quotes_updated_at
  before update on garden_cleaners_quotes
  for each row
  execute function set_garden_cleaners_quotes_updated_at();
