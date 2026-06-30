CREATE TABLE IF NOT EXISTS agent_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  lead_id TEXT DEFAULT '',
  worker_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_json TEXT DEFAULT '{}',
  output_json TEXT DEFAULT '{}',
  confidence INTEGER DEFAULT 0,
  error TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_run_events_run_id ON agent_run_events(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_run_events_lead_id ON agent_run_events(lead_id, created_at);

CREATE TABLE IF NOT EXISTS reply_actions (
  id TEXT PRIMARY KEY,
  reply_id TEXT NOT NULL,
  lead_id TEXT DEFAULT '',
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'operator',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reply_actions_reply_id ON reply_actions(reply_id, created_at);

CREATE TABLE IF NOT EXISTS report_snapshots (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary_json TEXT DEFAULT '{}',
  drilldowns_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_type_time ON report_snapshots(report_type, created_at);

CREATE TABLE IF NOT EXISTS acceptance_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  checks_json TEXT DEFAULT '{}',
  evidence_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_acceptance_runs_created_at ON acceptance_runs(created_at);
