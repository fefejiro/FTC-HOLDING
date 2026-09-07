CREATE TABLE IF NOT EXISTS product_idempotency_keys (
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  method text NOT NULL,
  request_path text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS product_idempotency_expiry_idx
  ON product_idempotency_keys(expires_at);

ALTER TABLE product_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_idempotency_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_idempotency_tenant_policy ON product_idempotency_keys;
CREATE POLICY product_idempotency_tenant_policy ON product_idempotency_keys
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
