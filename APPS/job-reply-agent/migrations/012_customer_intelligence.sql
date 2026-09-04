-- Customer intelligence is normalized: one reviewable fact per row. This
-- branch has no deployment receipt for migration 012, so the earlier JSON
-- proposal draft is replaced rather than carried as a second model.
CREATE TABLE IF NOT EXISTS product_resume_fact_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  resume_id uuid NOT NULL REFERENCES product_resumes(id) ON DELETE CASCADE,
  resume_document_id uuid REFERENCES resume_documents(id) ON DELETE SET NULL,
  resume_version_id uuid REFERENCES resume_versions(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (length(trim(category)) BETWEEN 2 AND 80),
  statement text NOT NULL CHECK (length(trim(statement)) BETWEEN 3 AND 1000),
  original_statement text NOT NULL CHECK (length(trim(original_statement)) BETWEEN 3 AND 1000),
  source_location text NOT NULL,
  extraction_method text NOT NULL,
  provenance_state text NOT NULL DEFAULT 'proposed'
    CHECK (provenance_state IN ('proposed', 'customer_edited', 'customer_confirmed')),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'rejected', 'superseded')),
  supersedes_id uuid REFERENCES product_resume_fact_proposals(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES product_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_resume_fact_proposals_user_idx
  ON product_resume_fact_proposals(user_id, updated_at DESC);

ALTER TABLE product_resume_fact_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_resume_fact_proposals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_resume_fact_proposals_tenant_policy ON product_resume_fact_proposals;
CREATE POLICY product_resume_fact_proposals_tenant_policy ON product_resume_fact_proposals
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS product_recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  job_match_id uuid NOT NULL REFERENCES product_job_matches(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN (
    'company', 'location', 'salary', 'title', 'seniority', 'industry',
    'skills', 'work_arrangement', 'authorization', 'already_applied',
    'not_interested', 'other'
  )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_match_id)
);

CREATE INDEX IF NOT EXISTS product_recommendation_feedback_user_idx
  ON product_recommendation_feedback(user_id, created_at DESC);

ALTER TABLE product_recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendation_feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_recommendation_feedback_tenant_policy ON product_recommendation_feedback;
CREATE POLICY product_recommendation_feedback_tenant_policy ON product_recommendation_feedback
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE product_funnel_events DROP CONSTRAINT IF EXISTS product_funnel_events_event_name_check;
ALTER TABLE product_funnel_events ADD CONSTRAINT product_funnel_events_event_name_check CHECK (event_name IN (
  'signup', 'email_verified', 'onboarding_completed', 'first_value',
  'checkout_started', 'checkout_completed', 'subscription_activated',
  'subscription_canceled', 'account_deleted', 'onboarding_step_saved',
  'resume_uploaded', 'career_facts_reviewed', 'recommendation_rejected'
));
