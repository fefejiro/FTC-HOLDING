CREATE TABLE IF NOT EXISTS lead_sources (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  source_type TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  provider_record_id TEXT DEFAULT '',
  search_query TEXT DEFAULT '',
  search_parameters_json TEXT DEFAULT '{}',
  radius_value INTEGER DEFAULT 0,
  radius_unit TEXT DEFAULT 'miles',
  location_seed TEXT DEFAULT '',
  discovered_at TEXT DEFAULT '',
  agent_run_id TEXT DEFAULT '',
  raw_payload_json TEXT DEFAULT '{}',
  confidence_score INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_lead_id ON lead_sources(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_agent_run_id ON lead_sources(agent_run_id);

CREATE TABLE IF NOT EXISTS email_evidence (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  contact_id TEXT DEFAULT '',
  email TEXT NOT NULL,
  source_type TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  discovery_method TEXT DEFAULT '',
  validation_provider TEXT DEFAULT '',
  validation_status TEXT DEFAULT 'unknown',
  validation_confidence INTEGER DEFAULT 0,
  verified_at TEXT DEFAULT '',
  domain_match INTEGER NOT NULL DEFAULT 0,
  mx_check_status TEXT DEFAULT 'unknown',
  bounce_status TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_evidence_lead_id ON email_evidence(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_evidence_email ON email_evidence(email);
CREATE INDEX IF NOT EXISTS idx_email_evidence_validation ON email_evidence(validation_status);

CREATE TABLE IF NOT EXISTS intelligence_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  positioning_json TEXT DEFAULT '{}',
  services_json TEXT DEFAULT '[]',
  industries_json TEXT DEFAULT '[]',
  differentiators_json TEXT DEFAULT '[]',
  parameters_json TEXT DEFAULT '{}',
  send_windows_json TEXT DEFAULT '[]',
  created_by TEXT DEFAULT 'operator',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intelligence_versions_active ON intelligence_versions(active, version_number);

CREATE TABLE IF NOT EXISTS campaign_settings (
  id TEXT PRIMARY KEY,
  active_intelligence_version_id TEXT DEFAULT '',
  target_country TEXT DEFAULT 'United States',
  target_locations_json TEXT DEFAULT '[]',
  starting_radius INTEGER DEFAULT 25,
  radius_increment INTEGER DEFAULT 25,
  max_radius INTEGER DEFAULT 100,
  max_leads_per_run INTEGER DEFAULT 25,
  max_leads_per_day INTEGER DEFAULT 50,
  max_emails_per_day INTEGER DEFAULT 25,
  included_industries_json TEXT DEFAULT '[]',
  excluded_industries_json TEXT DEFAULT '[]',
  included_titles_json TEXT DEFAULT '[]',
  excluded_titles_json TEXT DEFAULT '[]',
  email_validation_minimum INTEGER DEFAULT 70,
  fit_score_minimum INTEGER DEFAULT 60,
  auto_draft_threshold INTEGER DEFAULT 70,
  auto_schedule_threshold INTEGER DEFAULT 80,
  automation_mode TEXT DEFAULT 'review_required',
  send_windows_json TEXT DEFAULT '["08:00","15:00"]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_sends (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TEXT NOT NULL,
  send_window_label TEXT DEFAULT '',
  approval_status TEXT DEFAULT 'approved',
  confidence INTEGER DEFAULT 0,
  safety_checks_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_sends_status_time ON scheduled_sends(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_sends_lead_id ON scheduled_sends(lead_id);
