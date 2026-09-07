import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const outputPath = String(process.env.PROVISION_OUTPUT_PATH || "").trim();
const publicUrl = String(process.env.DATABASE_PUBLIC_URL || "").trim();
const privateUrl = String(process.env.DATABASE_URL || "").trim();
if (!outputPath || !publicUrl || !privateUrl) {
  throw new Error("PROVISION_OUTPUT_PATH, DATABASE_PUBLIC_URL, and DATABASE_URL are required.");
}

const roles = {
  migration: "jobagent_migrator",
  runtime: "jobagent_app",
  queue: "jobagent_queue"
};
const passwords = Object.fromEntries(
  Object.keys(roles).map((key) => [key, crypto.randomBytes(36).toString("base64url")])
);

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function identifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function roleBlock(role, password) {
  return `
    DO $role$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=${literal(role)}) THEN
        EXECUTE 'CREATE ROLE ${identifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '
          || quote_literal(${literal(password)});
      ELSE
        EXECUTE 'ALTER ROLE ${identifier(role)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '
          || quote_literal(${literal(password)});
      END IF;
    END
    $role$;
  `;
}

function roleUrl(base, role, password) {
  const url = new URL(base);
  url.username = role;
  url.password = password;
  return url.toString();
}

const databaseName = decodeURIComponent(new URL(privateUrl).pathname.replace(/^\//, ""));
if (!databaseName) throw new Error("Railway PostgreSQL URL did not include a database name.");
const pool = new pg.Pool({
  connectionString: publicUrl,
  ssl: { rejectUnauthorized: false },
  max: 1
});

try {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  for (const key of Object.keys(roles)) {
    await pool.query(roleBlock(roles[key], passwords[key]));
    await pool.query(`GRANT CONNECT ON DATABASE ${identifier(databaseName)} TO ${identifier(roles[key])}`);
  }
  await pool.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${identifier(roles.migration)}`);
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${identifier(roles.runtime)}`);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS jobagent_queue AUTHORIZATION ${identifier(roles.queue)}`);
  await pool.query(`ALTER SCHEMA jobagent_queue OWNER TO ${identifier(roles.queue)}`);
  await pool.query(`REVOKE ALL ON SCHEMA jobagent_queue FROM PUBLIC`);
} finally {
  await pool.end();
}

const output = {
  migrationUrl: roleUrl(privateUrl, roles.migration, passwords.migration),
  runtimeUrl: roleUrl(privateUrl, roles.runtime, passwords.runtime),
  queueUrl: roleUrl(privateUrl, roles.queue, passwords.queue),
  roles,
  createdAt: new Date().toISOString()
};
const target = path.resolve(outputPath);
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(output, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600
});
await fs.chmod(target, 0o600).catch(() => undefined);
console.log(JSON.stringify({
  provisioned: true,
  migrationRole: roles.migration,
  runtimeRole: roles.runtime,
  queueRole: roles.queue,
  outputPath: target
}));
