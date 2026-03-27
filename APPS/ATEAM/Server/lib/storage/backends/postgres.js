import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

import { createLocalRepositories } from "./local.js";
import { createPostgresCoreStores } from "./postgresCore.js";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SCHEMA_PATH = path.resolve(__dirname, "../../../../supabase/migrations/20260327000100_ateam_workflow_base.sql");

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function buildCapability({ configured, fallbackBackend = "", databaseUrl = "" } = {}) {
  let databaseHost = "";
  try {
    if (databaseUrl) {
      databaseHost = new URL(databaseUrl).hostname || "";
    }
  } catch {}
  return {
    provider: "postgres",
    configured: Boolean(configured),
    requiredEnv: ["ATEAM_DATABASE_URL|DATABASE_URL"],
    fallbackBackend: fallbackBackend || "",
    databaseHost
  };
}

function shouldDisableSslVerification(databaseUrl) {
  const envNoVerify = readEnv("DATABASE_SSL_NO_VERIFY") || readEnv("ATEAM_DATABASE_SSL_NO_VERIFY");
  if (["1", "true", "yes", "on"].includes(envNoVerify.toLowerCase())) return true;
  try {
    const parsed = new URL(databaseUrl);
    const sslmode = String(parsed.searchParams.get("sslmode") || "").trim().toLowerCase();
    if (sslmode === "no-verify") return true;
    const host = String(parsed.hostname || "").trim().toLowerCase();
    if (host.endsWith(".supabase.com") || host.endsWith(".pooler.supabase.com")) return true;
  } catch {}
  return false;
}

function buildPoolConfig(databaseUrl) {
  const config = {
    connectionString: databaseUrl,
    max: 8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
  if (shouldDisableSslVerification(databaseUrl)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

function readSchemaSql() {
  if (!fs.existsSync(DEFAULT_SCHEMA_PATH)) {
    throw new Error(`ATEAM workflow schema file not found: ${DEFAULT_SCHEMA_PATH}`);
  }
  return fs.readFileSync(DEFAULT_SCHEMA_PATH, "utf8");
}

export function createPostgresRepositories({ memoryDir = "" } = {}) {
  const databaseUrl = readEnv("ATEAM_DATABASE_URL") || readEnv("DATABASE_URL");
  const localFallback = createLocalRepositories({ memoryDir });

  if (!databaseUrl) {
    return {
      ...localFallback,
      backend: "local",
      capability: buildCapability({
        configured: false,
        fallbackBackend: "local"
      })
    };
  }

  const pool = new Pool(buildPoolConfig(databaseUrl));
  const schemaSql = readSchemaSql();
  let readyPromise = null;
  const ready = async () => {
    if (!readyPromise) {
      readyPromise = pool.query(schemaSql).catch((error) => {
        readyPromise = null;
        throw error;
      });
    }
    return readyPromise;
  };

  const { approvalStore, workItemStore, workflowRunStore, capability } = createPostgresCoreStores({
    pool,
    ready,
    tableNames: {
      approvals: readEnv("SUPABASE_TABLE_ATEAM_APPROVALS"),
      workItems: readEnv("SUPABASE_TABLE_ATEAM_WORK_ITEMS"),
      workflowRuns: readEnv("SUPABASE_TABLE_ATEAM_WORKFLOW_RUNS")
    }
  });

  return {
    ...localFallback,
    backend: "postgres",
    capability: {
      ...buildCapability({
        configured: true,
        databaseUrl
      }),
      ...capability
    },
    approvalStore,
    workItemStore,
    workflowRunStore
  };
}
