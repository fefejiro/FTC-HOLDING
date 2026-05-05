alter table if exists public.ateam_workflow_runs
  add column if not exists request_json jsonb not null default '{}'::jsonb;

alter table if exists public.ateam_workflow_runs
  add column if not exists plan_json jsonb not null default '{}'::jsonb;

alter table if exists public.ateam_workflow_runs
  add column if not exists evaluation_json jsonb not null default '{}'::jsonb;

alter table if exists public.ateam_workflow_runs
  add column if not exists state text not null default 'queued';

alter table if exists public.ateam_workflow_runs
  add column if not exists state_history_json jsonb not null default '[]'::jsonb;

create index if not exists idx_ateam_workflow_runs_state
  on public.ateam_workflow_runs (state, updated_ts desc);
