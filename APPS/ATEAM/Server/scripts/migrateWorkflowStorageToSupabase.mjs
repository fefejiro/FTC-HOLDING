import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SQLITE_PATH = path.join(__dirname, "..", "..", "memory", "mission_control.sqlite");

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

function printHelp() {
  console.log(`ATEAM workflow migration -> Supabase

Usage:
  node scripts/migrateWorkflowStorageToSupabase.mjs [--source-db <path>]
  node scripts/migrateWorkflowStorageToSupabase.mjs --source-http

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
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Optional target table env:
  SUPABASE_TABLE_ATEAM_APPROVALS
  SUPABASE_TABLE_ATEAM_WORK_ITEMS
  SUPABASE_TABLE_ATEAM_WORKFLOW_RUNS

Flags:
  --dry-run              Print discovered counts without writing
  --help                 Show this help
`);
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText} :: ${text.slice(0, 240)}`);
  }
  return response.json();
}

async function loadFromHttp() {
  const publicOrigin = readArg("--public-origin") || readEnv("ATEAM_SOURCE_PUBLIC_ORIGIN") || "https://unalabs.cloud";
  const publicPath =
    readArg("--public-path") || readEnv("ATEAM_SOURCE_PUBLIC_PATH") || "/api/ateam/workflow/runs?limit=120";
  const opsOrigin = readArg("--ops-origin") || readEnv("ATEAM_SOURCE_OPS_ORIGIN") || "https://ops.unalabs.cloud";
  const workItemsPath =
    readArg("--work-items-path") ||
    readEnv("ATEAM_SOURCE_WORK_ITEMS_PATH") ||
    "/api/operator/ateam/work-items?limit=200";
  const approvalsPath =
    readArg("--approvals-path") ||
    readEnv("ATEAM_SOURCE_APPROVALS_PATH") ||
    "/api/operator/ateam/approvals?limit=200";

  const basicAuth = getBasicAuthHeader();
  const opsHeaders = basicAuth ? { authorization: basicAuth } : {};

  const [runsPayload, workItemsPayload, approvalsPayload] = await Promise.all([
    fetchJson(new URL(publicPath, publicOrigin).toString()),
    fetchJson(new URL(workItemsPath, opsOrigin).toString(), opsHeaders),
    fetchJson(new URL(approvalsPath, opsOrigin).toString(), opsHeaders)
  ]);

  const runs = Array.isArray(runsPayload?.runs) ? runsPayload.runs : [];
  const workItems = Array.isArray(workItemsPayload?.items) ? workItemsPayload.items : [];
  const approvals = Array.isArray(approvalsPayload?.approvals) ? approvalsPayload.approvals : [];

  return {
    sourceType: "http",
    runs,
    workItems,
    approvals
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

async function upsertRows(client, tableName, rows) {
  const cleanRows = rows.filter(Boolean).filter((row) => String(row.id || "").trim());
  if (!cleanRows.length) return 0;
  let total = 0;
  for (const batch of chunk(cleanRows, 100)) {
    const { error } = await client.from(tableName).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`${tableName} upsert failed: ${error.message}`);
    total += batch.length;
  }
  return total;
}

async function verifyCount(client, tableName) {
  const { count, error } = await client.from(tableName).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${tableName} count failed: ${error.message}`);
  return Number(count || 0);
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const tables = {
    approvals: readEnv("SUPABASE_TABLE_ATEAM_APPROVALS") || "ateam_approvals",
    workItems: readEnv("SUPABASE_TABLE_ATEAM_WORK_ITEMS") || "ateam_work_items",
    workflowRuns: readEnv("SUPABASE_TABLE_ATEAM_WORKFLOW_RUNS") || "ateam_workflow_runs"
  };

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const source =
    hasFlag("--source-http")
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
    return;
  }

  const importedWorkflowRuns = await upsertRows(supabase, tables.workflowRuns, runs);
  const importedWorkItems = await upsertRows(supabase, tables.workItems, workItems);
  const importedApprovals = await upsertRows(supabase, tables.approvals, approvals);

  const verified = {
    workflowRuns: await verifyCount(supabase, tables.workflowRuns),
    workItems: await verifyCount(supabase, tables.workItems),
    approvals: await verifyCount(supabase, tables.approvals)
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...summary,
        imported: {
          workflowRuns: importedWorkflowRuns,
          workItems: importedWorkItems,
          approvals: importedApprovals
        },
        verified
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: String(error?.message || error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
