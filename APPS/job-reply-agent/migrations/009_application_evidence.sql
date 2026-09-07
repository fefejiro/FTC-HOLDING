CREATE TABLE IF NOT EXISTS product_application_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES product_applications(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'confirmation_page', 'confirmation_email', 'applied_history', 'legacy_screenshot'
  )),
  storage_key text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN (
    'image/png', 'image/jpeg', 'application/pdf', 'message/rfc822', 'application/json'
  )),
  filename text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, application_id, sha256)
);

CREATE INDEX IF NOT EXISTS product_application_evidence_application_idx
  ON product_application_evidence(user_id, application_id, captured_at DESC);

ALTER TABLE product_application_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_application_evidence FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_application_evidence_tenant_policy
  ON product_application_evidence;
CREATE POLICY product_application_evidence_tenant_policy
  ON product_application_evidence
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
