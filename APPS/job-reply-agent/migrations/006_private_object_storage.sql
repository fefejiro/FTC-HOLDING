ALTER TABLE product_resumes
  ADD COLUMN IF NOT EXISTS storage_key text,
  ADD COLUMN IF NOT EXISTS storage_driver text
    CHECK (storage_driver IS NULL OR storage_driver IN ('local', 's3'));

ALTER TABLE product_resumes
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE product_resumes
  DROP CONSTRAINT IF EXISTS product_resumes_content_or_storage_check;

ALTER TABLE product_resumes
  ADD CONSTRAINT product_resumes_content_or_storage_check
  CHECK (content IS NOT NULL OR storage_key IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS product_resumes_storage_key_idx
  ON product_resumes(storage_key)
  WHERE storage_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_object_deletions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  storage_driver text NOT NULL CHECK (storage_driver IN ('local', 's3')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS product_object_deletions_pending_idx
  ON product_object_deletions(status, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE product_object_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_object_deletions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_object_deletions_tenant_policy ON product_object_deletions;
CREATE POLICY product_object_deletions_tenant_policy ON product_object_deletions
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
