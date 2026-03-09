const AGENT_PROFILES = {
  Coach: {
    role: "Coordinator",
    focus: "priorities, sequencing, and decision framing"
  },
  Builder: {
    role: "Implementation",
    focus: "code, fixes, and delivery steps"
  },
  Scout: {
    role: "Research",
    focus: "options, risks, and external signals"
  },
  "Think Tank": {
    role: "Reasoning",
    focus: "clarity, frameworks, and explanations"
  },
  Strategist: {
    role: "Planning",
    focus: "architecture and roadmap"
  }
};

const ALIASES = {
  coach: "Coach",
  builder: "Builder",
  scout: "Scout",
  thinker: "Think Tank",
  thinktank: "Think Tank",
  "think tank": "Think Tank",
  strategist: "Strategist",
  podcast: "Coach",
  cohost: "Coach",
  "co-host": "Coach"
};

function normalizeAgent(input) {
  const key = String(input || "").trim().toLowerCase();
  return ALIASES[key] || "";
}

function inferAgentFromMessage(message) {
  const text = String(message || "").toLowerCase();
  if (/\b(code|bug|fix|endpoint|server|build)\b/.test(text)) return "Builder";
  if (/\b(research|market|compare|jobs|salary|trend|podcast|social|youtube|tiktok|instagram)\b/.test(text)) return "Scout";
  if (/\b(strategy|roadmap|architecture|sequence|plan)\b/.test(text)) return "Strategist";
  if (/\b(learn|explain|tradeoff|risk|unknown|think)\b/.test(text)) return "Think Tank";
  return "Coach";
}

function inferIntent(message) {
  const text = String(message || "").toLowerCase();
  if (/\b(approve|revise|kill|decision)\b/.test(text)) return "decision";
  if (/\b(plan|roadmap|next step|what next)\b/.test(text)) return "planning";
  if (/\b(status|progress|where are we)\b/.test(text)) return "status";
  if (/\b(help|how|what|why|can you)\b/.test(text)) return "assist";
  return "chat";
}

function inferMood(intent) {
  if (intent === "decision") return "focused";
  if (intent === "planning") return "structured";
  if (intent === "status") return "informative";
  return "calm";
}

async function maybeRunTool(message, taskId, toolRegistry) {
  const text = String(message || "").toLowerCase();

  if (/\btime\b/.test(text)) {
    return toolRegistry.runTool("get_time", {});
  }

  if (/\blist tasks\b|\ball tasks\b/.test(text)) {
    return toolRegistry.runTool("list_tasks", {});
  }

  if (/\btask status\b|\bstatus of\b/.test(text)) {
    return toolRegistry.runTool("get_task_status", { taskId });
  }

  return null;
}

export async function routeAgentCommand({
  taskId,
  agent,
  message,
  mode,
  voiceStyle,
  llmOptions,
  onToken,
  contextBundle,
  toolRegistry,
  llmAdapter
}) {
  const forced = normalizeAgent(agent);
  const resolvedAgent = forced || inferAgentFromMessage(message);
  const intent = inferIntent(message);
  const mood = inferMood(intent);
  const profile = AGENT_PROFILES[resolvedAgent] || AGENT_PROFILES.Coach;
  const toolOutput = await maybeRunTool(message, taskId, toolRegistry);

  const llmPayload = {
    agent: resolvedAgent,
    message,
    intent,
    mood,
    mode: mode || "dashboard",
    voiceStyle: voiceStyle || "male_assistant",
    profile,
    contextBundle,
    toolOutput,
    llmOptions
  };

  const llm =
    llmOptions?.stream && typeof llmAdapter.respondStream === "function"
      ? await llmAdapter.respondStream(llmPayload, onToken)
      : await llmAdapter.respond(llmPayload);

  return {
    agent: resolvedAgent,
    mood: llm.mood || mood,
    intent: llm.intent || intent,
    reply: llm.reply,
    modelUsed: llm.modelUsed || "",
    fallbackUsed: Boolean(llm.fallbackUsed),
    route: {
      forced: Boolean(forced),
      agent: resolvedAgent,
      intent,
      mode: mode || "dashboard"
    }
  };
}
