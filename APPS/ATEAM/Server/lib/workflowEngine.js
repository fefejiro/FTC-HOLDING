function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeList(values = [], limit = 6) {
  return (Array.isArray(values) ? values : [])
    .map((value) => safeText(value, 160))
    .filter(Boolean)
    .slice(0, limit);
}

function answerText(answers, key, fallback = "", limit = 240) {
  const source = answers && typeof answers === "object" ? answers : {};
  return safeText(source[key], limit) || fallback;
}

function titleCaseFromIdea(idea) {
  const cleaned = safeText(idea, 120).replace(/[.?!]+$/g, "");
  if (!cleaned) return "ATEAM Workflow Run";
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ");
}

function slugify(value) {
  return safeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export const WORKFLOW_PHASES = [
  "intake",
  "analysis",
  "brief_approval",
  "initiation",
  "prototype_pack",
  "pack_approval",
  "handoff",
  "archived"
];

export const WORKFLOW_CATEGORY_PRESETS = {
  website: {
    label: "Website",
    recommendedLane: "Fast Website Launch",
    ownerAgentId: "henry",
    problemFrame: "clarify the offer and turn interest into a measurable next step",
    audienceHint: "buyers or visitors you want to convert quickly",
    screens: ["Landing", "Service Detail", "Lead Capture", "Proof / FAQ"],
    prototypeFrame: "quick route from first visit to qualified request",
    stack: ["Next.js", "Analytics", "Lead intake routing", "Performance tuning"],
    deliveryTheme: "conversion-first launch"
  },
  "lead-automation": {
    label: "Lead automation",
    recommendedLane: "Local Services Lead Engine",
    ownerAgentId: "henry",
    problemFrame: "capture, qualify, and route incoming demand without manual babysitting",
    audienceHint: "operators or teams handling inbound leads",
    screens: ["Capture Form", "Qualification Queue", "Routing Rules", "Follow-up Timeline"],
    prototypeFrame: "show how a lead moves from form submit to routed follow-up",
    stack: ["Webhook intake", "Routing logic", "Templates", "Visibility dashboard"],
    deliveryTheme: "automation-first intake"
  },
  "product-app": {
    label: "App",
    recommendedLane: "Product / App Build Path",
    ownerAgentId: "codex",
    problemFrame: "frame the MVP, the first useful workflow, and the safest build order",
    audienceHint: "end users adopting a new workflow or utility",
    screens: ["Onboarding", "Core Workflow", "Status / Feed", "Settings / Admin"],
    prototypeFrame: "prove the most important user journey before full build",
    stack: ["App shell", "API layer", "Analytics", "Release checklist"],
    deliveryTheme: "MVP-first product path"
  },
  "internal-tool": {
    label: "Internal tool",
    recommendedLane: "Internal Tool / Ops System",
    ownerAgentId: "charlie",
    problemFrame: "remove repeated manual steps and make execution visible",
    audienceHint: "operators, managers, or internal teams",
    screens: ["Ops Dashboard", "Queue / Backlog", "Task Detail", "Reporting"],
    prototypeFrame: "show the internal flow before deeper systems integration",
    stack: ["Dashboard shell", "Permissions", "Audit trail", "Automation hooks"],
    deliveryTheme: "ops visibility and control"
  },
  "ai-feature": {
    label: "AI workflow",
    recommendedLane: "AI Workflow / Product Direction",
    ownerAgentId: "violet",
    problemFrame: "place AI where it removes friction and improves judgment",
    audienceHint: "people who need faster decisions, not novelty",
    screens: ["Use-case Intake", "AI Assist Surface", "Human Review", "Outcome Log"],
    prototypeFrame: "make the human-in-the-loop path believable before wider rollout",
    stack: ["Model orchestration", "Guardrails", "Feedback loop", "Observability"],
    deliveryTheme: "guardrailed AI assist"
  }
};

export function normalizeWorkflowCategory(rawValue = "") {
  const normalized = safeText(rawValue, 40).toLowerCase();
  if (normalized && Object.prototype.hasOwnProperty.call(WORKFLOW_CATEGORY_PRESETS, normalized)) {
    return normalized;
  }
  return "website";
}

export function getWorkflowCategoryPreset(rawValue = "") {
  return WORKFLOW_CATEGORY_PRESETS[normalizeWorkflowCategory(rawValue)];
}

export function buildWorkflowProjectId(runId = "") {
  return `workflow_${slugify(runId) || "run"}`;
}

export function buildWorkflowQuestions({ idea = "", category = "website" } = {}) {
  const preset = getWorkflowCategoryPreset(category);
  const ideaTitle = titleCaseFromIdea(idea);
  return [
    {
      id: "audience",
      label: "Audience",
      prompt: `Who is this mainly for in "${ideaTitle}"?`,
      hint: `Keep it practical: ${preset.audienceHint}.`,
      placeholder: "Example: restaurant owners managing table bookings on WhatsApp."
    },
    {
      id: "coreOutcome",
      label: "Core outcome",
      prompt: "What is the one thing this should definitely make easier in v1?",
      hint: "Describe the first believable win, not the whole future product.",
      placeholder: "Example: let someone submit a request, get a clear response, and track the status."
    },
    {
      id: "constraints",
      label: "Constraints",
      prompt: "What constraint matters most right now: time, budget, team bandwidth, or risk?",
      hint: "Name the constraint and why it matters.",
      placeholder: "Example: needs a first version in two weeks with minimal setup."
    },
    {
      id: "signals",
      label: "Signals",
      prompt: "What proof or signal tells us this is worth building now?",
      hint: "Think demand, current pain, stakeholder push, or repeated manual work.",
      placeholder: "Example: we already handle this manually every day and keep missing leads."
    }
  ];
}

export function buildWorkflowBrief({ idea = "", category = "website", answers = {}, runId = "" } = {}) {
  const preset = getWorkflowCategoryPreset(category);
  const title = titleCaseFromIdea(idea);
  const audience = answerText(answers, "audience", preset.audienceHint, 220);
  const coreOutcome = answerText(
    answers,
    "coreOutcome",
    `Create a first version that can ${preset.problemFrame}.`,
    220
  );
  const constraints = answerText(
    answers,
    "constraints",
    "Move quickly without creating a fragile or oversized first release.",
    220
  );
  const signals = answerText(
    answers,
    "signals",
    "There is enough demand or internal pressure to justify a fast, credible first pass.",
    220
  );

  const goals = safeList([
    coreOutcome,
    `Keep the first release focused enough to fit a ${preset.deliveryTheme}.`,
    "Produce a handoff pack that Una Labs can scope without guesswork."
  ]);
  const constraintList = safeList([
    constraints,
    "Avoid overbuilding before the main workflow is proven.",
    "Keep the first pass explainable to both operators and stakeholders."
  ]);
  const successCriteria = safeList([
    `The first user can complete the main path for ${audience}.`,
    "The generated pack exposes enough structure for an implementation estimate.",
    "Operator work items can move through build, QA, review, and handoff without ambiguity."
  ]);
  const phasedPlan = safeList([
    "Intake and discovery: capture the idea, signals, and hard constraints.",
    "Brief shaping: turn answers into scope, lane, goals, risks, and a delivery path.",
    "Prototype pack: generate concept screens, prototype flow, smoke summary, and operator notes.",
    "Handoff: carry the brief into Una Labs intake with a clear next decision."
  ], 4);
  const operatorNotes = safeList([
    `Route the run through ${preset.recommendedLane}.`,
    `Use the proof signal as the first operator checkpoint: ${signals}`,
    `Protect the main constraint during delivery: ${constraints}`
  ], 4);

  return {
    title,
    summary: `${title} should ${preset.problemFrame} for ${audience}. The first pass stays narrow, testable, and ready for operator handoff.`,
    audience,
    scope: coreOutcome,
    primaryGoal: coreOutcome,
    signals,
    constraints: constraintList,
    goals,
    successCriteria,
    recommendedLane: preset.recommendedLane,
    phasedPlan,
    operatorNotes,
    runLabel: runId ? `Workflow run ${runId}` : "Workflow run"
  };
}

export function buildWorkflowRisks({ brief, answers = {}, category = "website" } = {}) {
  const preset = getWorkflowCategoryPreset(category);
  const constraints = answerText(answers, "constraints", "", 220);
  const signals = answerText(answers, "signals", "", 220);
  return safeList([
    constraints ? `Primary constraint pressure: ${constraints}` : "",
    signals ? `Signal quality still needs confirmation: ${signals}` : "",
    `Scope can sprawl unless the team protects the ${preset.deliveryTheme} path.`,
    brief?.audience ? `Audience clarity should stay grounded in ${brief.audience}.` : ""
  ], 4);
}

function buildMockupScreens(run, preset) {
  const title = run?.brief?.title || titleCaseFromIdea(run?.idea || "");
  const scope = run?.brief?.scope || run?.brief?.primaryGoal || preset.problemFrame;
  const audience = run?.brief?.audience || preset.audienceHint;
  const screens = preset.screens.map((screenTitle, index) => ({
    id: `screen_${index + 1}`,
    title: `${screenTitle}`,
    caption:
      index === 0
        ? `Open with the clearest promise for ${audience}.`
        : index === preset.screens.length - 1
          ? `Close the loop so ${title} feels ready for handoff or follow-up.`
          : `Carry the user deeper into ${scope.toLowerCase()}.`,
    highlights: safeList([
      index === 0 ? "Hero message, trust proof, and a single action" : "",
      index === 1 ? "Core workflow block with visible progress" : "",
      index === 2 ? "Decision support and human review moments" : "",
      index >= 3 ? "Next step, route, or confirmation" : "",
      `Tone: ${preset.deliveryTheme}`
    ], 4)
  }));
  return screens.slice(0, 5);
}

function buildPrototypeFrames(run, preset) {
  const title = run?.brief?.title || titleCaseFromIdea(run?.idea || "");
  return [
    {
      id: "frame_entry",
      title: "Start",
      purpose: `Introduce ${title} and invite the first useful action.`,
      interactions: safeList([
        "Primary CTA routes into a focused intake or action path.",
        "Secondary CTA reveals proof, context, or examples."
      ], 3)
    },
    {
      id: "frame_flow",
      title: "Core Flow",
      purpose: preset.prototypeFrame,
      interactions: safeList([
        "User completes the main decision or submission path.",
        "System exposes status, feedback, or next move in plain language."
      ], 3)
    },
    {
      id: "frame_review",
      title: "Review",
      purpose: "Show operator review, visibility, or approval before the run is shipped onward.",
      interactions: safeList([
        "Human review keeps the outcome safe and scoped.",
        "Route into build, QA, or handoff is visible."
      ], 3)
    }
  ];
}

export function buildWorkflowPack({ run } = {}) {
  const category = normalizeWorkflowCategory(run?.category);
  const preset = getWorkflowCategoryPreset(category);
  const brief = run?.brief || buildWorkflowBrief({ idea: run?.idea, category, answers: run?.answers, runId: run?.id });
  const mockupScreens = buildMockupScreens({ ...run, brief }, preset);
  const prototypeFrames = buildPrototypeFrames({ ...run, brief }, preset);
  const nextSteps = safeList([
    "Review the generated brief with a human and protect the main constraint.",
    `Use ${preset.recommendedLane} as the default delivery lane unless new context changes the path.`,
    "Carry the run into Una Labs intake with the brief, pack, and the clearest next ask."
  ], 4);

  return {
    mockup: {
      title: `${brief.title} concept pack`,
      summary: `Figma-looking concept screens for the first believable version of ${brief.title}.`,
      screens: mockupScreens
    },
    prototype: {
      title: `${brief.title} clickable prototype`,
      summary: `A lightweight route map that demonstrates ${preset.prototypeFrame}.`,
      frames: prototypeFrames,
      stack: preset.stack
    },
    smoke: {
      status: "ready_for_operator_review",
      summary: "Quick smoke pass prepared so the first prototype review stays high-level and practical.",
      checks: [
        {
          label: "Main route loads",
          result: "ready",
          note: "The first screen, the core flow, and the review state are all represented."
        },
        {
          label: "Primary actions stay visible",
          result: "ready",
          note: "CTA, transition, and review actions are called out in the prototype frames."
        },
        {
          label: "No fatal scope gaps",
          result: "watch",
          note: "Operator still needs to confirm integrations, data edges, and copy before a real build."
        }
      ]
    },
    doc: {
      title: `${brief.title} operator note`,
      summary: `Scope, lane, risks, and prototype direction for ${brief.title}.`,
      sections: [
        {
          title: "Recommended lane",
          items: [brief.recommendedLane, ...safeList(brief.phasedPlan || [], 4)]
        },
        {
          title: "Risk watch",
          items: safeList(run?.risks || [], 4)
        },
        {
          title: "Operator notes",
          items: safeList(brief.operatorNotes || [], 4)
        }
      ]
    },
    nextSteps
  };
}

export function buildWorkflowHandoff({ run } = {}) {
  const category = normalizeWorkflowCategory(run?.category);
  const preset = getWorkflowCategoryPreset(category);
  const brief = run?.brief || buildWorkflowBrief({ idea: run?.idea, category, answers: run?.answers, runId: run?.id });
  const artifacts = run?.artifacts || buildWorkflowPack({ run: { ...run, brief } });
  return {
    version: 2,
    runId: String(run?.id || "").trim(),
    createdAtMs: Date.now(),
    idea: safeText(run?.idea, 500),
    categoryValue: category,
    categoryLabel: preset.label,
    recommendedLane: brief.recommendedLane,
    phase: String(run?.phase || "handoff"),
    brief: {
      title: brief.title,
      summary: brief.summary,
      audience: brief.audience,
      primaryGoal: brief.primaryGoal,
      goals: safeList(brief.goals || [], 5),
      constraints: safeList(brief.constraints || [], 5),
      successCriteria: safeList(brief.successCriteria || [], 5),
      phasedPlan: safeList(brief.phasedPlan || [], 5)
    },
    artifacts: {
      mockupTitle: safeText(artifacts?.mockup?.title, 140),
      prototypeTitle: safeText(artifacts?.prototype?.title, 140),
      smokeSummary: safeText(artifacts?.smoke?.summary, 200),
      docTitle: safeText(artifacts?.doc?.title, 140)
    },
    nextSteps: safeList(artifacts?.nextSteps || [], 5)
  };
}

export function buildWorkflowWorkItems(run) {
  const category = normalizeWorkflowCategory(run?.category);
  const preset = getWorkflowCategoryPreset(category);
  const brief = run?.brief || buildWorkflowBrief({ idea: run?.idea, category, answers: run?.answers, runId: run?.id });
  const projectId = buildWorkflowProjectId(run?.id);
  return {
    projectId,
    ownerAgentId: preset.ownerAgentId,
    items: [
      {
        title: `Route ${brief.title}`,
        objective: `Office intake and routing for ${brief.title}.`,
        stage: "BACKLOG",
        ownerAgentId: "henry",
        data: {
          projectId,
          workflowRunId: run?.id,
          workflowKind: "workflow_run",
          workflowStep: "initiation"
        }
      },
      {
        title: `Prototype pack for ${brief.title}`,
        objective: `Build the first prototype pack for ${brief.title} and protect the ${preset.deliveryTheme} lane.`,
        stage: "BUILD",
        ownerAgentId: preset.ownerAgentId,
        data: {
          projectId,
          workflowRunId: run?.id,
          workflowKind: "workflow_run",
          workflowStep: "prototype_pack"
        }
      },
      {
        title: `Smoke test ${brief.title}`,
        objective: `Run a quick smoke pass so the generated prototype stays reviewable.`,
        stage: "QA",
        ownerAgentId: "ralph",
        data: {
          projectId,
          workflowRunId: run?.id,
          workflowKind: "workflow_run",
          workflowStep: "smoke"
        }
      },
      {
        title: `Handoff ${brief.title}`,
        objective: `Prepare the Una Labs handoff pack and next-step recommendation.`,
        stage: "REVIEW",
        ownerAgentId: "henry",
        data: {
          projectId,
          workflowRunId: run?.id,
          workflowKind: "workflow_run",
          workflowStep: "handoff"
        }
      }
    ]
  };
}
