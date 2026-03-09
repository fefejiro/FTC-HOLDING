import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL.trim();
const databaseHost = (() => {
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
})();
const isSupabasePooler = databaseHost.endsWith(".pooler.supabase.com");
const forceNoVerify = (process.env.DATABASE_SSL_NO_VERIFY || "").trim().toLowerCase() === "true";

const poolConfig: pg.PoolConfig = {
  connectionString: databaseUrl,
};

if (isSupabasePooler || forceNoVerify) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
