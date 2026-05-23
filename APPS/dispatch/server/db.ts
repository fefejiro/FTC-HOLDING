import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

async function ensureDispatchSchema() {
  await db.execute(sql.raw(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE SCHEMA IF NOT EXISTS dispatch;
  `));

  await db.execute(sql.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'service_type'
          AND n.nspname = 'dispatch'
      ) THEN
        CREATE TYPE dispatch.service_type AS ENUM ('gas', 'lockout', 'jump', 'tire', 'other');
      END IF;
    END
    $$;
  `));

  await db.execute(sql.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'request_status'
          AND n.nspname = 'dispatch'
      ) THEN
        CREATE TYPE dispatch.request_status AS ENUM ('pending', 'accepted', 'en_route', 'completed', 'cancelled');
      END IF;
    END
    $$;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS dispatch.operators (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      phone text,
      pin_hash text,
      fcm_token text,
      vapid_sub jsonb,
      service_radius_km integer DEFAULT 25,
      active boolean DEFAULT true,
      last_location_lat real,
      last_location_lng real,
      last_location_label text,
      last_location_accuracy_meters integer,
      last_location_at timestamp,
      created_at timestamp DEFAULT now()
    );
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS dispatch.incidents (
      id text PRIMARY KEY,
      event_type text,
      description text,
      roadway text,
      location_lat real,
      location_lng real,
      severity text,
      start_date text,
      last_updated text,
      alerted boolean DEFAULT false,
      alerted_at timestamp,
      view_count integer DEFAULT 0,
      action_count integer DEFAULT 0,
      actioned boolean DEFAULT false,
      last_viewed_at timestamp,
      last_actioned_at timestamp,
      last_viewed_by_operator_id uuid REFERENCES dispatch.operators(id),
      last_actioned_by_operator_id uuid REFERENCES dispatch.operators(id),
      workflow_status text DEFAULT 'new_signal',
      workflow_operator_id uuid REFERENCES dispatch.operators(id),
      workflow_started_at timestamp,
      workflow_resolved_at timestamp,
      created_at timestamp DEFAULT now()
    );
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS dispatch.requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name text NOT NULL,
      customer_phone text NOT NULL,
      location_lat real,
      location_lng real,
      location_address text,
      service_type dispatch.service_type NOT NULL,
      status dispatch.request_status DEFAULT 'pending',
      operator_id uuid REFERENCES dispatch.operators(id),
      notes text,
      created_at timestamp DEFAULT now(),
      accepted_at timestamp,
      en_route_at timestamp,
      completed_at timestamp
    );
  `));
}

export async function ensureDispatchIncidentWorkflowColumns() {
  await ensureDispatchSchema();

  await db.execute(sql.raw(`
    ALTER TABLE dispatch.incidents
      ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'new_signal',
      ADD COLUMN IF NOT EXISTS workflow_operator_id uuid REFERENCES dispatch.operators(id),
      ADD COLUMN IF NOT EXISTS workflow_started_at timestamp,
      ADD COLUMN IF NOT EXISTS workflow_resolved_at timestamp;
  `));

  await db.execute(sql.raw(`
    UPDATE dispatch.incidents
    SET workflow_status = 'new_signal'
    WHERE workflow_status IS NULL OR btrim(workflow_status) = '';
  `));
}
