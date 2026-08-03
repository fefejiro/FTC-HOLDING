ALTER TABLE product_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'candidate',
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encrypted_mfa_secret text,
  ADD COLUMN IF NOT EXISTS mfa_key_version text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_users_role_check'
  ) THEN
    ALTER TABLE product_users
      ADD CONSTRAINT product_users_role_check
      CHECK (role IN ('candidate', 'operator', 'admin'));
  END IF;
END
$$;

ALTER TABLE product_sessions
  ADD COLUMN IF NOT EXISTS csrf_hash text,
  ADD COLUMN IF NOT EXISTS rotated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS product_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(email)),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  role text NOT NULL DEFAULT 'candidate'
    CHECK (role IN ('candidate', 'operator', 'admin')),
  expires_at timestamptz NOT NULL,
  used_by uuid REFERENCES product_users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_by uuid REFERENCES product_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_invitations_email_expiry_idx
  ON product_invitations(email, expires_at DESC);

CREATE TABLE IF NOT EXISTS product_email_verification_tokens (
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, token_hash)
);

CREATE TABLE IF NOT EXISTS product_password_reset_tokens (
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, token_hash)
);

CREATE TABLE IF NOT EXISTS product_auth_attempts (
  attempt_key text PRIMARY KEY CHECK (attempt_key ~ '^[a-f0-9]{64}$'),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  blocked_until timestamptz,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_consent_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN (
    'career_truth', 'recruiter_drafts', 'recruiter_sends',
    'assisted_applications', 'controlled_submissions', 'google_data'
  )),
  granted boolean NOT NULL,
  policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_consent_grants_user_type_idx
  ON product_consent_grants(user_id, consent_type, created_at DESC);

CREATE TABLE IF NOT EXISTS product_automation_policies (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'approval_required'
    CHECK (mode IN ('assist', 'approval_required', 'controlled_autopilot')),
  recruiter_drafts boolean NOT NULL DEFAULT true,
  recruiter_sends boolean NOT NULL DEFAULT false,
  assisted_applications boolean NOT NULL DEFAULT true,
  controlled_submissions boolean NOT NULL DEFAULT false,
  max_drafts_per_day integer NOT NULL DEFAULT 50
    CHECK (max_drafts_per_day BETWEEN 0 AND 50),
  max_recruiter_sends_per_day integer NOT NULL DEFAULT 10
    CHECK (max_recruiter_sends_per_day BETWEEN 0 AND 10),
  max_applications_per_day integer NOT NULL DEFAULT 10
    CHECK (max_applications_per_day BETWEEN 0 AND 10),
  max_applications_per_board integer NOT NULL DEFAULT 5
    CHECK (max_applications_per_board BETWEEN 0 AND 5),
  quiet_hours_start smallint NOT NULL DEFAULT 23
    CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end smallint NOT NULL DEFAULT 7
    CHECK (quiet_hours_end BETWEEN 0 AND 23),
  time_zone text NOT NULL DEFAULT 'UTC',
  policy_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_connector_capabilities (
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('gmail', 'linkedin', 'indeed', 'dice', 'monster')),
  status text NOT NULL DEFAULT 'disabled'
    CHECK (status IN (
      'certified_live', 'pilot_only', 'manual_only',
      'blocked_auth', 'blocked_proof', 'disabled'
    )),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_reference text,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, source)
);

CREATE TABLE IF NOT EXISTS product_inbound_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  alias text NOT NULL UNIQUE CHECK (alias = lower(alias)),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS product_inbound_routes (
  alias text PRIMARY KEY CHECK (alias = lower(alias)),
  alias_id uuid NOT NULL REFERENCES product_inbound_aliases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  inbound_alias_id uuid NOT NULL REFERENCES product_inbound_aliases(id) ON DELETE CASCADE,
  provider_message_id text NOT NULL,
  sender_address text,
  subject_redacted text,
  raw_storage_key text,
  classification_status text NOT NULL DEFAULT 'queued'
    CHECK (classification_status IN (
      'queued', 'classified', 'needs_review', 'rejected', 'expired'
    )),
  received_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_message_id)
);

CREATE TABLE IF NOT EXISTS product_runner_enrollment_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_runner_enrollment_credentials (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  token_id uuid NOT NULL REFERENCES product_runner_enrollment_tokens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_runner_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked')),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS product_runner_credentials (
  device_id uuid PRIMARY KEY REFERENCES product_runner_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  encrypted_secret text NOT NULL,
  key_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_runner_nonces (
  device_id uuid NOT NULL REFERENCES product_runner_devices(id) ON DELETE CASCADE,
  nonce_hash text NOT NULL CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, nonce_hash)
);

CREATE TABLE IF NOT EXISTS product_runner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES product_runner_devices(id) ON DELETE SET NULL,
  application_id uuid REFERENCES product_applications(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('linkedin', 'indeed', 'dice', 'monster')),
  action text NOT NULL CHECK (action IN (
    'auth_check', 'discover', 'prepare', 'assist_submit', 'verify_proof'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'leased', 'completed', 'manual_gate', 'failed', 'expired', 'cancelled'
    )),
  proof_required boolean NOT NULL DEFAULT true,
  lease_token_hash text,
  leased_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_runner_tasks_queue_idx
  ON product_runner_tasks(user_id, status, created_at)
  WHERE status IN ('queued', 'leased');

CREATE UNIQUE INDEX IF NOT EXISTS product_runner_tasks_active_application_idx
  ON product_runner_tasks(user_id, application_id, action)
  WHERE application_id IS NOT NULL AND status IN ('queued', 'leased');

CREATE TABLE IF NOT EXISTS product_runner_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES product_runner_tasks(id) ON DELETE CASCADE,
  application_id uuid REFERENCES product_applications(id) ON DELETE SET NULL,
  result_status text NOT NULL CHECK (result_status IN (
    'submitted_verified', 'submitted_unverified', 'manual_gate',
    'blocked_auth', 'blocked_proof', 'failed'
  )),
  final_url text,
  evidence_reference text,
  evidence_storage_key text,
  evidence_mime_type text,
  evidence_filename text,
  redacted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

ALTER TABLE product_runner_proofs
  ADD COLUMN IF NOT EXISTS evidence_storage_key text,
  ADD COLUMN IF NOT EXISTS evidence_mime_type text,
  ADD COLUMN IF NOT EXISTS evidence_filename text;

CREATE TABLE IF NOT EXISTS product_daily_action_counters (
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  action_date date NOT NULL,
  source text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'draft', 'recruiter_send', 'application'
  )),
  action_count integer NOT NULL DEFAULT 0 CHECK (action_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_date, source, action_type)
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'product_consent_grants', 'product_automation_policies',
    'product_connector_capabilities', 'product_inbound_aliases',
    'product_inbound_messages', 'product_runner_enrollment_tokens',
    'product_runner_devices', 'product_runner_tasks',
    'product_runner_proofs', 'product_daily_action_counters'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_policy ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_policy ON %I USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id())',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE product_runner_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_runner_nonces FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_runner_nonces_tenant_policy ON product_runner_nonces;
CREATE POLICY product_runner_nonces_tenant_policy ON product_runner_nonces
  USING (
    EXISTS (
      SELECT 1
        FROM product_runner_devices d
       WHERE d.id = device_id AND d.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM product_runner_devices d
       WHERE d.id = device_id AND d.user_id = app_current_user_id()
    )
  );
