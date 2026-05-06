-- M5 security hardening: webhook idempotency + audit trail.
-- Constraint: no changes to existing tables; new tables only.

-- ---------------------------------------------------------------
-- 1. Webhook event idempotency
-- ---------------------------------------------------------------
-- Stores processed Stripe event IDs so duplicate webhook deliveries
-- are safely ignored. Primary key enforces uniqueness atomically.
create table if not exists public.webhook_events (
  id          text        primary key,   -- Stripe event ID (evt_...)
  event_type  text        not null,
  processed_at timestamptz not null default now()
);

-- No row-level security policies for authenticated users.
-- This table is only accessible via the service role (which bypasses RLS).
alter table public.webhook_events enable row level security;

-- ---------------------------------------------------------------
-- 2. Audit log
-- ---------------------------------------------------------------
create table if not exists public.audit_logs (
  id            uuid        primary key default gen_random_uuid(),
  action        text        not null,
  actor_id      uuid        references public.profiles(id) on delete set null,
  actor_role    text,
  resource_type text        not null,
  resource_id   text,
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_logs_action
  on public.audit_logs(action);

create index if not exists idx_audit_logs_actor_id
  on public.audit_logs(actor_id);

create index if not exists idx_audit_logs_resource
  on public.audit_logs(resource_type, resource_id);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

-- Only admins may read audit logs.
-- Service role bypasses RLS so the server-side audit helper can always write.
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
  on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );
