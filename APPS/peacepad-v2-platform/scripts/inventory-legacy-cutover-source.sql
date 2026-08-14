-- Content-free, read-only legacy source inventory for a future V1 -> V2 cutover.
-- It must be run only against the legacy PostgreSQL source. It never contacts a
-- V2 target and emits metadata plus aggregate counts only: no IDs, emails,
-- message bodies, event titles, or other user content.

\set ON_ERROR_STOP on
\if :{?inventory_output}
\else
  \quit
\endif

begin transaction read only;
set local statement_timeout = '30s';
set local lock_timeout = '5s';
set local search_path = peacepad, public;

do $$
begin
  if to_regclass('peacepad.users') is null
    or to_regclass('peacepad.partnerships') is null
    or to_regclass('peacepad.conversations') is null
    or to_regclass('peacepad.conversation_members') is null
    or to_regclass('peacepad.messages') is null
    or to_regclass('peacepad.events') is null then
    raise exception 'LEGACY_SOURCE_INVENTORY_REQUIRED_TABLE_MISSING';
  end if;
end;
$$;

\pset format unaligned
\pset tuples_only on
\o :inventory_output
with expected_columns(table_name, column_name) as (
  values
    ('users', 'id'), ('users', 'email'), ('users', 'display_name'), ('users', 'created_at'),
    ('users', 'terms_accepted_at'), ('users', 'privacy_accepted'), ('users', 'ai_message_consent'),
    ('partnerships', 'id'), ('partnerships', 'user1_id'), ('partnerships', 'user2_id'),
    ('partnerships', 'allow_audio'), ('partnerships', 'created_at'),
    ('conversations', 'id'), ('conversations', 'created_by'), ('conversations', 'created_at'),
    ('conversation_members', 'conversation_id'), ('conversation_members', 'user_id'),
    ('messages', 'id'), ('messages', 'conversation_id'), ('messages', 'sender_id'),
    ('messages', 'content'), ('messages', 'message_type'), ('messages', 'is_deleted'), ('messages', 'timestamp'),
    ('events', 'id'), ('events', 'title'), ('events', 'type'), ('events', 'start_date'),
    ('events', 'end_date'), ('events', 'description'), ('events', 'created_by'), ('events', 'created_at')
), source_columns as (
  select table_name, column_name, data_type, is_nullable
  from information_schema.columns
  where table_schema = 'peacepad'
), missing_columns as (
  select expected_columns.table_name, expected_columns.column_name
  from expected_columns
  left join source_columns
    on source_columns.table_name = expected_columns.table_name
   and source_columns.column_name = expected_columns.column_name
  where source_columns.column_name is null
), source_fingerprint as (
  select md5(coalesce(string_agg(
    source_columns.table_name || ':' || source_columns.column_name || ':' || source_columns.data_type || ':' || source_columns.is_nullable,
    ',' order by source_columns.table_name, source_columns.column_name
  ), '')) as value
  from source_columns
  where source_columns.table_name in ('users', 'partnerships', 'conversations', 'conversation_members', 'messages', 'events')
)
select jsonb_build_object(
  'schemaVersion', 1,
  'mode', 'read-only-source-inventory',
  'sourceSchema', 'peacepad',
  'tableCounts', jsonb_build_object(
    'users', (select count(*) from peacepad.users),
    'partnerships', (select count(*) from peacepad.partnerships),
    'conversations', (select count(*) from peacepad.conversations),
    'conversation_members', (select count(*) from peacepad.conversation_members),
    'messages', (select count(*) from peacepad.messages),
    'events', (select count(*) from peacepad.events)
  ),
  'missingRequiredColumns', coalesce((
    select jsonb_agg(table_name || '.' || column_name order by table_name, column_name)
    from missing_columns
  ), '[]'::jsonb),
  'eventsPartnershipScopeAvailable', exists (
    select 1 from source_columns where table_name = 'events' and column_name = 'partnership_id'
  ),
  'migrationScopes', jsonb_build_object(
    'users', exists (select 1 from source_columns where table_name = 'users'),
    'partnerships', exists (select 1 from source_columns where table_name = 'partnerships'),
    'participants', exists (select 1 from source_columns where table_name in ('conversation_members', 'partnership_members')),
    'conversations', exists (select 1 from source_columns where table_name = 'conversations'),
    'messages', exists (select 1 from source_columns where table_name = 'messages'),
    'calendar', exists (select 1 from source_columns where table_name in ('events', 'calendar_events')),
    'records', exists (select 1 from source_columns where table_name in ('records', 'case_binders')),
    'attachments', exists (select 1 from source_columns where table_name in ('attachments', 'record_attachments')),
    'tasks', exists (select 1 from source_columns where table_name = 'tasks'),
    'expenses', exists (select 1 from source_columns where table_name = 'expenses')
  ),
  'availableOptionalTables', coalesce((
    select jsonb_agg(distinct table_name order by table_name)
    from source_columns
    where table_name in ('calendar_events', 'records', 'case_binders', 'attachments', 'record_attachments', 'tasks', 'expenses')
  ), '[]'::jsonb),
  'sourceSchemaFingerprint', (select value from source_fingerprint),
  'containsUserContent', false
)::text;
\o

rollback;
