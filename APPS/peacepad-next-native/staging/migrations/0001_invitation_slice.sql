BEGIN;

CREATE SCHEMA IF NOT EXISTS peacepad_native_staging;

CREATE TABLE IF NOT EXISTS peacepad_native_staging.invitations (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  version integer NOT NULL CHECK (version > 0),
  code_hash text NOT NULL UNIQUE,
  invitation jsonb NOT NULL,
  inviter_display_name text NOT NULL,
  family_display_name text NOT NULL,
  family_circle_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked', 'used')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (invitation ? 'code')),
  CHECK (NOT (invitation ? 'deepLink'))
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.participant_grants (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  family_circle_id text NOT NULL,
  identity_id text NOT NULL,
  grant_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.calendar_layers (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  version integer NOT NULL CHECK (version > 0),
  family_circle_id text NOT NULL,
  owner_identity_id text NOT NULL,
  visibility_scope text NOT NULL CHECK (visibility_scope IN ('private', 'family', 'selected')),
  layer_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_circle_id),
  CHECK ((layer_record ->> 'id') = id),
  CHECK ((layer_record ->> 'region') = region),
  CHECK ((layer_record ->> 'version')::integer = version),
  CHECK ((layer_record ->> 'familyCircleId') = family_circle_id),
  CHECK ((layer_record ->> 'ownerIdentityId') = owner_identity_id)
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.schedule_events (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  version integer NOT NULL CHECK (version > 0),
  family_circle_id text NOT NULL,
  calendar_layer_id text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('planned', 'requested', 'accepted', 'declined', 'cancelled')),
  event_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (calendar_layer_id, family_circle_id)
    REFERENCES peacepad_native_staging.calendar_layers(id, family_circle_id)
    ON DELETE CASCADE,
  CHECK (ends_at > starts_at),
  CHECK ((event_record ->> 'id') = id),
  CHECK ((event_record ->> 'region') = region),
  CHECK ((event_record ->> 'version')::integer = version),
  CHECK ((event_record ->> 'familyCircleId') = family_circle_id),
  CHECK ((event_record ->> 'calendarLayerId') = calendar_layer_id)
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.conversations (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  version integer NOT NULL CHECK (version > 0),
  family_circle_id text NOT NULL,
  participant_identity_ids jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  conversation_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_circle_id),
  CHECK (jsonb_typeof(participant_identity_ids) = 'array'),
  CHECK (jsonb_array_length(participant_identity_ids) >= 2),
  CHECK ((conversation_record ->> 'id') = id),
  CHECK ((conversation_record ->> 'region') = region),
  CHECK ((conversation_record ->> 'familyCircleId') = family_circle_id)
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.message_events (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  version integer NOT NULL CHECK (version = 1),
  family_circle_id text NOT NULL,
  conversation_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'delivered', 'viewed', 'correction')),
  occurred_at timestamptz NOT NULL,
  message_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (conversation_id, family_circle_id)
    REFERENCES peacepad_native_staging.conversations(id, family_circle_id),
  CHECK ((message_record ->> 'id') = id),
  CHECK ((message_record ->> 'region') = region),
  CHECK ((message_record ->> 'familyCircleId') = family_circle_id),
  CHECK ((message_record ->> 'conversationId') = conversation_id)
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.message_check_preferences (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  version integer NOT NULL CHECK (version > 0),
  identity_id text NOT NULL,
  conversation_id text NOT NULL REFERENCES peacepad_native_staging.conversations(id),
  preference_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_id, conversation_id),
  CHECK ((preference_record ->> 'id') = id),
  CHECK ((preference_record ->> 'region') = region),
  CHECK ((preference_record ->> 'identityId') = identity_id),
  CHECK ((preference_record ->> 'conversationId') = conversation_id),
  CHECK ((preference_record ->> 'aiAssistanceEnabled')::boolean = false)
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.idempotency_receipts (
  operation_hash text PRIMARY KEY,
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.invitation_resolution_claims (
  subject_hash text NOT NULL,
  invitation_id text NOT NULL REFERENCES peacepad_native_staging.invitations(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_hash, invitation_id)
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.audit_events (
  id text PRIMARY KEY,
  region text NOT NULL CHECK (region IN ('ca', 'us')),
  sequence bigint NOT NULL UNIQUE CHECK (sequence > 0),
  event_hash text NOT NULL UNIQUE,
  previous_event_hash text,
  event jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_previous_hash_fk
    FOREIGN KEY (previous_event_hash)
    REFERENCES peacepad_native_staging.audit_events(event_hash)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS peacepad_native_staging.rate_limits (
  scope text NOT NULL CHECK (scope IN ('create', 'resolve')),
  subject_hash text NOT NULL,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (scope, subject_hash)
);

CREATE INDEX IF NOT EXISTS invitations_family_status_idx
  ON peacepad_native_staging.invitations (family_circle_id, status);

CREATE INDEX IF NOT EXISTS invitations_expiry_idx
  ON peacepad_native_staging.invitations (expires_at);

CREATE INDEX IF NOT EXISTS invitation_resolution_claims_expiry_idx
  ON peacepad_native_staging.invitation_resolution_claims (expires_at);

CREATE INDEX IF NOT EXISTS calendar_layers_family_idx
  ON peacepad_native_staging.calendar_layers (family_circle_id, created_at);

CREATE INDEX IF NOT EXISTS schedule_events_family_time_idx
  ON peacepad_native_staging.schedule_events (family_circle_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS conversations_family_idx
  ON peacepad_native_staging.conversations (family_circle_id, created_at);

CREATE INDEX IF NOT EXISTS message_events_conversation_time_idx
  ON peacepad_native_staging.message_events (conversation_id, occurred_at, id);

REVOKE ALL ON SCHEMA peacepad_native_staging FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA peacepad_native_staging FROM PUBLIC;

COMMIT;
