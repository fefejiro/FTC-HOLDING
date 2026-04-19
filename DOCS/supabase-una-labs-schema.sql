-- Una Labs — projects + milestones schema
-- Run this in the Supabase SQL editor for project: cmxahlxcqxphszmfywzn

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  intake_id          text,
  tier               text,
  billing            text,
  stripe_session_id  text unique,
  status             text default 'intake',
  created_at         timestamptz default now()
);

create table if not exists milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  title        text,
  status       text default 'pending',
  due_date     date,
  completed_at timestamptz,
  proof_url    text,
  proof_note   text
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table projects  enable row level security;
alter table milestones enable row level security;

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
