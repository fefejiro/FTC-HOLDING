-- Una Labs — projects + milestones schema
-- Run this in the Supabase SQL editor for project: cmxahlxcqxphszmfywzn

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  intake_id          text,
  name               text,
  tier               text,
  billing            text,
  stripe_session_id  text unique,
  status             text default 'intake',
  ai_price_min_cad   integer,
  ai_price_max_cad   integer,
  ai_price_rationale text,
  ai_price_confidence text,
  ai_price_generated_at timestamptz,
  created_at         timestamptz default now()
);

create table if not exists milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  title        text,
  description  text,
  status       text default 'pending',
  due_date     date,
  completed_at timestamptz,
  proof_url    text,
  proof_note   text
);

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

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table projects  enable row level security;
alter table milestones enable row level security;
alter table contracts enable row level security;

-- Worker can insert projects (anon key, server-side — trusted)
create policy "anon insert projects"
  on projects for insert
  with check (true);

-- Authenticated users see only their own projects (matched by email)
create policy "users read own projects"
  on projects for select
  using (auth.jwt() ->> 'email' = email);

-- Worker can insert milestones
create policy "anon insert milestones"
  on milestones for insert
  with check (true);

-- Users see milestones for their own projects
create policy "users read own milestones"
  on milestones for select
  using (
    exists (
      select 1 from projects p
      where p.id = milestones.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

-- Users can update milestones for their own projects (approve/request changes)
create policy "users_update_own_milestones"
  on milestones for update
  using (
    exists (
      select 1 from projects p
      where p.id = milestones.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

-- Users can read their own contracts
create policy "users_read_own_contracts"
  on contracts for select
  using (
    exists (
      select 1 from projects p
      where p.id = contracts.project_id
        and auth.jwt() ->> 'email' = p.email
    )
  );

-- Admin can see all projects (pipeline view)
create policy "admin_read_all_projects"
  on projects for select
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

-- Admin can update any project (pipeline status changes)
create policy "admin_update_projects"
  on projects for update
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

-- Admin can see all milestones (pipeline milestone counts)
create policy "admin_read_all_milestones"
  on milestones for select
  using (
    (select auth.jwt() ->> 'email') = 'hello@unalabs.cloud'
  );

-- Admin can see all contracts
create policy "admin_read_all_contracts"
  on contracts for select
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

-- Admin can update any contract
create policy "admin_update_contracts"
  on contracts for update
  using (auth.jwt() ->> 'email' = 'hello@unalabs.cloud');

create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  milestone_id   uuid not null unique references milestones(id) on delete cascade,
  invoice_number text not null,
  title          text not null,
  amount_cad     numeric(10,2) not null,
  status         text not null default 'unpaid',
  due_date       date not null,
  paid_at        timestamptz,
  client_email   text not null,
  created_at     timestamptz not null default now()
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

create table if not exists instant_bills (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  stripe_payment_link_id text not null,
  stripe_price_id      text not null,
  amount_cad           numeric(10,2) not null,
  description          text not null,
  payment_link_url     text not null,
  status               text not null default 'sent',
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
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
