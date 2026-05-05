import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
DO $$ BEGIN
  CREATE TYPE service_type AS ENUM ('gas','lockout','jump','tire','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('pending','accepted','en_route','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  pin_hash TEXT,
  fcm_token TEXT,
  vapid_sub JSONB,
  service_radius_km INTEGER DEFAULT 25,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  event_type TEXT,
  description TEXT,
  roadway TEXT,
  location_lat REAL,
  location_lng REAL,
  severity TEXT,
  start_date TEXT,
  last_updated TEXT,
  alerted BOOLEAN DEFAULT false,
  alerted_at TIMESTAMP,
  workflow_status TEXT DEFAULT 'new_signal',
  workflow_operator_id UUID REFERENCES operators(id),
  workflow_started_at TIMESTAMP,
  workflow_resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  location_lat REAL,
  location_lng REAL,
  location_address TEXT,
  service_type service_type NOT NULL,
  status request_status DEFAULT 'pending',
  operator_id UUID REFERENCES operators(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP
);
`;

try {
  await pool.query(sql);
  console.log('✓ operators, incidents, requests tables ready');
} catch (err) {
  console.error('✗', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
