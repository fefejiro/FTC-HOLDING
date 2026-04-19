-- Una Labs — subscribers table
-- Run in Supabase SQL editor for project: aaaextkrfoqomzmjjkxe

create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz default now()
);

alter table subscribers enable row level security;

-- Worker can insert (anon key, server-side)
create policy "anon insert subscribers"
  on subscribers for insert
  with check (true);
