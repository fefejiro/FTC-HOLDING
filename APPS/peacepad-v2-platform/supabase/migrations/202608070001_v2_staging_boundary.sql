-- PeacePad V2 fictional staging boundary. Apply independently to each regional
-- Supabase project. The mobile client never receives database credentials and
-- accesses these tables only through the versioned server-side /api/v2 adapter.

create schema if not exists peacepad_v2;

create table if not exists peacepad_v2.region_binding (
  identity_id uuid primary key,
  region text not null check (region in ('ca', 'us')),
  created_at timestamptz not null default now()
);

create table if not exists peacepad_v2.audit_event (
  audit_event_id uuid primary key,
  identity_id uuid not null,
  family_id uuid,
  region text not null check (region in ('ca', 'us')),
  event_type text not null,
  schema_version integer not null check (schema_version > 0),
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  unique (identity_id, idempotency_key)
);

alter table peacepad_v2.region_binding enable row level security;
alter table peacepad_v2.audit_event enable row level security;

-- No anon/authenticated policies are intentionally created. Direct client
-- access therefore fails closed. A server-side adapter must authorize every
-- request and write the append-only audit event in the same transaction.
revoke all on schema peacepad_v2 from anon, authenticated;
revoke all on all tables in schema peacepad_v2 from anon, authenticated;

create or replace function peacepad_v2.prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'peacepad_v2.audit_event is append-only';
end;
$$;

drop trigger if exists audit_event_append_only on peacepad_v2.audit_event;
create trigger audit_event_append_only
before update or delete on peacepad_v2.audit_event
for each row execute function peacepad_v2.prevent_audit_mutation();
