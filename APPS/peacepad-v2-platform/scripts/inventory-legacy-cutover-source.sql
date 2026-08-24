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
set local search_path = public;

do $$
begin
  if to_regclass('public.users') is null
    or to_regclass('public.partnerships') is null
    or to_regclass('public.conversations') is null
    or to_regclass('public.conversation_members') is null
    or to_regclass('public.messages') is null
    or to_regclass('public.events') is null then
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
  where table_schema = 'public'
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
), user_partnerships as (
  select users.id as user_id,
    users.active_partnership_id,
    count(partnerships.id) as membership_count,
    bool_or(partnerships.id = users.active_partnership_id) as active_matches_membership
  from public.users
  left join public.partnerships
    on partnerships.user1_id = users.id or partnerships.user2_id = users.id
  group by users.id, users.active_partnership_id
), event_scope as (
  select events.id,
    case
      when user_partnerships.user_id is null then 'creator-missing'
      when user_partnerships.active_partnership_id is not null and user_partnerships.active_matches_membership then 'active-partnership'
      when user_partnerships.membership_count = 1 then 'unique-membership'
      when user_partnerships.membership_count = 0 then 'no-partnership'
      else 'ambiguous'
    end as scope_status
  from public.events
  left join user_partnerships on user_partnerships.user_id = events.created_by
), conversation_pairs as (
  select conversations.id,
    count(conversation_members.user_id) as member_count,
    min(conversation_members.user_id) as member_a,
    max(conversation_members.user_id) as member_b
  from public.conversations
  left join public.conversation_members on conversation_members.conversation_id = conversations.id
  group by conversations.id
), conversation_scope as (
  select conversation_pairs.id,
    conversation_pairs.member_count,
    count(partnerships.id) as partnership_matches
  from conversation_pairs
  left join public.partnerships
    on conversation_pairs.member_count = 2
   and (
     (partnerships.user1_id = conversation_pairs.member_a and partnerships.user2_id = conversation_pairs.member_b)
     or (partnerships.user1_id = conversation_pairs.member_b and partnerships.user2_id = conversation_pairs.member_a)
   )
  group by conversation_pairs.id, conversation_pairs.member_count
)
select jsonb_build_object(
  'schemaVersion', 1,
  'mode', 'read-only-source-inventory',
  'sourceSchema', 'public',
  'tableCounts', jsonb_build_object(
    'users', (select count(*) from public.users),
    'partnerships', (select count(*) from public.partnerships),
    'conversations', (select count(*) from public.conversations),
    'conversation_members', (select count(*) from public.conversation_members),
    'messages', (select count(*) from public.messages),
    'events', (select count(*) from public.events)
  ),
  'missingRequiredColumns', coalesce((
    select jsonb_agg(table_name || '.' || column_name order by table_name, column_name)
    from missing_columns
  ), '[]'::jsonb),
  'eventsPartnershipScopeAvailable', exists (
    select 1 from source_columns where table_name = 'events' and column_name = 'partnership_id'
  ),
  'scopeReconciliation', jsonb_build_object(
    'eventsSafelyScoped', (select count(*) from event_scope where scope_status in ('active-partnership', 'unique-membership')),
    'eventsUnscoped', (select count(*) from event_scope where scope_status not in ('active-partnership', 'unique-membership')),
    'conversationsSafelyScoped', (select count(*) from conversation_scope where member_count = 2 and partnership_matches = 1),
    'conversationsUnscoped', (select count(*) from conversation_scope where not (member_count = 2 and partnership_matches = 1)),
    'messagesSafelyScoped', (
      select count(*) from public.messages
      join conversation_scope on conversation_scope.id = messages.conversation_id
      where conversation_scope.member_count = 2 and conversation_scope.partnership_matches = 1
    ),
    'messagesUnscoped', (
      select count(*) from public.messages
      join conversation_scope on conversation_scope.id = messages.conversation_id
      where not (conversation_scope.member_count = 2 and conversation_scope.partnership_matches = 1)
    )
  ),
  'migrationScopes', jsonb_build_object(
    'users', exists (select 1 from source_columns where table_name = 'users'),
    'partnerships', exists (select 1 from source_columns where table_name = 'partnerships'),
    'participants', exists (select 1 from source_columns where table_name in ('conversation_members', 'partnership_members')),
    'conversations', exists (select 1 from source_columns where table_name = 'conversations'),
    'messages', exists (select 1 from source_columns where table_name = 'messages'),
    'calendar', exists (select 1 from source_columns where table_name in ('events', 'calendar_events')),
    'records', exists (select 1 from source_columns where table_name in ('notes', 'child_updates', 'records', 'case_binders')),
    'attachments', exists (
      select 1 from source_columns
      where (table_name = 'messages' and column_name = 'file_url')
         or (table_name = 'expenses' and column_name = 'receipt_url')
         or table_name in ('attachments', 'record_attachments')
    ),
    'tasks', exists (select 1 from source_columns where table_name = 'tasks'),
    'expenses', exists (select 1 from source_columns where table_name = 'expenses')
  ),
  'availableOptionalTables', coalesce((
    select jsonb_agg(distinct table_name order by table_name)
    from source_columns
    where table_name in ('calendar_events', 'notes', 'child_updates', 'records', 'case_binders', 'attachments', 'record_attachments', 'tasks', 'expenses')
  ), '[]'::jsonb),
  'sourceSchemaFingerprint', (select value from source_fingerprint),
  'containsUserContent', false
)::text;
\o

rollback;
