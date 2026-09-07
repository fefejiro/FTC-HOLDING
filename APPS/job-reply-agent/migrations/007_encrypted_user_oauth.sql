CREATE TABLE IF NOT EXISTS product_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gmail')),
  state_hash text NOT NULL UNIQUE CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  encrypted_code_verifier text NOT NULL,
  key_version text NOT NULL,
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_oauth_states_user_expiry_idx
  ON product_oauth_states(user_id, expires_at);

CREATE TABLE IF NOT EXISTS product_connection_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES product_connections(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gmail')),
  encrypted_payload text NOT NULL,
  key_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connection_id),
  UNIQUE (user_id, provider)
);

ALTER TABLE product_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_oauth_states FORCE ROW LEVEL SECURITY;
ALTER TABLE product_connection_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_connection_secrets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_oauth_states_tenant_policy ON product_oauth_states;
CREATE POLICY product_oauth_states_tenant_policy ON product_oauth_states
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_connection_secrets_tenant_policy ON product_connection_secrets;
CREATE POLICY product_connection_secrets_tenant_policy ON product_connection_secrets
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
