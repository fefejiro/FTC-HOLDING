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

REVOKE ALL ON SCHEMA peacepad_native_staging FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA peacepad_native_staging FROM PUBLIC;

COMMIT;
