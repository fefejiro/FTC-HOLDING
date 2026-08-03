CREATE TABLE IF NOT EXISTS product_job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  job_url text NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'recommended'
    CHECK (status IN ('recommended', 'rejected', 'package_ready', 'needs_approval')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS product_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  job_match_id uuid REFERENCES product_job_matches(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  job_match_id uuid NOT NULL REFERENCES product_job_matches(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES product_resumes(id) ON DELETE SET NULL,
  status text NOT NULL
    CHECK (status IN (
      'discovered', 'rejected_by_policy', 'package_ready', 'needs_approval',
      'manual_gate', 'submission_attempted', 'submitted_unverified',
      'submitted_verified', 'failed', 'withdrawn'
    )),
  final_url text,
  evidence_reference text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_match_id)
);

CREATE INDEX IF NOT EXISTS product_job_matches_user_score_idx
  ON product_job_matches(user_id, score DESC, discovered_at DESC);
CREATE INDEX IF NOT EXISTS product_approvals_user_status_idx
  ON product_approval_requests(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_applications_user_status_idx
  ON product_applications(user_id, status, updated_at DESC);

ALTER TABLE product_job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_job_matches FORCE ROW LEVEL SECURITY;
ALTER TABLE product_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_approval_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_job_matches_tenant_policy ON product_job_matches;
CREATE POLICY product_job_matches_tenant_policy ON product_job_matches
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_approval_requests_tenant_policy ON product_approval_requests;
CREATE POLICY product_approval_requests_tenant_policy ON product_approval_requests
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_applications_tenant_policy ON product_applications;
CREATE POLICY product_applications_tenant_policy ON product_applications
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
