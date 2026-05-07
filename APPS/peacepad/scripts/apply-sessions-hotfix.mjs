#!/usr/bin/env node
// Apply hotfix_sessions.sql to the database referenced by DATABASE_URL.
// Run via: railway run --service @ftc/peacepad node scripts/apply-sessions-hotfix.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = readFileSync(path.resolve("migrations/hotfix_sessions.sql"), "utf8");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  const r = await client.query(`SELECT to_regclass('public.sessions') AS exists`);
  console.log("sessions table:", r.rows[0].exists);
} finally {
  await client.end();
}
