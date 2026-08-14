-- Immutable V1 cutover evidence and read-only archives. These tables are
-- populated only by the reviewed operator-run cutover transaction. They do
-- not accept legacy credentials, raw passwords, call recordings, transcripts,
-- AI profiles, or public attachment URLs.

create table if not exists peacepad_v2.legacy_source_map (
  migration_batch_id text not null check (char_length(migration_batch_id) between 1 and 80),
  source_system text not null check (source_system = 'legacy-peacepad-express-postgresql'),
  source_table text not null check (source_table in (
    'users','partnerships','conversation_members','conversations','messages','events','notes','child_updates','tasks','expenses'
  )),
  source_id text not null check (char_length(source_id) between 1 and 160),
  target_table text not null check (target_table in (
    'identity','family_circle','participant_grant','conversation','message_event','schedule_event',
    'legacy_record_archive','legacy_task_archive','legacy_expense_archive'
  )),
  target_id uuid not null,
  region text not null check (region in ('ca','us')),
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  migrated_at timestamptz not null default now(),
  primary key (migration_batch_id, source_table, source_id),
  unique (migration_batch_id, target_table, target_id)
);

create table if not exists peacepad_v2.legacy_task_archive (
  archive_id uuid primary key,
  migration_batch_id text not null check (char_length(migration_batch_id) between 1 and 80),
  legacy_task_id text not null,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  created_by_identity_id uuid not null,
  assigned_to_identity_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  completed boolean not null,
  due_date_text text check (due_date_text is null or char_length(due_date_text) <= 120),
  location_text text check (location_text is null or char_length(location_text) <= 2000),
  region text not null check (region in ('ca','us')),
  source_created_at timestamptz not null,
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  archived_at timestamptz not null default now(),
  unique (migration_batch_id, legacy_task_id)
);

create table if not exists peacepad_v2.legacy_record_archive (
  archive_id uuid primary key,
  migration_batch_id text not null check (char_length(migration_batch_id) between 1 and 80),
  legacy_record_id text not null,
  source_table text not null check (source_table in ('notes','child_updates')),
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  created_by_identity_id uuid not null,
  title text not null check (char_length(title) between 1 and 240),
  content text not null check (char_length(content) between 1 and 10000),
  region text not null check (region in ('ca','us')),
  source_created_at timestamptz not null,
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  archived_at timestamptz not null default now(),
  unique (migration_batch_id, source_table, legacy_record_id)
);

create table if not exists peacepad_v2.legacy_expense_archive (
  archive_id uuid primary key,
  migration_batch_id text not null check (char_length(migration_batch_id) between 1 and 80),
  legacy_expense_id text not null,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  paid_by_identity_id uuid not null,
  description text not null check (char_length(description) between 1 and 500),
  amount_text text not null check (char_length(amount_text) between 1 and 80),
  currency_code text not null default 'CAD' check (currency_code = 'CAD'),
  category text not null check (char_length(category) between 1 and 120),
  status text not null check (char_length(status) between 1 and 80),
  participant_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(participant_snapshot) = 'array'),
  settlement_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(settlement_snapshot) = 'array'),
  region text not null check (region in ('ca','us')),
  source_created_at timestamptz not null,
  source_updated_at timestamptz not null,
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  archived_at timestamptz not null default now(),
  unique (migration_batch_id, legacy_expense_id)
);

create table if not exists peacepad_v2.legacy_attachment_manifest (
  migration_batch_id text not null check (char_length(migration_batch_id) between 1 and 80),
  legacy_attachment_id text not null,
  source_parent_table text not null check (source_parent_table in ('messages','expenses','record_metadata')),
  source_parent_id text not null check (char_length(source_parent_id) between 1 and 160),
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  owner_identity_id uuid not null,
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  media_type text not null check (media_type in ('image/jpeg','image/png','application/pdf','text/plain')),
  byte_length bigint not null check (byte_length between 1 and 26214400),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  source_locator text not null check (
    source_locator ~ '^legacy://[A-Za-z0-9._/-]+$'
    and position('?' in source_locator) = 0
    and position('@' in source_locator) = 0
  ),
  target_case_binder_id uuid not null,
  target_attachment_id uuid not null,
  target_object_path text not null check (
    target_object_path ~ '^(ca|us)/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf|txt)$'
  ),
  region text not null check (region in ('ca','us')),
  copy_status text not null default 'pending-copy' check (copy_status in ('pending-copy','copied','verified','quarantined')),
  copied_byte_length bigint,
  copied_sha256 text check (copied_sha256 is null or copied_sha256 ~ '^[0-9a-f]{64}$'),
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  primary key (migration_batch_id, legacy_attachment_id),
  unique (migration_batch_id, target_attachment_id),
  unique (migration_batch_id, target_object_path),
  check (
    (copy_status in ('pending-copy','quarantined') and verified_at is null)
    or (copy_status = 'copied' and copied_byte_length is not null and copied_sha256 is not null and verified_at is null)
    or (copy_status = 'verified' and copied_byte_length = byte_length and copied_sha256 = content_sha256 and verified_at is not null)
  )
);

create index if not exists legacy_source_map_batch_idx
  on peacepad_v2.legacy_source_map(migration_batch_id, source_table);
create index if not exists legacy_attachment_manifest_status_idx
  on peacepad_v2.legacy_attachment_manifest(migration_batch_id, copy_status);

alter table peacepad_v2.legacy_source_map enable row level security;
alter table peacepad_v2.legacy_task_archive enable row level security;
alter table peacepad_v2.legacy_record_archive enable row level security;
alter table peacepad_v2.legacy_expense_archive enable row level security;
alter table peacepad_v2.legacy_attachment_manifest enable row level security;

revoke all on table peacepad_v2.legacy_source_map from public, anon, authenticated;
revoke all on table peacepad_v2.legacy_task_archive from public, anon, authenticated;
revoke all on table peacepad_v2.legacy_record_archive from public, anon, authenticated;
revoke all on table peacepad_v2.legacy_expense_archive from public, anon, authenticated;
revoke all on table peacepad_v2.legacy_attachment_manifest from public, anon, authenticated;
grant select, insert on table peacepad_v2.legacy_source_map to service_role;
grant select, insert on table peacepad_v2.legacy_task_archive to service_role;
grant select, insert on table peacepad_v2.legacy_record_archive to service_role;
grant select, insert on table peacepad_v2.legacy_expense_archive to service_role;
grant select, insert, update on table peacepad_v2.legacy_attachment_manifest to service_role;

create or replace function peacepad_v2.prevent_legacy_archive_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'PeacePad legacy migration archives are append-only';
end;
$$;

drop trigger if exists legacy_source_map_append_only on peacepad_v2.legacy_source_map;
create trigger legacy_source_map_append_only before update or delete on peacepad_v2.legacy_source_map
  for each row execute function peacepad_v2.prevent_legacy_archive_mutation();
drop trigger if exists legacy_task_archive_append_only on peacepad_v2.legacy_task_archive;
create trigger legacy_task_archive_append_only before update or delete on peacepad_v2.legacy_task_archive
  for each row execute function peacepad_v2.prevent_legacy_archive_mutation();
drop trigger if exists legacy_record_archive_append_only on peacepad_v2.legacy_record_archive;
create trigger legacy_record_archive_append_only before update or delete on peacepad_v2.legacy_record_archive
  for each row execute function peacepad_v2.prevent_legacy_archive_mutation();
drop trigger if exists legacy_expense_archive_append_only on peacepad_v2.legacy_expense_archive;
create trigger legacy_expense_archive_append_only before update or delete on peacepad_v2.legacy_expense_archive
  for each row execute function peacepad_v2.prevent_legacy_archive_mutation();

-- The attachment manifest is mutable only through this reconciliation
-- function so copied bytes can be verified without making archives writable.
create or replace function public.peacepad_v2_reconcile_legacy_attachment(
  p_migration_batch_id text,
  p_legacy_attachment_id text,
  p_observed_byte_length bigint,
  p_observed_sha256 text
) returns text language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare manifest_row peacepad_v2.legacy_attachment_manifest%rowtype;
begin
  select * into manifest_row from peacepad_v2.legacy_attachment_manifest
    where migration_batch_id=p_migration_batch_id and legacy_attachment_id=p_legacy_attachment_id for update;
  if not found then raise exception using errcode='22023',message='LEGACY_ATTACHMENT_UNKNOWN'; end if;
  if p_observed_byte_length is distinct from manifest_row.byte_length
    or p_observed_sha256 is null or p_observed_sha256 !~ '^[0-9a-f]{64}$'
    or p_observed_sha256 is distinct from manifest_row.content_sha256 then
    update peacepad_v2.legacy_attachment_manifest set copy_status='quarantined',
      copied_byte_length=p_observed_byte_length,
      copied_sha256=case when p_observed_sha256 ~ '^[0-9a-f]{64}$' then p_observed_sha256 else null end,
      verified_at=null
      where migration_batch_id=p_migration_batch_id and legacy_attachment_id=p_legacy_attachment_id;
    return 'quarantined';
  end if;
  update peacepad_v2.legacy_attachment_manifest set copy_status='verified',
    copied_byte_length=p_observed_byte_length,copied_sha256=p_observed_sha256,verified_at=now()
    where migration_batch_id=p_migration_batch_id and legacy_attachment_id=p_legacy_attachment_id;
  return 'verified';
end;
$$;

revoke all on function public.peacepad_v2_reconcile_legacy_attachment(text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.peacepad_v2_reconcile_legacy_attachment(text,text,bigint,text) to service_role;
