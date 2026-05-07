#!/usr/bin/env node
import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
console.log("search_path:", (await c.query("SHOW search_path")).rows[0]);
console.log("current_schema:", (await c.query("SELECT current_schema()")).rows[0]);
console.log("peacepad.sessions exists:", (await c.query("SELECT to_regclass('peacepad.sessions') x")).rows[0].x);
console.log("public.sessions exists:", (await c.query("SELECT to_regclass('public.sessions') x")).rows[0].x);
console.log("unqualified sessions resolves to:", (await c.query("SELECT to_regclass('sessions') x")).rows[0].x);
try {
  const r = await c.query('SELECT count(*) FROM "sessions"');
  console.log("sessions row count:", r.rows[0]);
} catch (e) {
  console.log("ERROR querying unqualified sessions:", e.message);
}
await c.end();
