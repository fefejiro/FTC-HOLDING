CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  redirect_to TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  used_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_created_at ON oauth_states(created_at);

CREATE TABLE IF NOT EXISTS mailbox_connections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  email TEXT NOT NULL,
  scope TEXT DEFAULT '',
  access_token_enc TEXT DEFAULT '',
  refresh_token_enc TEXT DEFAULT '',
  expires_at TEXT DEFAULT '',
  last_sync_at TEXT DEFAULT '',
  history_id TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mailbox_connections_provider_email
  ON mailbox_connections(provider, email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_replies_provider_message_id
  ON replies(provider, message_id)
  WHERE message_id <> '';
