#!/usr/bin/env node
import { Client } from "pg";
const url = process.env.DATABASE_URL;
console.log("DATABASE_URL host:", new URL(url.replace(/^postgres(ql)?:\/\//, "http://")).host);
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
const v = await c.query("SELECT current_database() db, current_schema schema, current_user usr, version()");
console.log(v.rows[0]);
const t = await c.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%session%' ORDER BY table_schema, table_name`);
console.log("session-named tables:", t.rows);
await c.end();
