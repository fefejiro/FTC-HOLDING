import crypto from "crypto";

const PLANNER_MODEL_DEFAULT = "gpt-4o-mini";
const PLANNER_TIMEOUT_MS_DEFAULT = 20_000;

function safeText(value, limit = 220) {
  return String(value || "").trim().slice(0, limit);
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Extract the first JSON object from a model reply that may include prose or fenced code blocks.
 */
function extractJson(text = "") {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("planner_empty_reply");
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace >= firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate;
  return JSON.parse(slice);
}

/**
 * Call the OpenAI Responses API to generate a structured execution plan.
 * Returns the parsed JSON plan or throws on failure.
 */
async function callPlannerModel({ page, userGoal, sessionId }) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("openai_api_key_missing");

  const model =
    process.env.OPENAI_MODEL_ORCHESTRATOR ||
    process.env.OPENAI_MODEL_DASH_PRIMARY ||
    process.env.OPENAI_MODEL ||
    PLANNER_MODEL_DEFAULT;

  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || PLANNER_TIMEOUT_MS_DEFAULT);

  const systemPrompt = [
    "You are the ATEAM orchestrator planner. Produce a concise JSON execution plan for the given context.",
    "Return ONLY valid JSON — no prose, no markdown fences — matching this exact shape:",
    JSON.stringify({
      intent: "conversation | system_design",
      timebox_minutes: 20,
      plan: {
        objective: "one-sentence goal",
        success_criteria: ["criterion 1", "criterion 2"],
        tasks: [
          {
            task_id: "t1",
            title: "task title",
            assigned_agent_id: "coach | builder | scout | quill",
            tools: [],
            requires_approval: false,
            outputs: ["output_key"]
          }
        ]
      },
      proposals: [],
      emit_events: [
        {
          type: "agent_message",
          source: { kind: "agent", agent_id: "coach", display: "Coach" },
          title: "event title",
          text: "short event description"
        }
      ],
      next_questions: []
    }),
    "Rules:",
    "- intent: 'conversation' for the talk page, 'system_design' for all other pages.",
    "- timebox_minutes: integer between 5 and 60.",
    "- tasks: 1 to 3 items; valid agent IDs are coach, builder, scout, quill.",
    "- requires_approval: false unless the task has outbound side effects.",
    "- proposals: include at most one create_work_item proposal (risk: low) when a clear user goal is present; empty array otherwise.",
    "- emit_events: include exactly one agent_message event summarising the plan.",
    "- next_questions: empty array or 1-2 short clarifying questions if the goal is vague."
  ].join("\n");

  const userPrompt = [
    `Page: ${page}`,
    `User goal: ${userGoal || "(none provided)"}`,
    `Session: ${sessionId}`,
    "Output the JSON plan now."
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) ? timeoutMs : PLANNER_TIMEOUT_MS_DEFAULT
  );

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 600,
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      throw new Error(`planner_model_error_${res.status}: ${details}`.trim());
    }

    const payload = await res.json();
    const directText =
      typeof payload?.output_text === "string" ? payload.output_text.trim() : "";
    const rawText =
      directText ||
      (Array.isArray(payload?.output)
        ? payload.output
            .flatMap((i) => (Array.isArray(i?.content) ? i.content : []))
            .map((p) => (typeof p?.text === "string" ? p.text : ""))
            .join("\n")
            .trim()
        : "");

    return extractJson(rawText);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate that the model response has the required structure before using it.
 */
function isValidModelPlan(plan) {
  return (
    plan !== null &&
    typeof plan === "object" &&
    (plan.intent === "conversation" || plan.intent === "system_design") &&
    plan.plan !== null &&
    typeof plan.plan === "object" &&
    Array.isArray(plan.plan.tasks) &&
    plan.plan.tasks.length > 0
  );
}

/**
 * Heuristic (rule-based) orchestrator planner.
 * Retained as the primary fallback when the model-backed planner fails.
 */
export function planOrchestration(input = {}) {
  const sessionId = safeText(input.session_id || input.sessionId || input.session || "global_podcast", 120);
  const threadId = safeText(input.thread_id || input.threadId || input.thread || sessionId, 120);
  const page = safeText(input.page || "talk", 32).toLowerCase();
  const userGoal = safeText(input.user_goal || input.userGoal || "", 240);

  const objective =
    page === "factory"
      ? "Move work items through Build → QA → Review → Ship safely"
      : page === "calendar"
        ? "Run scheduled routines and produce reviewable outputs"
        : page === "memory"
          ? "Capture decisions and retrieve relevant context quickly"
          : page === "office"
            ? "Show who is doing what and what needs your attention"
            : "Convert intent into a short, safe execution plan";

  const task1 = {
    task_id: "t1",
    title: "Define next actions",
    assigned_agent_id: "coach",
    tools: [],
    requires_approval: false,
    outputs: ["next_actions"]
  };

  const task2 = {
    task_id: "t2",
    title: "Draft the artifact",
    assigned_agent_id: "builder",
    tools: [],
    requires_approval: false,
    outputs: ["draft_output"]
  };

  const shouldCreateWorkItem = Boolean(userGoal);
  const proposal = shouldCreateWorkItem
    ? {
        proposal_id: "p1",
        kind: "create_work_item",
        risk: "low",
        requires_approval: false,
        payload: {
          id: createId("wi"),
          title: safeText(userGoal || "New work item", 80),
          objective: safeText(userGoal || objective, 180),
          stage: "BACKLOG"
        }
      }
    : null;

  return {
    intent: page === "talk" ? "conversation" : "system_design",
    timebox_minutes: 20,
    plan: {
      objective,
      success_criteria: ["Clear next steps", "Events emitted for traceability", "No outbound actions without approval"],
      tasks: [task1, task2]
    },
    proposals: proposal ? [proposal] : [],
    emit_events: [
      {
        type: "agent_message",
        source: { kind: "agent", agent_id: "coach", display: "Coach" },
        title: "Next build steps",
        text: `Orchestrator generated a plan for ${page}.` + (userGoal ? ` Goal: ${safeText(userGoal, 120)}` : "")
      }
    ],
    next_questions: [],
    session_id: sessionId,
    thread_id: threadId,
    planner: "heuristic"
  };
}

/**
 * Async model-backed orchestrator planner with heuristic fallback.
 *
 * Attempts to call the OpenAI API to generate a context-aware plan.
 * Falls back to planOrchestration() if the model call fails for any reason
 * (missing API key, network error, invalid JSON, unexpected shape, etc.).
 */
export async function planOrchestrationAsync(input = {}) {
  const sessionId = safeText(input.session_id || input.sessionId || input.session || "global_podcast", 120);
  const threadId = safeText(input.thread_id || input.threadId || input.thread || sessionId, 120);
  const page = safeText(input.page || "talk", 32).toLowerCase();
  const userGoal = safeText(input.user_goal || input.userGoal || "", 240);

  let modelPlan = null;
  try {
    modelPlan = await callPlannerModel({ page, userGoal, sessionId });
  } catch (err) {
    console.warn("[orchestrator] model planner failed, falling back to heuristic:", err?.message || err);
    modelPlan = null;
  }

  if (isValidModelPlan(modelPlan)) {
    return {
      ...modelPlan,
      proposals: Array.isArray(modelPlan.proposals) ? modelPlan.proposals : [],
      emit_events: Array.isArray(modelPlan.emit_events) ? modelPlan.emit_events : [],
      next_questions: Array.isArray(modelPlan.next_questions) ? modelPlan.next_questions : [],
      session_id: sessionId,
      thread_id: threadId,
      planner: "model"
    };
  }

  return planOrchestration(input);
}

