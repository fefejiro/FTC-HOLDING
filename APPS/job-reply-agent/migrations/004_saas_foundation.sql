CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE OR REPLACE FUNCTION app_has_organization_access(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_organization_id IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM organization_members
        WHERE organization_id = target_organization_id
          AND user_id = app_current_user_id()
     )
$$;

GRANT EXECUTE ON FUNCTION app_has_organization_access(uuid) TO PUBLIC;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone_e164 text,
  country_code char(2),
  time_zone text NOT NULL DEFAULT 'UTC',
  locale text NOT NULL DEFAULT 'en',
  document_language text NOT NULL DEFAULT 'en',
  city text,
  region text,
  postal_area text,
  professional_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  currency char(3),
  quiet_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_retention_days integer CHECK (data_retention_days IS NULL OR data_retention_days > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account text,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'pending', 'connected', 'revoked', 'error')),
  encrypted_secret_reference text,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  connected_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  headline text,
  summary text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review_required', 'approved', 'archived')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  employer text NOT NULL,
  job_title text NOT NULL,
  country_code char(2),
  city text,
  started_on date,
  ended_on date,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_on IS NULL OR started_on IS NULL OR ended_on >= started_on)
);

CREATE TABLE IF NOT EXISTS education_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  institution text NOT NULL,
  credential text,
  field_of_study text,
  country_code char(2),
  started_on date,
  completed_on date,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  issued_on date,
  expires_on date,
  credential_id text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  employment_id uuid REFERENCES employment_history(id) ON DELETE SET NULL,
  statement text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  description text,
  started_on date,
  ended_on date,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  years_experience numeric(4,1) CHECK (years_experience IS NULL OR years_experience >= 0),
  proficiency text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (career_profile_id, name)
);

CREATE TABLE IF NOT EXISTS languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  proficiency text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (career_profile_id, language_code)
);

CREATE TABLE IF NOT EXISTS work_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  career_profile_id uuid NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
  country_code char(2) NOT NULL,
  authorization_type text NOT NULL,
  sponsorship_required boolean,
  expires_on date,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'review_required', 'approved', 'rejected')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (career_profile_id, country_code, authorization_type)
);

CREATE TABLE IF NOT EXISTS resume_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sha256)
);

CREATE TABLE IF NOT EXISTS resume_role_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  resume_document_id uuid NOT NULL REFERENCES resume_documents(id) ON DELETE RESTRICT,
  role_family_id uuid REFERENCES resume_role_families(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review_required', 'approved', 'archived')),
  is_default boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES resume_templates(id) ON DELETE SET NULL,
  parent_version_id uuid REFERENCES resume_versions(id) ON DELETE SET NULL,
  document_id uuid NOT NULL REFERENCES resume_documents(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  kind text NOT NULL CHECK (kind IN ('source', 'approved', 'tailored', 'archived')),
  job_posting_id uuid,
  generation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id, version_number)
);

CREATE TABLE IF NOT EXISTS search_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  required_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  industries jsonb NOT NULL DEFAULT '[]'::jsonb,
  countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  work_modes jsonb NOT NULL DEFAULT '[]'::jsonb,
  employment_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  seniority_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  minimum_salary numeric,
  currency char(3),
  work_authorization jsonb NOT NULL DEFAULT '{}'::jsonb,
  sponsorship_requirement text,
  relocation_preference text,
  preferred_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  maximum_recommendations_per_day integer NOT NULL DEFAULT 20 CHECK (maximum_recommendations_per_day > 0),
  maximum_applications_per_day integer NOT NULL DEFAULT 5 CHECK (maximum_applications_per_day > 0),
  approval_mode text NOT NULL DEFAULT 'approval_required'
    CHECK (approval_mode IN ('assist', 'approval_required', 'controlled_autopilot')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES search_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_type text NOT NULL CHECK (title_type IN ('target', 'alternate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, title, title_type)
);

CREATE TABLE IF NOT EXISTS campaign_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES search_campaigns(id) ON DELETE CASCADE,
  country_code char(2),
  city text,
  region text,
  work_mode text CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES search_campaigns(id) ON DELETE CASCADE,
  exclusion_type text NOT NULL CHECK (exclusion_type IN ('title', 'company', 'keyword', 'location')),
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, exclusion_type, value)
);

CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_id text,
  canonical_url text,
  company text NOT NULL,
  title text NOT NULL,
  country_code char(2),
  city text,
  region text,
  work_mode text,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  currency char(3),
  description text NOT NULL,
  description_fingerprint text NOT NULL,
  normalized_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS job_postings_user_source_id_unique
  ON job_postings(user_id, source, source_id) WHERE source_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS job_postings_user_canonical_url_unique
  ON job_postings(user_id, canonical_url) WHERE canonical_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_postings_fingerprint_idx
  ON job_postings(user_id, company, title, description_fingerprint);

ALTER TABLE resume_versions
  DROP CONSTRAINT IF EXISTS resume_versions_job_posting_id_fkey;
ALTER TABLE resume_versions
  ADD CONSTRAINT resume_versions_job_posting_id_fkey
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES search_campaigns(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  explanation jsonb NOT NULL DEFAULT '[]'::jsonb,
  hard_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume_coverage integer CHECK (resume_coverage BETWEEN 0 AND 100),
  application_risk integer CHECK (application_risk BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'recommended'
    CHECK (status IN ('recommended', 'saved', 'rejected', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, job_posting_id)
);

CREATE TABLE IF NOT EXISTS application_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  job_match_id uuid NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'package_generating'
    CHECK (status IN ('package_generating', 'package_ready', 'approval_required', 'approved', 'rejected', 'blocked')),
  keyword_alignment jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_information_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_match_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_package_id uuid NOT NULL REFERENCES application_packages(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN (
    'discovered', 'recommended', 'saved', 'package_generating', 'package_ready',
    'approval_required', 'approved', 'submission_in_progress', 'applied',
    'submission_failed', 'recruiter_response', 'screening', 'interview',
    'offer', 'rejected', 'withdrawn', 'follow_up_due', 'blocked'
  )),
  submitted_at timestamptz,
  final_url text,
  evidence_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, application_package_id)
);

CREATE TABLE IF NOT EXISTS application_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_package_id uuid NOT NULL REFERENCES application_packages(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity text NOT NULL DEFAULT 'normal'
    CHECK (sensitivity IN ('normal', 'salary', 'right_to_represent', 'work_authorization',
      'sponsorship', 'criminal_history', 'disability', 'demographic',
      'security_clearance', 'relocation', 'legal_declaration', 'non_compete')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review_required', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_package_id uuid REFERENCES application_packages(id) ON DELETE CASCADE,
  application_answer_id uuid REFERENCES application_answers(id) ON DELETE CASCADE,
  action text NOT NULL,
  sensitivity text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (application_package_id IS NOT NULL OR application_answer_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS application_state_transitions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'agent', 'admin', 'system')),
  actor_user_id uuid REFERENCES product_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruiter_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  provider_message_id text NOT NULL,
  provider_thread_id text,
  sender_address text,
  subject_redacted text,
  category text NOT NULL CHECK (category IN (
    'job_alert', 'recruiter_outreach', 'application_confirmation',
    'screening_request', 'right_to_represent', 'interview_invitation',
    'assessment', 'follow_up', 'rejection', 'offer', 'spam_or_irrelevant',
    'manual_review'
  )),
  classification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, integration_id, provider_message_id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  time_zone text NOT NULL,
  interview_type text,
  location_or_link text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  recruiter_message_id uuid REFERENCES recruiter_messages(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'due'
    CHECK (status IN ('scheduled', 'due', 'completed', 'cancelled')),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (application_id IS NOT NULL OR recruiter_message_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  application_package_id uuid REFERENCES application_packages(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('resume', 'cover_letter', 'recruiter_message', 'interview_prep', 'other')),
  storage_key text NOT NULL,
  source_template_id uuid REFERENCES resume_templates(id) ON DELETE SET NULL,
  truth_fact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  generation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'passed', 'review_required', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  run_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  redacted_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES product_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  redacted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_state_transitions_application_idx
  ON application_state_transitions(user_id, application_id, created_at);
CREATE INDEX IF NOT EXISTS recruiter_messages_category_idx
  ON recruiter_messages(user_id, category, received_at DESC);
CREATE INDEX IF NOT EXISTS interviews_starts_idx
  ON interviews(user_id, starts_at);
CREATE INDEX IF NOT EXISTS follow_ups_due_idx
  ON follow_ups(user_id, status, due_at);
CREATE INDEX IF NOT EXISTS agent_runs_status_idx
  ON agent_runs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
  ON audit_logs(user_id, created_at DESC);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_tenant_policy ON organizations;
CREATE POLICY organizations_tenant_policy ON organizations
  USING (owner_user_id = app_current_user_id() OR app_has_organization_access(id))
  WITH CHECK (owner_user_id = app_current_user_id());

DROP POLICY IF EXISTS organization_members_tenant_policy ON organization_members;
CREATE POLICY organization_members_tenant_policy ON organization_members
  USING (user_id = app_current_user_id() OR app_has_organization_access(organization_id))
  WITH CHECK (user_id = app_current_user_id() OR app_has_organization_access(organization_id));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_profiles', 'user_preferences', 'user_integrations', 'career_profiles',
    'employment_history', 'education_history', 'certifications',
    'career_achievements', 'projects', 'skills', 'languages',
    'work_authorizations', 'resume_documents', 'resume_templates',
    'resume_versions', 'resume_role_families', 'search_campaigns',
    'campaign_titles', 'campaign_locations', 'campaign_exclusions',
    'job_postings', 'job_matches', 'application_packages', 'applications',
    'application_answers', 'approvals', 'application_state_transitions',
    'recruiter_messages', 'interviews', 'follow_ups', 'generated_documents',
    'agent_runs', 'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_policy ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_policy ON %I USING (user_id = app_current_user_id() OR app_has_organization_access(organization_id)) WITH CHECK (user_id = app_current_user_id() OR app_has_organization_access(organization_id))',
      table_name
    );
  END LOOP;
END
$$;
