-- Persist a concise explanation when a parent disputes an expense settlement.
-- This is additive: existing pending/confirmed rows remain valid, while the
-- database and Edge function both reject empty or oversized dispute notes.

alter table peacepad_v2.expense_settlement
  add column if not exists resolution_note text;

alter table peacepad_v2.expense_settlement
  drop constraint if exists expense_settlement_resolution_note_valid;

alter table peacepad_v2.expense_settlement
  add constraint expense_settlement_resolution_note_valid check (
    (status = 'disputed' and resolution_note is not null and char_length(resolution_note) between 3 and 500)
    or (status <> 'disputed' and resolution_note is null)
  );

create or replace function peacepad_v2.settlement_json(r peacepad_v2.expense_settlement)
returns jsonb language sql stable set search_path = pg_catalog, peacepad_v2 as $$
 select jsonb_build_object(
  'id',r.settlement_id,'familyCircleId',r.family_id,'expenseId',r.expense_id,
  'requestedByIdentityId',r.requested_by,'requestedFromIdentityId',r.requested_from,
  'amountMinor',r.amount_minor,'currency',r.currency,'status',r.status,
  'requestedAt',r.requested_at,'resolvedAt',r.resolved_at,
  'resolutionNote',r.resolution_note,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.requested_at,'createdBy',jsonb_build_object('identityId',r.requested_by,'sessionId',null),'source','app')
 );
$$;

create or replace function public.peacepad_v2_resolve_expense_settlement(
  p_identity_id uuid,
  p_region text,
  p_settlement_id uuid,
  p_resolution text,
  p_resolution_note text,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  prior jsonb;
  response jsonb;
  settlement_r peacepad_v2.expense_settlement%rowtype;
  normalized_note text := nullif(trim(p_resolution_note), '');
begin
  prior := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if prior is not null then return prior; end if;
  if p_schema_version <> 2 then
    raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH';
  end if;
  if p_resolution not in ('confirmed', 'disputed', 'cancelled') then
    raise exception using errcode = '22023', message = 'SETTLEMENT_RESOLUTION_INVALID';
  end if;
  if p_resolution = 'disputed' and (normalized_note is null or char_length(normalized_note) not between 3 and 500) then
    raise exception using errcode = '22023', message = 'SETTLEMENT_RESOLUTION_NOTE_INVALID';
  end if;
  if p_resolution in ('confirmed', 'cancelled') and normalized_note is not null then
    raise exception using errcode = '22023', message = 'SETTLEMENT_RESOLUTION_NOTE_INVALID';
  end if;

  select * into settlement_r
    from peacepad_v2.expense_settlement
    where settlement_id = p_settlement_id
      and region = p_region
      and ((p_resolution in ('confirmed', 'disputed') and requested_from = p_identity_id)
        or (p_resolution = 'cancelled' and requested_by = p_identity_id))
    for update;
  if not found or not peacepad_v2.parent_core_access(p_identity_id, settlement_r.family_id, p_region) then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED';
  end if;
  if settlement_r.status <> 'pending' or settlement_r.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
  end if;

  update peacepad_v2.expense_settlement
    set status = p_resolution,
        resolution_note = case when p_resolution = 'disputed' then normalized_note else null end,
        resolved_at = now(),
        version = version + 1
    where settlement_id = p_settlement_id
    returning * into settlement_r;

  update peacepad_v2.family_expense
    set status = case settlement_r.status when 'confirmed' then 'settled' when 'disputed' then 'disputed' else 'open' end,
        updated_at = now(),
        version = version + 1
    where expense_id = settlement_r.expense_id;

  response := peacepad_v2.settlement_json(settlement_r);
  perform peacepad_v2.record_write(
    p_identity_id, settlement_r.family_id, p_region, 'settlement.resolve',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

revoke all on function public.peacepad_v2_resolve_expense_settlement(uuid,text,uuid,text,text,integer,text,integer)
  from public, anon, authenticated;
grant execute on function public.peacepad_v2_resolve_expense_settlement(uuid,text,uuid,text,text,integer,text,integer)
  to service_role;
