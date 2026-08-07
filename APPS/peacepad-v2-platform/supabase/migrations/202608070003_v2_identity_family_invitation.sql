-- Sprint 2 identity and family authorization foundation for fictional staging.
-- Direct mobile access remains denied; the regional Edge Function authorizes
-- every operation and writes its audit event in the same transaction.

create table if not exists peacepad_v2.identity (
  identity_id uuid primary key references auth.users(id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.consent_record (
  consent_record_id uuid primary key,
  identity_id uuid not null references peacepad_v2.identity(identity_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  consent_type text not null check (consent_type in ('terms', 'privacy', 'third_party_ai')),
  granted boolean not null,
  policy_version text not null check (char_length(policy_version) between 1 and 40),
  recorded_at timestamptz not null default now(),
  schema_version integer not null default 1 check (schema_version > 0)
);

create table if not exists peacepad_v2.family_circle (
  family_id uuid primary key,
  region text not null check (region in ('ca', 'us')),
  family_name text not null check (char_length(family_name) between 1 and 120),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.participant_grant (
  participant_grant_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  identity_id uuid not null references peacepad_v2.identity(identity_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  role text not null check (role in ('parent', 'caregiver', 'professional_read_only')),
  permissions text[] not null default '{}',
  granted_by uuid not null references peacepad_v2.identity(identity_id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (family_id, identity_id)
);

create table if not exists peacepad_v2.family_invitation (
  invitation_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  code_hash bytea not null check (octet_length(code_hash) = 32),
  invited_role text not null check (invited_role in ('parent', 'caregiver', 'professional_read_only')),
  permissions text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_by uuid references peacepad_v2.identity(identity_id),
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 20),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (region, code_hash)
);

create index if not exists participant_grant_identity_idx
  on peacepad_v2.participant_grant(identity_id, family_id)
  where revoked_at is null;
create index if not exists family_invitation_family_idx
  on peacepad_v2.family_invitation(family_id, status, expires_at);

create or replace function peacepad_v2.prevent_identity_region_change()
returns trigger
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if old.region <> new.region then
    raise exception 'identity region is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists identity_region_immutable on peacepad_v2.identity;
create trigger identity_region_immutable
before update on peacepad_v2.identity
for each row execute function peacepad_v2.prevent_identity_region_change();

create or replace function peacepad_v2.prevent_consent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'consent history is append-only';
end;
$$;

drop trigger if exists consent_record_append_only on peacepad_v2.consent_record;
create trigger consent_record_append_only
before update or delete on peacepad_v2.consent_record
for each row execute function peacepad_v2.prevent_consent_mutation();

alter table peacepad_v2.identity enable row level security;
alter table peacepad_v2.consent_record enable row level security;
alter table peacepad_v2.family_circle enable row level security;
alter table peacepad_v2.participant_grant enable row level security;
alter table peacepad_v2.family_invitation enable row level security;

revoke all on all tables in schema peacepad_v2 from anon, authenticated;
revoke all on all sequences in schema peacepad_v2 from anon, authenticated;

