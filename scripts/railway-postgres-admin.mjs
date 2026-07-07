#!/usr/bin/env node

import pg from 'pg';

const command = process.argv[2] || 'list';
const dbArgIndex = process.argv.indexOf('--db');
const databaseName = dbArgIndex >= 0 ? process.argv[dbArgIndex + 1] : 'saywetin';
const usePrivate = process.argv.includes('--private');

if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(databaseName)) {
  console.error(`Invalid database name: ${databaseName}`);
  process.exit(1);
}

const sourceUrlRaw = (usePrivate ? process.env.DATABASE_URL : process.env.DATABASE_PUBLIC_URL)
  || process.env.DATABASE_PUBLIC_URL
  || process.env.DATABASE_URL;

if (!sourceUrlRaw) {
  console.error('DATABASE_PUBLIC_URL or DATABASE_URL is required.');
  process.exit(1);
}

function withDatabase(rawUrl, dbName) {
  const url = new URL(rawUrl);
  url.pathname = `/${dbName}`;
  return url;
}

const adminUrl = withDatabase(sourceUrlRaw, 'postgres');
const targetUrl = withDatabase(sourceUrlRaw, databaseName);

if (command === 'emit-url') {
  process.stdout.write(targetUrl.toString());
  process.exit(0);
}

const pool = new pg.Pool({
  connectionString: adminUrl.toString(),
  connectionTimeoutMillis: 10000
});

try {
  if (command === 'list') {
    const result = await pool.query(
      'select datname from pg_database where datistemplate = false order by datname'
    );
    console.log(JSON.stringify({ databases: result.rows.map((row) => row.datname) }));
  } else if (command === 'create') {
    const exists = await pool.query('select 1 from pg_database where datname = $1', [databaseName]);
    if (exists.rowCount === 0) {
      await pool.query(`create database ${pg.escapeIdentifier(databaseName)}`);
    }
    console.log(JSON.stringify({ database: databaseName, created: exists.rowCount === 0 }));
  } else {
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(JSON.stringify({
    errorCode: error.code || error.name,
    message: error.message
  }));
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
