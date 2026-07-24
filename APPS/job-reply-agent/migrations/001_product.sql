CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'onboarding'
    CHECK (status IN ('onboarding', 'active', 'paused', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_sessions_user_id_idx ON product_sessions(user_id);
CREATE INDEX IF NOT EXISTS product_sessions_expiry_idx ON product_sessions(expires_at);

CREATE TABLE IF NOT EXISTS product_onboarding (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  record jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed boolean NOT NULL DEFAULT false,
  consent_version text,
  consented_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account text,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'pending', 'connected', 'revoked', 'error')),
  secret_reference text,
  connected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS product_audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES product_users(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES product_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_audit_user_created_idx
  ON product_audit_logs(user_id, created_at DESC);

ALTER TABLE product_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_onboarding FORCE ROW LEVEL SECURITY;
ALTER TABLE product_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE product_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_onboarding_tenant_policy ON product_onboarding;
CREATE POLICY product_onboarding_tenant_policy ON product_onboarding
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_connections_tenant_policy ON product_connections;
CREATE POLICY product_connections_tenant_policy ON product_connections
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_audit_tenant_policy ON product_audit_logs;
CREATE POLICY product_audit_tenant_policy ON product_audit_logs
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
