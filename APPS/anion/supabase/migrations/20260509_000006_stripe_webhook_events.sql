create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'replayed')),
  error_message text,
  attempt_count integer not null default 1,
  updated_at timestamptz not null default now()
);

create unique index if not exists stripe_webhook_events_event_id_uq
  on public.stripe_webhook_events (stripe_event_id);

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events (status)
  where status in ('pending', 'failed');

alter table public.stripe_webhook_events enable row level security;
