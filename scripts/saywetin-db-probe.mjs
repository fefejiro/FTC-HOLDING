#!/usr/bin/env node

import pg from 'pg';

const databaseUrlRaw = (process.env.DATABASE_URL || '').trim();

if (!databaseUrlRaw) {
  console.log(JSON.stringify({
    configured: false,
    connected: false,
    errorCode: 'DATABASE_URL_MISSING'
  }));
  process.exit(1);
}

let databaseUrl;
try {
  databaseUrl = new URL(databaseUrlRaw);
} catch (error) {
  console.log(JSON.stringify({
    configured: true,
    connected: false,
    errorCode: 'DATABASE_URL_INVALID',
    message: error.message
  }));
  process.exit(1);
}

const host = databaseUrl.hostname.toLowerCase();
const sslNoVerify = (process.env.DATABASE_SSL_NO_VERIFY || '').trim().toLowerCase() === 'true'
  || host.endsWith('.pooler.supabase.com');

if (sslNoVerify) {
  databaseUrl.searchParams.set('sslmode', 'no-verify');
}

const pool = new pg.Pool({
  connectionString: databaseUrl.toString(),
  ssl: sslNoVerify ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000
});

try {
  const ping = await pool.query('select 1 as ok');
  const schema = await pool.query("select to_regclass('listening_sessions') as listening_sessions");
  const tables = process.argv.includes('--tables')
    ? await pool.query(
      "select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') order by table_schema, table_name"
    )
    : null;

  console.log(JSON.stringify({
    configured: true,
    connected: true,
    host,
    sslNoVerify,
    ok: ping.rows?.[0]?.ok === 1,
    schemaReady: Boolean(schema.rows?.[0]?.listening_sessions),
    ...(tables ? { tables: tables.rows } : {})
  }));
} catch (error) {
  console.log(JSON.stringify({
    configured: true,
    connected: false,
    host,
    sslNoVerify,
    errorCode: error.code || error.name,
    message: error.message
  }));
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
