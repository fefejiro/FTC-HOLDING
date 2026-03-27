import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import pg from "pg";

const { Pool } = pg;
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SQLITE_PATH = path.join(__dirname, "..", "..", "memory", "mission_control.sqlite");
const DEFAULT_SCHEMA_PATH = path.join(__dirname, "..", "..", "supabase", "migrations", "20260327000100_ateam_workflow_base.sql");

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index >= 0 && index + 1 < process.argv.length) {
    return String(process.argv[index + 1] || "").trim();
  }
  return "";
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getBasicAuthHeader() {
  const username = readArg("--ops-user") || readEnv("ATEAM_OPS_BASIC_AUTH_USERNAME");
  const password = readArg("--ops-password") || readEnv("ATEAM_OPS_BASIC_AUTH_PASSWORD");
  if (!username || !password) return "";
  return "Basic " + Buffer.from(`${username}:${password}`, "utf8").toString("base64");
}

function safeJsonParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function chunk(list = [], size = 100) {
  const result = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
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
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
  if (shouldDisableSslVerification(databaseUrl)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

function printHelp() {
  console.log(`ATEAM workflow migration -> Postgres

Usage:
  node scripts/migrateWorkflowStorageToPostgres.mjs [--source-db <path>]
  node scripts/migrateWorkflowStorageToPostgres.mjs --source-http

Source modes:
  --source-db <path>     Read from a local SQLite file (default: ${DEFAULT_SQLITE_PATH})
  --source-http          Read from the live public/ops HTTP surfaces

Optional HTTP env/args:
  ATEAM_SOURCE_PUBLIC_ORIGIN / --public-origin   default: https://unalabs.cloud
  ATEAM_SOURCE_PUBLIC_PATH   / --public-path     default: /api/ateam/workflow/runs?limit=120
  ATEAM_SOURCE_OPS_ORIGIN    / --ops-origin      default: https://ops.unalabs.cloud
  ATEAM_SOURCE_WORK_ITEMS_PATH / --work-items-path default: /api/operator/ateam/work-items?limit=200
  ATEAM_SOURCE_APPROVALS_PATH / --approvals-path default: /api/operator/ateam/approvals?limit=200
  ATEAM_OPS_BASIC_AUTH_USERNAME / --ops-user
  ATEAM_OPS_BASIC_AUTH_PASSWORD / --ops-password

Required target env:
  ATEAM_DATABASE_URL or DATABASE_URL

Flags:
  --dry-run              Print discovered counts without writing
  --help                 Show this help
`);
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText} :: ${text.slice(0, 240)}`);
  }
  return response.json();
}

async function loadFromHttp() {
  const publicOrigin = readArg("--public-origin") || readEnv("ATEAM_SOURCE_PUBLIC_ORIGIN") || "https://unalabs.cloud";
  const publicPath = readArg("--public-path") || readEnv("ATEAM_SOURCE_PUBLIC_PATH") || "/api/ateam/workflow/runs?limit=120";
  const opsOrigin = readArg("--ops-origin") || readEnv("ATEAM_SOURCE_OPS_ORIGIN") || "https://ops.unalabs.cloud";
  const workItemsPath = readArg("--work-items-path") || readEnv("ATEAM_SOURCE_WORK_ITEMS_PATH") || "/api/operator/ateam/work-items?limit=200";
  const approvalsPath = readArg("--approvals-path") || readEnv("ATEAM_SOURCE_APPROVALS_PATH") || "/api/operator/ateam/approvals?limit=200";
  const basicAuth = getBasicAuthHeader();
  const opsHeaders = basicAuth ? { authorization: basicAuth } : {};

  const [runsPayload, workItemsPayload, approvalsPayload] = await Promise.all([
    fetchJson(new URL(publicPath, publicOrigin).toString()),
    fetchJson(new URL(workItemsPath, opsOrigin).toString(), opsHeaders),
    fetchJson(new URL(approvalsPath, opsOrigin).toString(), opsHeaders)
  ]);

  return {
    sourceType: "http",
    runs: Array.isArray(runsPayload?.runs) ? runsPayload.runs : [],
    workItems: Array.isArray(workItemsPayload?.items) ? workItemsPayload.items : [],
    approvals: Array.isArray(approvalsPayload?.approvals) ? approvalsPayload.approvals : []
  };
}

function loadFromSqlite(filePath) {
  const resolvedPath = path.resolve(filePath || DEFAULT_SQLITE_PATH);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`SQLite source file not found: ${resolvedPath}`);
  }

  const db = new DatabaseSync(resolvedPath, { open: true, readOnly: true });
  try {
    return {
      sourceType: "sqlite",
      runs: db.prepare("SELECT * FROM workflow_runs ORDER BY updated_ts DESC").all(),
      workItems: db.prepare("SELECT * FROM work_items ORDER BY created_ts DESC").all(),
      approvals: db.prepare("SELECT * FROM approvals ORDER BY created_ts DESC").all()
    };
  } finally {
    db.close();
  }
}

function normalizeRunRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || "").trim(),
    created_ts: String(row.created_ts || row.createdTs || "").trim(),
    updated_ts: String(row.updated_ts || row.updatedTs || row.created_ts || "").trim(),
    phase: String(row.phase || "intake").trim(),
    requested_by: String(row.requested_by || row.requestedBy || "").trim(),
    category: String(row.category || "website").trim(),
    idea: String(row.idea || "").trim(),
    title: String(row.title || "").trim(),
    questions_json: safeJsonParse(row.questions_json ?? row.questions, []),
    answers_json: safeJsonParse(row.answers_json ?? row.answers, {}),
    brief_json: safeJsonParse(row.brief_json ?? row.brief, {}),
    recommended_lane: String(row.recommended_lane || row.recommendedLane || "").trim(),
    risks_json: safeJsonParse(row.risks_json ?? row.risks, []),
    artifacts_json: safeJsonParse(row.artifacts_json ?? row.artifacts, {}),
    approvals_json: safeJsonParse(row.approvals_json ?? row.approvals, {}),
    links_json: safeJsonParse(row.links_json ?? row.links, {}),
    handoff_json: safeJsonParse(row.handoff_json ?? row.handoff, {}),
    meta_json: safeJsonParse(row.meta_json ?? row.meta, {})
  };
}

function normalizeWorkItemRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || "").trim(),
    created_ts: String(row.created_ts || row.createdTs || "").trim(),
    title: String(row.title || "").trim(),
    objective: String(row.objective || "").trim(),
    stage: String(row.stage || "BACKLOG").trim(),
    risk: String(row.risk || "low").trim(),
    owner_agent_id: String(row.owner_agent_id || row.ownerAgentId || "").trim(),
    data_json: safeJsonParse(row.data_json ?? row.data, {})
  };
}

function normalizeApprovalRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || "").trim(),
    created_ts: String(row.created_ts || row.createdTs || "").trim(),
    status: String(row.status || "pending").trim(),
    requested_by: String(row.requested_by || row.requestedBy || "").trim(),
    policy: String(row.policy || "").trim(),
    summary: String(row.summary || "").trim(),
    payload_json: safeJsonParse(row.payload_json ?? row.payload, {})
  };
}

function quoteIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("SQL identifier is required.");
  const parts = raw.split(".");
  for (const part of parts) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      throw new Error(`Unsafe SQL identifier: ${raw}`);
    }
  }
  return parts.map((part) => `"${part}"`).join(".");
}

async function upsertRuns(pool, tableName, rows) {
  const sqlTable = quoteIdentifier(tableName);
  let total = 0;
  for (const batch of chunk(rows.filter(Boolean), 100)) {
    for (const row of batch) {
      await pool.query(
        `insert into ${sqlTable} (
          id, created_ts, updated_ts, phase, requested_by, category, idea, title,
          questions_json, answers_json, brief_json, recommended_lane, risks_json,
          artifacts_json, approvals_json, links_json, handoff_json, meta_json
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb, $10::jsonb, $11::jsonb, $12, $13::jsonb,
          $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb
        )
        on conflict (id) do update set
          created_ts = excluded.created_ts,
          updated_ts = excluded.updated_ts,
          phase = excluded.phase,
          requested_by = excluded.requested_by,
          category = excluded.category,
          idea = excluded.idea,
          title = excluded.title,
          questions_json = excluded.questions_json,
          answers_json = excluded.answers_json,
          brief_json = excluded.brief_json,
          recommended_lane = excluded.recommended_lane,
          risks_json = excluded.risks_json,
          artifacts_json = excluded.artifacts_json,
          approvals_json = excluded.approvals_json,
          links_json = excluded.links_json,
          handoff_json = excluded.handoff_json,
          meta_json = excluded.meta_json`,
        [
          row.id, row.created_ts, row.updated_ts, row.phase, row.requested_by, row.category, row.idea, row.title,
          JSON.stringify(row.questions_json), JSON.stringify(row.answers_json), JSON.stringify(row.brief_json), row.recommended_lane,
          JSON.stringify(row.risks_json), JSON.stringify(row.artifacts_json), JSON.stringify(row.approvals_json),
          JSON.stringify(row.links_json), JSON.stringify(row.handoff_json), JSON.stringify(row.meta_json)
        ]
      );
      total += 1;
    }
  }
  return total;
}

async function upsertWorkItems(pool, tableName, rows) {
  const sqlTable = quoteIdentifier(tableName);
  let total = 0;
  for (const batch of chunk(rows.filter(Boolean), 100)) {
    for (const row of batch) {
      await pool.query(
        `insert into ${sqlTable} (
          id, created_ts, title, objective, stage, risk, owner_agent_id, data_json
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb
        )
        on conflict (id) do update set
          created_ts = excluded.created_ts,
          title = excluded.title,
          objective = excluded.objective,
          stage = excluded.stage,
          risk = excluded.risk,
          owner_agent_id = excluded.owner_agent_id,
          data_json = excluded.data_json`,
        [row.id, row.created_ts, row.title, row.objective, row.stage, row.risk, row.owner_agent_id, JSON.stringify(row.data_json)]
      );
      total += 1;
    }
  }
  return total;
}

async function upsertApprovals(pool, tableName, rows) {
  const sqlTable = quoteIdentifier(tableName);
  let total = 0;
  for (const batch of chunk(rows.filter(Boolean), 100)) {
    for (const row of batch) {
      await pool.query(
        `insert into ${sqlTable} (
          id, created_ts, status, requested_by, policy, summary, payload_json
        ) values (
          $1, $2, $3, $4, $5, $6, $7::jsonb
        )
        on conflict (id) do update set
          created_ts = excluded.created_ts,
          status = excluded.status,
          requested_by = excluded.requested_by,
          policy = excluded.policy,
          summary = excluded.summary,
          payload_json = excluded.payload_json`,
        [row.id, row.created_ts, row.status, row.requested_by, row.policy, row.summary, JSON.stringify(row.payload_json)]
      );
      total += 1;
    }
  }
  return total;
}

async function verifyCount(pool, tableName) {
  const result = await pool.query(`select count(*)::int as count from ${quoteIdentifier(tableName)}`);
  return Number(result.rows[0]?.count || 0);
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const databaseUrl = readEnv("ATEAM_DATABASE_URL") || readEnv("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("ATEAM_DATABASE_URL or DATABASE_URL is required.");
  }

  const tables = {
    approvals: readEnv("SUPABASE_TABLE_ATEAM_APPROVALS") || "ateam_approvals",
    workItems: readEnv("SUPABASE_TABLE_ATEAM_WORK_ITEMS") || "ateam_work_items",
    workflowRuns: readEnv("SUPABASE_TABLE_ATEAM_WORKFLOW_RUNS") || "ateam_workflow_runs"
  };

  if (!fs.existsSync(DEFAULT_SCHEMA_PATH)) {
    throw new Error(`Schema file not found: ${DEFAULT_SCHEMA_PATH}`);
  }

  const pool = new Pool(buildPoolConfig(databaseUrl));
  await pool.query(fs.readFileSync(DEFAULT_SCHEMA_PATH, "utf8"));

  const source = hasFlag("--source-http")
    ? await loadFromHttp()
    : loadFromSqlite(readArg("--source-db") || readEnv("ATEAM_SQLITE_PATH") || DEFAULT_SQLITE_PATH);

  const runs = source.runs.map(normalizeRunRow).filter(Boolean);
  const workItems = source.workItems.map(normalizeWorkItemRow).filter(Boolean);
  const approvals = source.approvals.map(normalizeApprovalRow).filter(Boolean);

  const summary = {
    sourceType: source.sourceType,
    discovered: {
      workflowRuns: runs.length,
      workItems: workItems.length,
      approvals: approvals.length
    },
    tables
  };

  if (hasFlag("--dry-run")) {
    console.log(JSON.stringify({ ok: true, dryRun: true, ...summary }, null, 2));
    await pool.end();
    return;
  }

  const importedWorkflowRuns = await upsertRuns(pool, tables.workflowRuns, runs);
  const importedWorkItems = await upsertWorkItems(pool, tables.workItems, workItems);
  const importedApprovals = await upsertApprovals(pool, tables.approvals, approvals);

  const verified = {
    workflowRuns: await verifyCount(pool, tables.workflowRuns),
    workItems: await verifyCount(pool, tables.workItems),
    approvals: await verifyCount(pool, tables.approvals)
  };

  await pool.end();

  console.log(JSON.stringify({
    ok: true,
    ...summary,
    imported: {
      workflowRuns: importedWorkflowRuns,
      workItems: importedWorkItems,
      approvals: importedApprovals
    },
    verified
  }, null, 2));
}

main().catch(async (error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
  process.exit(1);
});
