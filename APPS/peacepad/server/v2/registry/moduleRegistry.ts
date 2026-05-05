export const MODULE_IDS = {
  CONVERSATION_ORCHESTRATE: "PP_MOD_CONVERSATION_ORCHESTRATE",
  ROUTER_INTENT: "PP_MOD_ROUTER_INTENT",
  CONFLICT_CHECK: "PP_MOD_CONFLICT_CHECK",
  REWRITE_MESSAGE: "PP_MOD_REWRITE_MESSAGE",
  SUPPORT_DISCOVERY: "PP_MOD_SUPPORT_DISCOVERY",
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];
export type ModuleRiskLevel = "low" | "medium" | "high";

export interface ModuleRegistryEntry {
  module_id: ModuleId;
  title: string;
  description: string;
  tags: string[];
  risk_level: ModuleRiskLevel;
  endpoint_path: string;
  version: "v2";
}

export const moduleRegistry: Record<ModuleId, ModuleRegistryEntry> = {
  [MODULE_IDS.CONVERSATION_ORCHESTRATE]: {
    module_id: MODULE_IDS.CONVERSATION_ORCHESTRATE,
    title: "Conversation Orchestrator",
    description:
      "Composes intent routing, conflict checks, rewrite, and support modules into a unified assistant response envelope.",
    tags: ["orchestration", "assistant", "conversation"],
    risk_level: "medium",
    endpoint_path: "/v2/conversation/orchestrate",
    version: "v2",
  },
  [MODULE_IDS.ROUTER_INTENT]: {
    module_id: MODULE_IDS.ROUTER_INTENT,
    title: "Intent Router",
    description: "Routes free-form user intent to the most relevant PeacePad v2 module.",
    tags: ["routing", "intent", "orchestration"],
    risk_level: "low",
    endpoint_path: "/v2/router/intent",
    version: "v2",
  },
  [MODULE_IDS.CONFLICT_CHECK]: {
    module_id: MODULE_IDS.CONFLICT_CHECK,
    title: "Conflict Check",
    description:
      "Analyzes language and context for escalation risk, conflict level, and safety guidance.",
    tags: ["conflict", "safety", "analysis"],
    risk_level: "medium",
    endpoint_path: "/v2/modules/conflict-check",
    version: "v2",
  },
  [MODULE_IDS.REWRITE_MESSAGE]: {
    module_id: MODULE_IDS.REWRITE_MESSAGE,
    title: "Rewrite Message",
    description:
      "Rewrites a draft into calm, neutral, and boundary-safe variants tuned for co-parent communication.",
    tags: ["rewrite", "tone", "communication"],
    risk_level: "medium",
    endpoint_path: "/v2/modules/rewrite-message",
    version: "v2",
  },
  [MODULE_IDS.SUPPORT_DISCOVERY]: {
    module_id: MODULE_IDS.SUPPORT_DISCOVERY,
    title: "Support Discovery",
    description:
      "Finds ranked local and online support resources with crisis-first gating when risk is high.",
    tags: ["resources", "support", "safety"],
    risk_level: "high",
    endpoint_path: "/v2/modules/support-discovery",
    version: "v2",
  },
};

export const moduleCatalog: ModuleRegistryEntry[] = Object.values(moduleRegistry);

export function isValidModuleId(value: string): value is ModuleId {
  return value in moduleRegistry;
}

export function getModuleRegistryEntry(moduleId: string): ModuleRegistryEntry | undefined {
  if (!isValidModuleId(moduleId)) {
    return undefined;
  }
  return moduleRegistry[moduleId];
}
