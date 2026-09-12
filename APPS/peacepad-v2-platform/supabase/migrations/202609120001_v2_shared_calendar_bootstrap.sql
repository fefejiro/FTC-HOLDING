-- Every accepted direct co-parent conversation gets shared default calendars.
-- Existing private calendars and events remain private; this creates distinct
-- shared layers rather than widening prior visibility.

create unique index if not exists calendar_layer_shared_default_unique_idx
  on peacepad_v2.calendar_layer (family_id, name)
  where deleted_at is null
    and visibility->>'scope' = 'family'
    and name in ('Parenting Time', 'Expenses & Requests', 'Events & Activities', 'Calls');

create or replace function peacepad_v2.ensure_shared_default_calendars()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if new.status = 'active' and cardinality(new.participant_identity_ids) = 2 then
    insert into peacepad_v2.calendar_layer (
      calendar_layer_id, family_id, region, owner_identity_id,
      name, kind, icon, color_token, visibility
    )
    select gen_random_uuid(), new.family_id, new.region, new.created_by,
      defaults.name, defaults.kind, defaults.icon, defaults.color_token,
      jsonb_build_object('scope', 'family')
    from (values
      ('Parenting Time', 'parenting-time', 'clock', 'teal'),
      ('Expenses & Requests', 'expenses-requests', 'receipt', 'green'),
      ('Events & Activities', 'events-activities', 'activity', 'violet'),
      ('Calls', 'calls', 'phone', 'blue')
    ) as defaults(name, kind, icon, color_token)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_shared_default_calendars on peacepad_v2.conversation;
create trigger conversation_shared_default_calendars
after insert or update of status on peacepad_v2.conversation
for each row execute function peacepad_v2.ensure_shared_default_calendars();

insert into peacepad_v2.calendar_layer (
  calendar_layer_id, family_id, region, owner_identity_id,
  name, kind, icon, color_token, visibility
)
select gen_random_uuid(), conversation_row.family_id, conversation_row.region, conversation_row.created_by,
  defaults.name, defaults.kind, defaults.icon, defaults.color_token,
  jsonb_build_object('scope', 'family')
from peacepad_v2.conversation conversation_row
cross join (values
  ('Parenting Time', 'parenting-time', 'clock', 'teal'),
  ('Expenses & Requests', 'expenses-requests', 'receipt', 'green'),
  ('Events & Activities', 'events-activities', 'activity', 'violet'),
  ('Calls', 'calls', 'phone', 'blue')
) as defaults(name, kind, icon, color_token)
where conversation_row.status = 'active'
  and cardinality(conversation_row.participant_identity_ids) = 2
on conflict do nothing;

revoke all on function peacepad_v2.ensure_shared_default_calendars() from public, anon, authenticated;
