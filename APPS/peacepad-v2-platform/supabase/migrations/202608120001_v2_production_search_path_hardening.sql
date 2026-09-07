-- Pin helper-function resolution for the production database baseline.
-- These functions are invoked by triggers or constraints, so they must not
-- inherit a caller-controlled search_path.

alter function peacepad_v2.prevent_audit_mutation()
  set search_path = pg_catalog, peacepad_v2;

alter function peacepad_v2.prevent_consent_mutation()
  set search_path = pg_catalog, peacepad_v2;

alter function peacepad_v2.recurrence_valid(jsonb)
  set search_path = pg_catalog, peacepad_v2;

alter function peacepad_v2.prevent_message_mutation()
  set search_path = pg_catalog, peacepad_v2;

alter function peacepad_v2.message_check_json(uuid, uuid, text, text, boolean, timestamptz, integer)
  set search_path = pg_catalog, peacepad_v2;
