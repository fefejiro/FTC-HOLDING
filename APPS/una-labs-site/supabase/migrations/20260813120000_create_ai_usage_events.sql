create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  operation text not null,
  project_id uuid references public.projects(id) on delete set null,
  provider_request_id text not null,
  occurred_at timestamptz not null default now(),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(14,8) not null default 0,
  usd_cad_rate numeric(12,6),
  cost_cad numeric(14,8),
  attribution_status text not null default 'unattributed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_usage_events_provider_request_id_key unique (provider_request_id),
  constraint ai_usage_events_attribution_status_check check (attribution_status in ('attributed', 'unattributed'))
);

create index if not exists ai_usage_events_occurred_at_idx on public.ai_usage_events (occurred_at desc);
create index if not exists ai_usage_events_project_id_idx on public.ai_usage_events (project_id, occurred_at desc);

alter table public.ai_usage_events enable row level security;

drop policy if exists "ai_usage_events_service_role_all" on public.ai_usage_events;
create policy "ai_usage_events_service_role_all"
on public.ai_usage_events
for all to service_role
using (true) with check (true);

drop policy if exists "ai_usage_events_authenticated_select" on public.ai_usage_events;
create policy "ai_usage_events_authenticated_select"
on public.ai_usage_events
for select to authenticated
using (true);
