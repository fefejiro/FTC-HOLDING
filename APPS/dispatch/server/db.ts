import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function ensureDispatchIncidentWorkflowColumns() {
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
