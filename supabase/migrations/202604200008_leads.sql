-- Phase 10: Deals / Leads — pre-intake prospect pipeline
-- Captures prospects before they commit to a paid intake.
-- Run in Supabase SQL editor for project: cmxahlxcqxphszmfywzn

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  message text,
  source text not null default 'contact_form',  -- 'contact_form' | 'realtor' | 'referral' | 'manual'
  status text not null default 'new',           -- 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  notes text,
  converted_project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_created_at on leads(created_at desc);

alter table leads enable row level security;

-- Only admin can read leads
create policy "admin_read_all_leads"
  on leads for select
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

-- Only admin can update leads (status changes, notes)
create policy "admin_update_leads"
  on leads for update
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

-- Public insert allowed (unauthenticated contact form submissions)
create policy "public_insert_leads"
  on leads for insert
  with check (true);

-- Admin can delete (clean up spam)
create policy "admin_delete_leads"
  on leads for delete
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');
