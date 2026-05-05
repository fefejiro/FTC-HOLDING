-- Phase 21: OG Trades Academy Leads Table
-- Durable persistence for all OG Trades Academy enrollment submissions

create extension if not exists pgcrypto;

create table if not exists og_trades_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  interest text,
  experience_level text,
  primary_goal text,
  timeline text,
  message text,
  status text not null default 'new',
  source text not null default 'og_trades_enrollment_form',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint og_trades_leads_status_check check (status in ('new', 'contacted', 'enrolled', 'archived')),
  constraint og_trades_leads_email_length_check check (char_length(email) <= 120),
  constraint og_trades_leads_name_length_check check (char_length(name) between 2 and 100)
);

create index if not exists idx_og_trades_leads_created_at on og_trades_leads(created_at desc);
create index if not exists idx_og_trades_leads_status on og_trades_leads(status);
create index if not exists idx_og_trades_leads_email on og_trades_leads(email);
create index if not exists idx_og_trades_leads_experience_level on og_trades_leads(experience_level);

alter table og_trades_leads enable row level security;

-- Public insert allowed (unauthenticated enrollment form submissions)
create policy "public_insert_og_trades_leads"
  on og_trades_leads for insert
  to anon
  with check (true);

-- Only admin can read/update/delete
create policy "admin_read_og_trades_leads"
  on og_trades_leads for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "admin_update_og_trades_leads"
  on og_trades_leads for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud')
  with check (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "admin_delete_og_trades_leads"
  on og_trades_leads for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create or replace function set_og_trades_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists og_trades_leads_updated_at on og_trades_leads;
create trigger og_trades_leads_updated_at
  before update on og_trades_leads
  for each row
  execute function set_og_trades_leads_updated_at();
