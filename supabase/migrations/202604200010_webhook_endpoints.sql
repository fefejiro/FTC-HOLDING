-- Phase 15: Outbound webhook endpoints per project
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url         text NOT NULL,
  events      text[] NOT NULL DEFAULT '{}',
  secret      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_project_id_idx ON webhook_endpoints(project_id);

-- RLS
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Only admin service role can read/write (worker uses service role key)
CREATE POLICY admin_all ON webhook_endpoints
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE webhook_endpoints IS
  'Outbound webhook registrations per project. Events: project.created, proposal.sent, payment.received, milestone.approved.';
COMMENT ON COLUMN webhook_endpoints.secret IS
  'HMAC-SHA256 signing secret. Shared with client so they can verify X-Una-Signature header.';
