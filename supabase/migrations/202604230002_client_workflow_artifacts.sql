-- Client Workflow Artifacts & Approvals
-- Migration: 202604230002
-- Purpose: Support Unalabs concierge service for scope refinement, artifact generation, and client approval workflow
-- Tables: project_artifacts, project_approvals, project_artifacts_changelog

-- project_artifacts
-- Stores all generated artifacts: scope docs, mockups, timelines, specs, risk logs
CREATE TABLE IF NOT EXISTS project_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_type VARCHAR(50) NOT NULL,
    -- 'scope_doc', 'implementation_plan', 'technical_spec', 'timeline', 'risk_log', 'mockup_descriptions', 'architecture_diagram', 'weekly_digest'
  version INT NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
    -- { phases: [{name, duration_weeks, milestones: [...]}], risks: [...], tech_stack: [...], effort_estimates: {...}, mockup_descriptions: [...] }
  summary TEXT,
    -- Plain text summary for email/preview (max 500 chars)
  generated_by VARCHAR(50) NOT NULL,
    -- 'claude', 'client', 'operator'
  generated_at TIMESTAMP NOT NULL DEFAULT now(),
  storage_url TEXT,
    -- URL to artifact PDF/image if applicable (Cloudflare R2)
  tags JSONB,
    -- { refinement_round: 1, client_feedback_incorporated: true }
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_artifacts_project_id ON project_artifacts(project_id);
CREATE INDEX idx_project_artifacts_type_version ON project_artifacts(artifact_type, version);

-- project_approvals
-- Tracks client and operator approval gates
CREATE TABLE IF NOT EXISTS project_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  approval_type VARCHAR(50) NOT NULL,
    -- 'scope_approval', 'build_approval'
  approved_by VARCHAR(255) NOT NULL,
    -- email of approver (client or operator)
  artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL,
    -- which artifact version was approved
  approval_notes TEXT,
    -- client comments or feedback
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected', 'requested_changes'
  status_changed_at TIMESTAMP,
  triggered_build BOOLEAN DEFAULT FALSE,
    -- did this approval trigger a build?
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_approvals_project_id ON project_approvals(project_id);
CREATE INDEX idx_project_approvals_approval_type ON project_approvals(approval_type, status);

-- project_artifacts_changelog
-- Audit trail for scope refinements and client feedback loops
CREATE TABLE IF NOT EXISTS project_artifacts_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL,
  change_type VARCHAR(50) NOT NULL,
    -- 'client_feedback', 'claude_refinement', 'operator_adjustment', 'scope_version_bump'
  change_summary TEXT NOT NULL,
    -- Plain text description ("Reduced Phase 1 timeline by 1 week per client request")
  previous_version INT,
  new_version INT,
  changed_by VARCHAR(255),
    -- email or service name
  triggered_by VARCHAR(50),
    -- 'client_edit', 'automation', 'operator_request'
  metadata JSONB,
    -- { client_feedback_text: '...', refinement_prompt: '...', approval_status: '...' }
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_artifacts_changelog_project_id ON project_artifacts_changelog(project_id);
CREATE INDEX idx_project_artifacts_changelog_created_at ON project_artifacts_changelog(created_at);

-- Add columns to projects table to track workflow state
-- (Assumes projects table already exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'intake';
  -- 'intake', 'scoped', 'awaiting_approval', 'active', 'building', 'complete', 'archived'

ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_scope_version INT DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS build_pr_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS build_pr_number INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS build_started_at TIMESTAMP;

-- RLS Policies (placeholder — adjust based on your auth model)
ALTER TABLE project_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_artifacts_changelog ENABLE ROW LEVEL SECURITY;

-- Basic RLS: client can see their own project artifacts
CREATE POLICY "Clients can view own project artifacts" ON project_artifacts
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Operators can see all artifacts
CREATE POLICY "Operators can view all project artifacts" ON project_artifacts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'operator'
  );

CREATE POLICY "Clients can view own project approvals" ON project_approvals
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Operators can manage all approvals" ON project_approvals
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'operator'
  );
