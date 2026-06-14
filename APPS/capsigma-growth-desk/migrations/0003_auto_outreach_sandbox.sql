ALTER TABLE leads ADD COLUMN service_lane TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN research_summary TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN evidence_json TEXT DEFAULT '{}';
ALTER TABLE leads ADD COLUMN review_status TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN discovery_run_id TEXT DEFAULT '';

ALTER TABLE send_events ADD COLUMN intended_recipient TEXT DEFAULT '';
ALTER TABLE send_events ADD COLUMN actual_recipient TEXT DEFAULT '';
ALTER TABLE send_events ADD COLUMN sandbox INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS prospect_runs (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  target_industries TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'running',
  requested_limit INTEGER DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT DEFAULT '',
  raw_response TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  completed_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_prospect_runs_created_at ON prospect_runs(created_at);

CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  lead_id TEXT DEFAULT '',
  send_event_id TEXT DEFAULT '',
  provider TEXT DEFAULT '',
  message_id TEXT DEFAULT '',
  thread_id TEXT DEFAULT '',
  from_email TEXT DEFAULT '',
  from_name TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  classification TEXT DEFAULT '',
  needs_human INTEGER NOT NULL DEFAULT 0,
  received_at TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replies_needs_human ON replies(needs_human, created_at);
CREATE INDEX IF NOT EXISTS idx_replies_lead_id ON replies(lead_id);
