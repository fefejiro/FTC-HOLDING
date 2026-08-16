CREATE TABLE IF NOT EXISTS product_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  content bytea NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sha256)
);

CREATE INDEX IF NOT EXISTS product_resumes_user_created_idx
  ON product_resumes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS product_career_truth_banks (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_resumes FORCE ROW LEVEL SECURITY;
ALTER TABLE product_career_truth_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_career_truth_banks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_resumes_tenant_policy ON product_resumes;
CREATE POLICY product_resumes_tenant_policy ON product_resumes
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_career_truth_banks_tenant_policy ON product_career_truth_banks;
CREATE POLICY product_career_truth_banks_tenant_policy ON product_career_truth_banks
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
