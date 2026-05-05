-- Phase 6: Invoicing — milestone invoice records
-- Run in Supabase SQL editor for project: cmxahlxcqxphszmfywzn

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid not null unique references milestones(id) on delete cascade,
  invoice_number text not null,
  title text not null,
  amount_cad numeric(10,2) not null,
  status text not null default 'unpaid',
  due_date date not null,
  paid_at timestamptz,
  client_email text not null,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

create policy "client_read_own_invoices"
  on invoices for select
  using (
    exists (
      select 1 from projects p
      where p.id = invoices.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

create policy "admin_read_all_invoices"
  on invoices for select
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "admin_update_invoices"
  on invoices for update
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create policy "service_insert_invoices"
  on invoices for insert
  with check (true);
