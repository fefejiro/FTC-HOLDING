function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function throwNotConfigured(details = "supabase_adapter_not_configured") {
  const err = new Error(details);
  err.code = "SUPABASE_ADAPTER_NOT_CONFIGURED";
  throw err;
}

function createPlaceholderStore(name) {
  return {
    async ensure() {
      throwNotConfigured(`${name}.ensure_not_configured`);
    }
  };
}

export function createSupabaseRepositories() {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const storageBucket = readEnv("SUPABASE_STORAGE_BUCKET_AUDIO") || "ateam-audio";
  const configured = Boolean(supabaseUrl && supabaseServiceRoleKey);

  const capability = {
    provider: "supabase",
    configured,
    storageBucket,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
  };

  if (!configured) {
    const threadStore = createPlaceholderStore("threadStore");
    const taskStore = createPlaceholderStore("taskStore");
    const memoryStore = createPlaceholderStore("memoryStore");
    const speechClarityStore = createPlaceholderStore("speechClarityStore");
    const contentPipelineStore = createPlaceholderStore("contentPipelineStore");
    return {
      backend: "supabase",
      capability,
      threadStore,
      taskStore,
      memoryStore,
      speechClarityStore,
      contentPipelineStore
    };
  }

  throwNotConfigured("supabase_adapter_scaffold_only");
}
