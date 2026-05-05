-- Phase 7: Instant Bill — one-off Stripe Payment Links
-- Run in Supabase SQL editor for project: cmxahlxcqxphszmfywzn

create table if not exists instant_bills (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  stripe_payment_link_id text not null,
  stripe_price_id text not null,
  amount_cad numeric(10,2) not null,
  description text not null,
  payment_link_url text not null,
  status text not null default 'sent',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table instant_bills enable row level security;

create policy "client_read_own_instant_bills"
  on instant_bills for select
  using (
    exists (
      select 1 from projects p
      where p.id = instant_bills.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

create policy "admin_read_all_instant_bills"
  on instant_bills for select
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "admin_update_instant_bills"
  on instant_bills for update
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "service_insert_instant_bills"
  on instant_bills for insert
  with check (true);
