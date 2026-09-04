-- Product-scoped package records bridge fit analysis to a reviewable,
-- entitlement-metered customer output. The legacy SaaS package tables use a
-- different job graph and are intentionally not reused here.
CREATE TABLE IF NOT EXISTS product_application_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  job_match_id uuid NOT NULL REFERENCES product_job_matches(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES product_resumes(id) ON DELETE SET NULL,
  source_resume_version text NOT NULL,
  status text NOT NULL DEFAULT 'package_generating'
    CHECK (status IN ('package_generating', 'package_ready', 'approval_required', 'approved', 'rejected', 'blocked')),
  customer_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_fact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_information_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_match_id)
);

CREATE INDEX IF NOT EXISTS product_application_packages_user_idx
  ON product_application_packages(user_id, updated_at DESC);

ALTER TABLE product_application_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_application_packages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_application_packages_tenant_policy ON product_application_packages;
CREATE POLICY product_application_packages_tenant_policy ON product_application_packages
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE product_funnel_events DROP CONSTRAINT IF EXISTS product_funnel_events_event_name_check;
ALTER TABLE product_funnel_events ADD CONSTRAINT product_funnel_events_event_name_check CHECK (event_name IN (
  'signup', 'registration_started', 'email_verified', 'registration_verified',
  'onboarding_started', 'onboarding_step_saved', 'onboarding_step_completed',
  'onboarding_completed', 'first_fit_analysis', 'first_value',
  'first_value_reached', 'first_package_created', 'paywall_viewed',
  'checkout_started', 'checkout_completed', 'subscription_activated',
  'subscription_canceled', 'subscription_cancelled', 'account_deleted',
  'resume_uploaded', 'career_facts_reviewed', 'recommendation_rejected'
));
