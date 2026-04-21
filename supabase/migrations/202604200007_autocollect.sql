-- Phase 9: AutoCollect — unpaid invoice tracking + payment invite workflow
-- Run in Supabase SQL editor for project: cmxahlxcqxphszmfywzn

create table if not exists autocollect_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references invoices(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  client_email text not null,
  invoice_number text not null,
  amount_cad numeric(10,2) not null,
  due_date date not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_invited_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_autocollect_status_due_date on autocollect_items(status, due_date);
create index if not exists idx_autocollect_project_id on autocollect_items(project_id);

alter table autocollect_items enable row level security;

create policy "client_read_own_autocollect_items"
  on autocollect_items for select
  using (
    exists (
      select 1 from projects p
      where p.id = autocollect_items.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

create policy "admin_read_all_autocollect_items"
  on autocollect_items for select
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

create policy "admin_update_autocollect_items"
  on autocollect_items for update
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

create policy "service_insert_autocollect_items"
  on autocollect_items for insert
  with check (true);
