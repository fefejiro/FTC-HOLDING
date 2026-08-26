-- Privacy-safe account export preparation. This returns an aggregate manifest
-- only; private message bodies, filenames, object paths, tokens, and auth
-- material never leave the server. A later signed bundle job can consume the
-- manifest without changing this authorization boundary.

create or replace function public.peacepad_v2_prepare_account_export(
  p_identity_id uuid,
  p_region text,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  identity_row peacepad_v2.identity%rowtype;
  existing_result jsonb;
  response jsonb;
  family_count integer;
  conversation_count integer;
  message_count integer;
  calendar_count integer;
  record_count integer;
  attachment_count integer;
  task_count integer;
  expense_count integer;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_region not in ('ca', 'us') then raise exception using errcode = '22023', message = 'REGION_INVALID'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID'; end if;
  select * into identity_row from peacepad_v2.identity
    where identity_id = p_identity_id and region = p_region for update;
  if not found or identity_row.deleted_at is not null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if identity_row.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  select count(*) into family_count from peacepad_v2.participant_grant
    where identity_id = p_identity_id and region = p_region and revoked_at is null;
  select count(*) into conversation_count from peacepad_v2.conversation
    where region = p_region and p_identity_id = any(participant_identity_ids);
  select count(*) into message_count from peacepad_v2.message_event
    where region = p_region and actor_identity_id = p_identity_id;
  select count(*) into calendar_count from peacepad_v2.schedule_event event
    where event.region = p_region and exists (
      select 1 from peacepad_v2.participant_grant grant_row
      where grant_row.family_id = event.family_id and grant_row.identity_id = p_identity_id
        and grant_row.region = p_region and grant_row.revoked_at is null
    );
  select count(*) into record_count from peacepad_v2.case_binder
    where owner_identity_id = p_identity_id and region = p_region;
  select count(*) into attachment_count from peacepad_v2.private_attachment
    where owner_identity_id = p_identity_id and region = p_region;
  select count(*) into task_count from peacepad_v2.legacy_task_archive
    where (created_by_identity_id = p_identity_id or assigned_to_identity_id = p_identity_id) and region = p_region;
  select count(*) into expense_count from peacepad_v2.legacy_expense_archive
    where paid_by_identity_id = p_identity_id and region = p_region;

  response := jsonb_build_object(
    'identityId', p_identity_id,
    'region', p_region,
    'schemaVersion', '2.0',
    'generatedAt', now(),
    'contentIncluded', false,
    'status', 'manifest-ready',
    'counts', jsonb_build_object(
      'families', family_count,
      'conversations', conversation_count,
      'messageEvents', message_count,
      'calendarEvents', calendar_count,
      'privateRecords', record_count,
      'privateAttachments', attachment_count,
      'legacyTasks', task_count,
      'legacyExpenses', expense_count
    )
  );
  perform peacepad_v2.record_write(p_identity_id, null, p_region, 'account.exported', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

revoke all on function public.peacepad_v2_prepare_account_export(uuid,text,integer,text,integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_prepare_account_export(uuid,text,integer,text,integer) to service_role;
