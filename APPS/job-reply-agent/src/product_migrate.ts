import { assertProductDatabaseRole, createProductPool, migrateProductDb } from "./product_db.js";

const runtimeUrl = String(process.env.DATABASE_URL || "").trim();
const migrationUrl = String(process.env.MIGRATION_DATABASE_URL || runtimeUrl).trim();
const pool = createProductPool(migrationUrl);

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

try {
  await migrateProductDb(pool);
  if (process.env.MIGRATION_DATABASE_URL && runtimeUrl) {
    const runtimeRole = decodeURIComponent(new URL(runtimeUrl).username);
    if (!runtimeRole) throw new Error("DATABASE_URL must include the runtime PostgreSQL role.");
    const role = quoteIdentifier(runtimeRole);
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await pool.query(`GRANT EXECUTE ON FUNCTION app_has_organization_access(uuid) TO ${role}`);
    const runtimePool = createProductPool(runtimeUrl);
    try {
      await assertProductDatabaseRole(runtimePool);
    } finally {
      await runtimePool.end();
    }
    console.log(`Runtime database permissions granted to ${runtimeRole}.`);
  }
  console.log("Product database migrations completed.");
} finally {
  await pool.end();
}
