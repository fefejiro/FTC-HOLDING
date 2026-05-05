import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrlRaw = process.env.DATABASE_URL.trim();
const databaseUrlObject = (() => {
  try {
    return new URL(databaseUrlRaw);
  } catch {
    return null;
  }
})();
const databaseHost = databaseUrlObject?.hostname.toLowerCase() || "";
const isSupabasePooler = databaseHost.endsWith(".pooler.supabase.com");
const forceNoVerify = (process.env.DATABASE_SSL_NO_VERIFY || "").trim().toLowerCase() === "true";
const useNoVerifySsl = isSupabasePooler || forceNoVerify;
if (databaseUrlObject && useNoVerifySsl) {
  databaseUrlObject.searchParams.set("sslmode", "no-verify");
}
const databaseUrl = databaseUrlObject ? databaseUrlObject.toString() : databaseUrlRaw;

const poolConfig: pg.PoolConfig = {
  connectionString: databaseUrl,
};

if (useNoVerifySsl) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
