CREATE TABLE IF NOT EXISTS users (
    telegram_user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    joined_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_name TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    region TEXT NOT NULL,
    campaign_tag TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league TEXT NOT NULL,
    match_name TEXT NOT NULL,
    kickoff_time TEXT NOT NULL,
    market TEXT NOT NULL,
    selection TEXT NOT NULL,
    odds TEXT NOT NULL,
    confidence TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    affiliate_link_id INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    result TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    posted_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_picks_status ON picks(status);
CREATE INDEX IF NOT EXISTS idx_picks_result ON picks(result);
CREATE INDEX IF NOT EXISTS idx_picks_kickoff_time ON picks(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);
