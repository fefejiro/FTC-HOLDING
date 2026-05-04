-- Gidi Dashers leaderboard schema
-- Hosted inside the existing Una Labs Supabase project, isolated under its own schema.

create extension if not exists "pgcrypto";

create schema if not exists gidi_dashers;
grant usage on schema gidi_dashers to anon, authenticated;

create table if not exists gidi_dashers.scores (
  id           uuid primary key default gen_random_uuid(),
  device_id    text not null,
  player_name  text not null default 'Anonymous',
  score        integer not null check (score >= 0 and score < 100000000),
  naira        integer not null default 0 check (naira >= 0 and naira < 100000000),
  character    text not null default 'tunde',
  duration_ms  integer not null default 0 check (duration_ms >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists scores_score_desc_idx on gidi_dashers.scores (score desc);
create index if not exists scores_created_at_idx on gidi_dashers.scores (created_at desc);
create index if not exists scores_device_idx on gidi_dashers.scores (device_id);

alter table gidi_dashers.scores enable row level security;

drop policy if exists "scores_read_all" on gidi_dashers.scores;
create policy "scores_read_all"
  on gidi_dashers.scores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "scores_insert_anon" on gidi_dashers.scores;
create policy "scores_insert_anon"
  on gidi_dashers.scores
  for insert
  to anon, authenticated
  with check (
    char_length(device_id) between 4 and 64
    and char_length(player_name) between 1 and 24
    and char_length(character) between 1 and 32
  );

create or replace view gidi_dashers.scores_top_100 as
  select id, device_id, player_name, score, naira, character, duration_ms, created_at
  from gidi_dashers.scores
  order by score desc
  limit 100;

grant select, insert on gidi_dashers.scores to anon, authenticated;
grant select on gidi_dashers.scores_top_100 to anon, authenticated;
