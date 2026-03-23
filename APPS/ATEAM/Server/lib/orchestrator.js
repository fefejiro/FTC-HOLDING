import crypto from "crypto";

function safeText(value, limit = 220) {
  return String(value || "").trim().slice(0, limit);
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Deterministic orchestrator stub.
 * TODO: Replace with model-backed planner once the event + approvals plumbing is stable.
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
        text: `Orchestrator stub generated a plan for ${page}.` + (userGoal ? ` Goal: ${safeText(userGoal, 120)}` : "")
      }
    ],
    next_questions: [],
    session_id: sessionId,
    thread_id: threadId
  };
}

