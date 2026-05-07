# @ftc/stats-ledger

Append-only Postgres (Neon-compatible) event ledger with idempotent writes.

## API

- `record(event)`
- `query(filter)`
- `aggregate(filter)`
- `toCsv(events)`

## Environment

Set one of:

- `STATS_LEDGER_DATABASE_URL`
- `DATABASE_URL`

## Migration plan (production-safe)

Use this SQL in your migration system before enabling strict migration-only operation:

```sql
CREATE TABLE IF NOT EXISTS stats_ledger_events (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  value DOUBLE PRECISION,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stats_ledger_events_source_event_time
  ON stats_ledger_events(source, event_type, occurred_at DESC);
```
