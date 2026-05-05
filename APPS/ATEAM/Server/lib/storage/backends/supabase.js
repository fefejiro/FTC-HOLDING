import { createClient } from "@supabase/supabase-js";
import { createLocalRepositories } from "./local.js";
import { createSupabaseCoreStores } from "./supabaseCore.js";

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function buildCapability({ configured, storageBucket, fallbackBackend = "" } = {}) {
  return {
    provider: "supabase",
    configured: Boolean(configured),
    storageBucket: storageBucket || "ateam-audio",
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    fallbackBackend: fallbackBackend || ""
  };
}

export function createSupabaseRepositories({ memoryDir = "" } = {}) {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const storageBucket = readEnv("SUPABASE_STORAGE_BUCKET_AUDIO") || "ateam-audio";
  const configured = Boolean(supabaseUrl && supabaseServiceRoleKey);
  const localFallback = createLocalRepositories({ memoryDir });

  if (!configured) {
    return {
      ...localFallback,
      backend: "local",
      capability: buildCapability({
        configured: false,
        storageBucket,
        fallbackBackend: "local"
      })
    };
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { approvalStore, workItemStore, workflowRunStore, capability } = createSupabaseCoreStores({
    client,
    tableNames: {
      approvals: readEnv("SUPABASE_TABLE_ATEAM_APPROVALS"),
      workItems: readEnv("SUPABASE_TABLE_ATEAM_WORK_ITEMS"),
      workflowRuns: readEnv("SUPABASE_TABLE_ATEAM_WORKFLOW_RUNS")
    }
  });

  return {
    ...localFallback,
    backend: "supabase",
    capability: {
      ...buildCapability({
        configured: true,
        storageBucket
      }),
      ...capability
    },
    approvalStore,
    workItemStore,
    workflowRunStore
  };
}
