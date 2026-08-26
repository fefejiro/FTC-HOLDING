\set ON_ERROR_STOP on

CREATE TABLE staging_schema_migrations (
  id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staging_restore_probe (
  record_id TEXT PRIMARY KEY,
  data_region TEXT NOT NULL CHECK (data_region IN ('ca', 'us')),
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO staging_schema_migrations (id, checksum) VALUES
  ('001_staging_sessions', repeat('a', 64)),
  ('002_staging_families', repeat('b', 64));

INSERT INTO staging_restore_probe (record_id, data_region, payload_hash) VALUES
  ('fictional-ca-record', 'ca', repeat('c', 64)),
  ('fictional-us-record', 'us', repeat('d', 64));
