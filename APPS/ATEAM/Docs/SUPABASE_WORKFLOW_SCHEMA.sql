create table if not exists public.ateam_approvals (
  id text primary key,
  created_ts timestamptz not null,
  status text not null default 'pending',
  requested_by text not null default '',
  policy text not null default '',
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb
);

create index if not exists idx_ateam_approvals_status
  on public.ateam_approvals (status, created_ts desc);

create table if not exists public.ateam_work_items (
  id text primary key,
  created_ts timestamptz not null,
  title text not null default '',
  objective text not null default '',
  stage text not null default 'BACKLOG',
  risk text not null default 'low',
  owner_agent_id text not null default '',
  data_json jsonb not null default '{}'::jsonb
);

create index if not exists idx_ateam_work_items_stage
  on public.ateam_work_items (stage, created_ts desc);

create table if not exists public.ateam_workflow_runs (
  id text primary key,
  created_ts timestamptz not null,
  updated_ts timestamptz not null,
  phase text not null default 'intake',
  requested_by text not null default '',
  category text not null default 'website',
  idea text not null default '',
  title text not null default '',
  questions_json jsonb not null default '[]'::jsonb,
  answers_json jsonb not null default '{}'::jsonb,
  brief_json jsonb not null default '{}'::jsonb,
  recommended_lane text not null default '',
  risks_json jsonb not null default '[]'::jsonb,
  artifacts_json jsonb not null default '{}'::jsonb,
  approvals_json jsonb not null default '{}'::jsonb,
  links_json jsonb not null default '{}'::jsonb,
  handoff_json jsonb not null default '{}'::jsonb,
  meta_json jsonb not null default '{}'::jsonb
);

create index if not exists idx_ateam_workflow_runs_phase
  on public.ateam_workflow_runs (phase, updated_ts desc);

create index if not exists idx_ateam_workflow_runs_updated
  on public.ateam_workflow_runs (updated_ts desc);
