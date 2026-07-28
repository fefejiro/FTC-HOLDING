ALTER TABLE product_job_matches
  ADD COLUMN IF NOT EXISTS description_text text;

ALTER TABLE product_connector_capabilities
  ADD COLUMN IF NOT EXISTS account_identifier text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocking_reason text;

CREATE TABLE IF NOT EXISTS product_job_insights (
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  job_match_id uuid NOT NULL REFERENCES product_job_matches(id) ON DELETE CASCADE,
  match_explanation jsonb NOT NULL,
  ats_gap_report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_match_id)
);

CREATE TABLE IF NOT EXISTS product_interview_prep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  job_match_id uuid NOT NULL REFERENCES product_job_matches(id) ON DELETE CASCADE,
  application_id uuid REFERENCES product_applications(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'in_progress', 'completed')),
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rehearsal jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_outcome_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES product_applications(id) ON DELETE CASCADE,
  outcome_type text NOT NULL
    CHECK (outcome_type IN (
      'recruiter_reply', 'screening', 'interview',
      'offer', 'rejection', 'withdrawal'
    )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_interview_prep_user_idx
  ON product_interview_prep_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS product_outcome_events_user_idx
  ON product_outcome_events(user_id, occurred_at DESC);

ALTER TABLE product_job_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_job_insights FORCE ROW LEVEL SECURITY;
ALTER TABLE product_interview_prep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_interview_prep_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE product_outcome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_outcome_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_job_insights_tenant_policy ON product_job_insights;
CREATE POLICY product_job_insights_tenant_policy ON product_job_insights
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_interview_prep_sessions_tenant_policy
  ON product_interview_prep_sessions;
CREATE POLICY product_interview_prep_sessions_tenant_policy
  ON product_interview_prep_sessions
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS product_outcome_events_tenant_policy ON product_outcome_events;
CREATE POLICY product_outcome_events_tenant_policy ON product_outcome_events
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
