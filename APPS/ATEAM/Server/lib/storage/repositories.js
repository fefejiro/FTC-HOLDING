import { createLocalRepositories } from "./backends/local.js";
import { createSupabaseRepositories } from "./backends/supabase.js";

const SUPPORTED_STORAGE_BACKENDS = new Set(["local", "supabase"]);

export function createRepositories({ backend = "local", memoryDir = "" } = {}) {
  const normalized = String(backend || "local").trim().toLowerCase();

  if (normalized === "local") {
    return createLocalRepositories({ memoryDir });
  }
  if (normalized === "supabase") {
    return createSupabaseRepositories({ memoryDir });
  }

  const err = new Error(`Unsupported storage backend: ${normalized}`);
  err.code = "UNSUPPORTED_STORAGE_BACKEND";
  err.supported = [...SUPPORTED_STORAGE_BACKENDS];
  throw err;
}
