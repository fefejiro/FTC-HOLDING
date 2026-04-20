-- Phase 5: Contracts / E-sign — engagement letter records
-- Run in Supabase SQL editor for project: cmxahlxcqxphszmfywzn

create table if not exists contracts (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null unique references projects(id) on delete cascade,
  title             text,
  body              text not null,
  status            text default 'sent',
  sent_at           timestamptz default now(),
  signer_name       text,
  signer_email      text,
  signature_text    text,
  signed_at         timestamptz,
  signed_ip         text,
  signed_user_agent text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table contracts enable row level security;

create policy "users_read_own_contracts"
  on contracts for select
  using (
    exists (
      select 1 from projects p
      where p.id = contracts.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

create policy "admin_read_all_contracts"
  on contracts for select
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

create policy "admin_update_contracts"
  on contracts for update
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');
