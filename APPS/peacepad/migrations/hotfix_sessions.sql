-- Hotfix: create missing "sessions" table (connect-pg-simple session store).
-- Idempotent — safe to re-run. Creates in BOTH peacepad and public so it
-- resolves regardless of the running connection's search_path.
CREATE SCHEMA IF NOT EXISTS peacepad;
CREATE TABLE IF NOT EXISTS peacepad."sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON peacepad."sessions" ("expire");

CREATE TABLE IF NOT EXISTS public."sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire_public" ON public."sessions" ("expire");
