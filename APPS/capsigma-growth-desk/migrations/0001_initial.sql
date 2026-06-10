CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  industry TEXT DEFAULT '',
  fit_score INTEGER DEFAULT 0,
  reason TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  contact_title TEXT DEFAULT '',
  email TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  source TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  draft_subject TEXT DEFAULT '',
  draft_body TEXT DEFAULT '',
  emails_drafted INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  last_drafted_at TEXT DEFAULT '',
  last_sent_at TEXT DEFAULT '',
  last_reply_at TEXT DEFAULT '',
  reply_type TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  model TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_lead_id ON drafts(lead_id);

CREATE TABLE IF NOT EXISTS send_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT DEFAULT '',
  provider_message_id TEXT DEFAULT '',
  error TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_send_events_lead_id ON send_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_send_events_created_at ON send_events(created_at);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT DEFAULT '',
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);

CREATE TABLE IF NOT EXISTS suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
