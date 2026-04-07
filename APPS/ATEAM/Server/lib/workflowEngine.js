function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeList(values = [], limit = 6) {
  return (Array.isArray(values) ? values : [])
    .map((value) => safeText(value, 220))
    .filter(Boolean)
    .slice(0, limit);
}

function answerText(answers, key, fallback = "", limit = 240) {
  const source = answers && typeof answers === "object" ? answers : {};
  return safeText(source[key], limit) || fallback;
}

function normalizeStringArray(value, limit = 6) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\n|,/)
        .map((item) => item.trim());
  return source
    .map((item) => safeText(item, 220))
    .filter(Boolean)
    .slice(0, limit);
}

function titleCaseFromIdea(idea) {
  const cleaned = safeText(idea, 120).replace(/[.?!]+$/g, "");
  if (!cleaned) return "ATEAM Workflow Run";
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function trimTrailingJoiners(text = "") {
  return String(text || "")
    .replace(/\b(that|which|with|for|to|into|from|of|and|or|in|on|at)\b\s*$/i, "")
    .trim();
}

function deriveWorkflowTitle(idea = "", fallback = "ATEAM Workflow Run") {
  const cleaned = safeText(idea, 180).replace(/[.?!]+$/g, "");
  if (!cleaned) return fallback;

  let working = cleaned
    .replace(/^(i want to|we want to|we need to|i need to)\s+/i, "")
    .replace(/^(build|create|make|launch|design|turn|set up|setup)\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "");

  const splitter = /\b(?:that|which|so|while|without|using|with)\b/i;
  if (splitter.test(working)) {
    working = working.split(splitter)[0].trim();
  }

  working = trimTrailingJoiners(working);
  const words = working.split(/\s+/).filter(Boolean).slice(0, 7);
  const normalized = trimTrailingJoiners(words.join(" "));

  if (!normalized) return titleCaseFromIdea(cleaned);
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugify(value) {
  return safeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function lowerFirst(value = "") {
  const text = safeText(value, 260);
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function inferWorkflowCategoryFromIdea(idea = "") {
  const haystack = safeText(idea, 1200).toLowerCase();
  if (
    /\b(lead|quote|quotes|calls|booking|bookings|follow-up|follow up|pipeline|crm|whatsapp|inbound)\b/.test(
      haystack
    )
  ) {
    return "lead-automation";
  }
  if (
    /\b(internal|ops|operations|backoffice|back office|staff|admin|approval|queue|reporting|dashboard)\b/.test(
      haystack
    )
  ) {
    return "internal-tool";
  }
  if (
    /\b(ai|assistant|copilot|agent|voice|speech|automation|automate|intelligence)\b/.test(haystack)
  ) {
    return "ai-feature";
  }
  if (/\b(app|mobile|platform|portal|marketplace|product)\b/.test(haystack)) {
    return "product-app";
  }
  return "website";
}

function inferConstraintNote(firstWin = "", preset) {
  const text = safeText(firstWin, 240).toLowerCase();
  if (/(fast|quick|soon|asap|urgent|two weeks|2 weeks|launch)/.test(text)) {
    return "Speed matters. Keep the first pass tight enough to ship without dragging in extra edge cases.";
  }
  if (/(simple|minimal|lean|light|small|just)\b/.test(text)) {
    return "Keep the first pass intentionally light. Prove the useful core before widening the scope.";
  }
  if (/(integrat|payment|calendar|map|sms|whatsapp|sync|crm|auth)/.test(text)) {
    return "Integration risk is real here. Prove the core path before wiring every external system.";
  }
  return `Protect the ${preset.deliveryTheme} scope and avoid turning version one into the whole product.`;
}

function inferSignalNote(idea = "", firstWin = "") {
  const text = `${safeText(idea, 360)} ${safeText(firstWin, 240)}`.toLowerCase();
  if (/(manual|repeated|repeat|slow|messy|missed|missing|pain|friction|lose|lost)/.test(text)) {
    return "There is already friction here, which is enough reason to test a sharp first pass.";
  }
  if (/(lead|demand|customer|client|orders|request|booking|quote)/.test(text)) {
    return "The idea connects to a visible request path, which makes it worth a practical first demo.";
  }
  return "There is enough signal to shape a first pass, as long as the first win stays narrow and testable.";
}

function buildWorkflowDecision({ idea = "", firstWin = "", audience = "", preset }) {
  const combined = `${safeText(idea, 500)} ${safeText(firstWin, 240)}`.toLowerCase();
  const tooBroad = /\b(all[- ]in[- ]one|everything|full platform|super app|marketplace|end[- ]to[- ]end)\b/.test(
    combined
  );
  if (tooBroad && safeText(firstWin, 240).length < 32) {
    return {
      quickVerdict: "No-go for a full build yet",
      decisionNote:
        "The idea has signal, but it still needs a tighter first slice before it should move beyond a quick demo pass."
    };
  }

  return {
    quickVerdict: "Go for a scoped first pass",
    decisionNote: `There is enough here to shape a practical ${preset.deliveryTheme} demo, as long as the first win stays narrow for ${audience}.`
  };
}

function normalizeWorkflowIntake(rawValue = {}) {
  const raw = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
  return {
    goal: safeText(raw.goal, 260),
    context: safeText(raw.context, 360),
    desiredOutput: safeText(raw.desiredOutput, 180),
    constraints: safeText(raw.constraints, 260),
    nonGoals: safeText(raw.nonGoals, 260)
  };
}

function buildIntakeFromAnswers(answers = {}) {
  return {
    goal: answerText(answers, "goal") || answerText(answers, "firstWin") || answerText(answers, "coreOutcome"),
    context: answerText(answers, "context") || answerText(answers, "audience"),
    desiredOutput: answerText(answers, "desiredOutput"),
    constraints: answerText(answers, "constraints"),
    nonGoals: answerText(answers, "nonGoals")
  };
}

function mergeWorkflowIntake({ intake = {}, answers = {} } = {}) {
  const base = normalizeWorkflowIntake(intake);
  const answerIntake = normalizeWorkflowIntake(buildIntakeFromAnswers(answers));
  return {
    goal: base.goal || answerIntake.goal,
    context: base.context || answerIntake.context,
    desiredOutput: base.desiredOutput || answerIntake.desiredOutput,
    constraints: base.constraints || answerIntake.constraints,
    nonGoals: base.nonGoals || answerIntake.nonGoals
  };
}

function deriveAudienceFromContext(context = "", preset) {
  const safeContext = safeText(context, 220);
  if (!safeContext) return "";
  const trimmed = safeContext.replace(/^for\s+/i, "").trim();
  if (!trimmed) return "";

  if (trimmed.length <= 72 && !/\b(should|must|need to|keep|allow|make|feels?|turns?|stays?|private|public)\b/i.test(trimmed)) {
    return trimmed;
  }

  const audienceMatch = trimmed.match(
    /\b(customers|clients|buyers|visitors|operators|teams|staff|managers|admins|founders|students|patients|parents|vendors|drivers|users)\b/i
  );
  if (audienceMatch) {
    return safeText(audienceMatch[0], 80);
  }

  return "";
}

function deriveAudienceFromIdea(idea = "", preset) {
  const safeIdea = safeText(idea, 240).toLowerCase();
  if (!safeIdea) return preset?.audienceHint || "";
  if (/\bclients?\b/.test(safeIdea)) return "clients";
  if (/\bcustomers?\b/.test(safeIdea)) return "customers";
  if (/\bvendors?\b/.test(safeIdea)) return "vendors";
  if (/\bdrivers?\b/.test(safeIdea)) return "drivers";
  if (/\boperators?\b/.test(safeIdea)) return "operators";
  if (/\bteams?\b/.test(safeIdea)) return "teams";
  if (/\bstudents?\b/.test(safeIdea)) return "students";
  return preset?.audienceHint || "";
}

function deriveAudience({ idea = "", intake, answers, preset }) {
  const explicitAudience = answerText(answers, "audience", "", 220);
  if (explicitAudience) return explicitAudience;
  if (safeText(intake.context, 220)) {
    const contextAudience = deriveAudienceFromContext(intake.context, preset);
    if (contextAudience) return contextAudience;
  }
  return deriveAudienceFromIdea(idea, preset);
}

function resolveDesiredOutput({ intake, preset }) {
  const desiredOutput = safeText(intake.desiredOutput, 180);
  if (desiredOutput) return desiredOutput;
  return `${preset.label} decision pack`;
}

function collectRequestAssumptions({ idea, intake, desiredOutput, preset }) {
  const assumptions = [];
  if (!safeText(intake.goal, 220)) {
    assumptions.push("Goal was inferred from the rough idea because no explicit primary goal was provided.");
  }
  if (!safeText(intake.context, 220)) {
    assumptions.push(`Context defaults to ${preset.audienceHint} until the run captures something more specific.`);
  }
  if (!safeText(intake.desiredOutput, 220)) {
    assumptions.push(`ATEAM will produce a ${lowerFirst(desiredOutput)} unless a different artifact is requested.`);
  }
  if (!safeText(intake.nonGoals, 220)) {
    assumptions.push("No explicit non-goals were provided, so scope protection will rely on the first useful win.");
  }
  if (safeText(idea, 120).split(/\s+/).length < 8) {
    assumptions.push("The rough idea is still compact, so the first pass may need a second review before build execution.");
  }
  return assumptions.slice(0, 4);
}

function buildClarifierPrompt({ id, label, prompt, hint, placeholder, reason }) {
  return {
    id,
    label,
    prompt,
    hint,
    placeholder,
    reason
  };
}

function collectWorkflowClarifiers({ idea = "", intake = {}, preset, desiredOutput = "" } = {}) {
  const clarifiers = [];
  if (!safeText(intake.goal, 220)) {
    clarifiers.push(
      buildClarifierPrompt({
        id: "goal",
        label: "Primary goal",
        prompt: `What should feel clearly better first for "${titleCaseFromIdea(idea)}"?`,
        hint: "Name the first useful win, not the full platform dream.",
        placeholder: "Example: turn a rough request into a clear next step with visible status.",
        reason: "ATEAM still needs the first useful win before it can lock the scope."
      })
    );
  }
  if (!safeText(intake.context, 220)) {
    clarifiers.push(
      buildClarifierPrompt({
        id: "context",
        label: "Relevant context",
        prompt: "What important context should ATEAM keep in view while shaping the first pass?",
        hint: `Keep it concrete: ${preset.audienceHint}.`,
        placeholder: "Example: operators currently handle this manually and lose track during handoff.",
        reason: "ATEAM needs a bit more context so the plan does not over-assume the environment."
      })
    );
  }
  if (!safeText(intake.desiredOutput, 220) && clarifiers.length < 2) {
    clarifiers.push(
      buildClarifierPrompt({
        id: "desiredOutput",
        label: "Desired output",
        prompt: "What kind of output do you want back from ATEAM first?",
        hint: `If you are unsure, ATEAM will default to a ${lowerFirst(desiredOutput)}.`,
        placeholder: "Example: a scoped spec, prototype direction, or structured build brief.",
        reason: "ATEAM can move faster when the expected artifact is explicit."
      })
    );
  }
  return clarifiers.slice(0, 2);
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

export const WORKFLOW_STATES = [
  "queued",
  "planning",
  "awaiting_approval",
  "executing",
  "generating_artifact",
  "completed",
  "failed",
  "escalated"
];

export const WORKFLOW_CATEGORY_PRESETS = {
  website: {
    label: "Website",
    recommendedLane: "Fast Website Launch",
    ownerAgentId: "henry",
    problemFrame: "clarify the offer and turn interest into a measurable next step",
    audienceHint: "buyers or visitors you want to convert quickly",
    screens: ["Landing", "Offer detail", "Conversion path", "Proof / FAQ"],
    prototypeFrame: "a quick route from first visit to a qualified next action",
    stack: ["Next.js", "Lead capture", "Analytics", "Performance / SEO"],
    deliveryTheme: "conversion-first launch"
  },
  "lead-automation": {
    label: "Lead automation",
    recommendedLane: "Local Services Lead Engine",
    ownerAgentId: "henry",
    problemFrame: "capture, qualify, and route incoming demand without manual babysitting",
    audienceHint: "operators or teams handling inbound demand",
    screens: ["Capture", "Qualification", "Routing", "Follow-up"],
    prototypeFrame: "a believable path from inbound request to routed follow-up",
    stack: ["Webhook intake", "Routing rules", "Templates", "Visibility dashboard"],
    deliveryTheme: "automation-first intake"
  },
  "product-app": {
    label: "App",
    recommendedLane: "Product / App Build Path",
    ownerAgentId: "codex",
    problemFrame: "frame the MVP, the first useful workflow, and the safest build order",
    audienceHint: "end users adopting a new workflow or utility",
    screens: ["Entry", "Core flow", "Status", "Settings"],
    prototypeFrame: "the shortest believable route through the core user flow",
    stack: ["App shell", "API layer", "Analytics", "Release checklist"],
    deliveryTheme: "MVP-first product path"
  },
  "internal-tool": {
    label: "Internal tool",
    recommendedLane: "Internal Tool / Ops System",
    ownerAgentId: "charlie",
    problemFrame: "remove repeated manual steps and make execution visible",
    audienceHint: "operators, managers, or internal teams",
    screens: ["Queue", "Task view", "Progress", "Reporting"],
    prototypeFrame: "the internal flow before deeper systems integration",
    stack: ["Dashboard shell", "Permissions", "Audit trail", "Automation hooks"],
    deliveryTheme: "ops visibility and control"
  },
  "ai-feature": {
    label: "AI workflow",
    recommendedLane: "AI Workflow / Product Direction",
    ownerAgentId: "violet",
    problemFrame: "place AI where it removes friction and improves judgment",
    audienceHint: "people who need faster decisions, not novelty",
    screens: ["Intake", "Assist surface", "Human review", "Outcome log"],
    prototypeFrame: "a guarded AI-assist flow with a believable human check",
    stack: ["Model orchestration", "Guardrails", "Feedback loop", "Observability"],
    deliveryTheme: "guardrailed AI assist"
  }
};

export const WORKFLOW_AGENT_LIBRARY = [
  {
    id: "lead",
    ownerAgentId: "henry",
    label: "Lead",
    stage: "Direction",
    summary: "Owns the outcome, success criteria, and scope protection for the run.",
    responsibilities: [
      "Clarify the real goal",
      "Keep the first useful win narrow",
      "Protect the run from scope drift"
    ]
  },
  {
    id: "scout",
    ownerAgentId: "scout",
    label: "Scout",
    stage: "Discovery",
    summary: "Turns rough input into structured context, request signals, and visible constraints.",
    responsibilities: [
      "Capture the real signal",
      "Pull out context and blockers",
      "Surface missing clarifiers"
    ]
  },
  {
    id: "architect",
    ownerAgentId: "charlie",
    label: "Architect",
    stage: "System design",
    summary: "Shapes the plan, route, and system logic before execution begins.",
    responsibilities: [
      "Map the workflow steps",
      "Choose the safest lane",
      "Define the first believable system shape"
    ]
  },
  {
    id: "builder",
    ownerAgentId: "codex",
    label: "Builder",
    stage: "Execution",
    summary: "Turns the approved plan into artifacts, work items, and a scoped next move.",
    responsibilities: [
      "Generate the first artifact pass",
      "Keep execution aligned to the plan",
      "Prepare the build-facing handoff"
    ]
  },
  {
    id: "designer",
    ownerAgentId: "violet",
    label: "Designer",
    stage: "Experience",
    summary: "Keeps the output legible, usable, and decision-ready for non-technical reviewers.",
    responsibilities: [
      "Make the flow understandable",
      "Clarify the primary path",
      "Reduce confusion before approval"
    ]
  },
  {
    id: "operator",
    ownerAgentId: "operator",
    label: "Operator",
    stage: "Live operation",
    summary: "Moves the approved artifact into real delivery and keeps the public/private boundary clean.",
    responsibilities: [
      "Review the final package",
      "Protect operational boundaries",
      "Move the run into delivery when ready"
    ]
  }
];

export const WORKFLOW_REQUEST_TEMPLATES = [
  {
    id: "public-intake-reframe",
    label: "Public Intake Reframe",
    category: "website",
    summary: "For public request flows that need trust, clear planning, and a visible next step.",
    exampleIdea: "Build a public-facing intake system that turns rough requests into a visible plan before execution.",
    intake: {
      goal: "Show the user a clear plan and next step before execution begins.",
      desiredOutput: "Decision pack with request summary, plan, risks, and next move",
      constraints: "Keep the experience public-safe and readable to non-technical users.",
      nonGoals: "Do not expose operator-only tooling or turn the first pass into a full app builder."
    },
    recommendedFor: ["Client intake", "Public workflow framing", "Trust-first scoping"]
  },
  {
    id: "local-service-lead-engine",
    label: "Local Service Lead Engine",
    category: "lead-automation",
    summary: "For quote, booking, and follow-up systems that need a tight first-pass demand flow.",
    exampleIdea: "Set up a local service lead workflow that captures requests, qualifies them, and routes follow-up automatically.",
    intake: {
      goal: "Capture and route leads without manual babysitting.",
      desiredOutput: "Scoped lead-system plan with routing steps and operator visibility",
      constraints: "Keep the first pass simple enough to launch quickly.",
      nonGoals: "Do not connect every external system in the first version."
    },
    recommendedFor: ["Quotes", "Bookings", "Lead follow-up"]
  },
  {
    id: "internal-ops-system",
    label: "Internal Ops System",
    category: "internal-tool",
    summary: "For team-facing workflows that need visibility, routing, and repeatable status handling.",
    exampleIdea: "Create an internal ops workflow that tracks incoming tasks, ownership, blockers, and review states.",
    intake: {
      goal: "Remove repeated manual steps and make the workflow status visible.",
      desiredOutput: "Internal-tool decision pack with queue, task view, and reporting direction",
      constraints: "Keep the first version narrow enough for one team to adopt.",
      nonGoals: "Do not rebuild every admin process at once."
    },
    recommendedFor: ["Ops dashboards", "Internal workflows", "Queue management"]
  },
  {
    id: "ai-assist-workflow",
    label: "AI Assist Workflow",
    category: "ai-feature",
    summary: "For trust-sensitive AI assistance that still needs human review and scoped delivery.",
    exampleIdea: "Design an AI-assisted review flow that helps a team respond faster without removing the human check.",
    intake: {
      goal: "Use AI to reduce friction while keeping the human review visible.",
      desiredOutput: "Guardrailed AI workflow brief with review points and operator controls",
      constraints: "Keep the model behavior inspectable and bounded.",
      nonGoals: "Do not build a fully autonomous system in the first pass."
    },
    recommendedFor: ["AI copilots", "Assisted review", "Guardrailed decision support"]
  }
];

export function getWorkflowTemplate(templateId = "") {
  const safeTemplateId = safeText(templateId, 80).toLowerCase();
  return WORKFLOW_REQUEST_TEMPLATES.find((template) => template.id === safeTemplateId) || null;
}

export function getWorkflowCatalog() {
  return {
    templates: WORKFLOW_REQUEST_TEMPLATES,
    agentRoles: WORKFLOW_AGENT_LIBRARY
  };
}

export function normalizeWorkflowCategory(rawValue = "", idea = "") {
  const normalized = safeText(rawValue, 40).toLowerCase();
  if (normalized && Object.prototype.hasOwnProperty.call(WORKFLOW_CATEGORY_PRESETS, normalized)) {
    return normalized;
  }
  return inferWorkflowCategoryFromIdea(idea);
}

export function getWorkflowCategoryPreset(rawValue = "", idea = "") {
  return WORKFLOW_CATEGORY_PRESETS[normalizeWorkflowCategory(rawValue, idea)];
}

export function normalizeWorkflowState(value = "") {
  const normalized = safeText(value, 40).toLowerCase();
  if (WORKFLOW_STATES.includes(normalized)) return normalized;
  return "queued";
}

export function mapWorkflowPhaseToState(phase = "") {
  const safePhase = safeText(phase, 40).toLowerCase();
  if (safePhase === "analysis" || safePhase === "intake") return "planning";
  if (safePhase === "brief_approval") return "awaiting_approval";
  if (safePhase === "initiation" || safePhase === "prototype_pack") return "executing";
  if (safePhase === "pack_approval") return "generating_artifact";
  if (safePhase === "handoff" || safePhase === "archived") return "completed";
  return "queued";
}

export function buildWorkflowProjectId(runId = "") {
  return `workflow_${slugify(runId) || "run"}`;
}

export function buildWorkflowQuestions({ idea = "", category = "website", intake = {}, answers = {} } = {}) {
  const preset = getWorkflowCategoryPreset(category, idea);
  const mergedIntake = mergeWorkflowIntake({ intake, answers });
  const desiredOutput = resolveDesiredOutput({ intake: mergedIntake, preset });
  return collectWorkflowClarifiers({
    idea,
    intake: mergedIntake,
    preset,
    desiredOutput
  });
}

export function buildWorkflowRequest({
  idea = "",
  category = "website",
  intake = {},
  answers = {},
  runId = "",
  previousRequest = {},
  snapshot = null
} = {}) {
  const resolvedCategory = normalizeWorkflowCategory(category, idea);
  const preset = getWorkflowCategoryPreset(resolvedCategory, idea);
  const mergedIntake = mergeWorkflowIntake({ intake, answers });
  const audience = deriveAudience({ idea, intake: mergedIntake, answers, preset });
  const goal =
    safeText(mergedIntake.goal, 220) ||
    answerText(answers, "firstWin", "", 220) ||
    `Deliver a first pass that can ${preset.problemFrame}.`;
  const desiredOutput = resolveDesiredOutput({ intake: mergedIntake, preset });
  const assumptions = collectRequestAssumptions({
    idea,
    intake: mergedIntake,
    desiredOutput,
    preset
  });
  const clarifiers = collectWorkflowClarifiers({
    idea,
    intake: mergedIntake,
    preset,
    desiredOutput
  });
  const snapshots =
    previousRequest && typeof previousRequest.snapshots === "object" && !Array.isArray(previousRequest.snapshots)
      ? { ...previousRequest.snapshots }
      : {};

  if (snapshot && snapshot.state) {
    snapshots[snapshot.state] = {
      state: normalizeWorkflowState(snapshot.state),
      phase: safeText(snapshot.phase || "", 40),
      summary: safeText(snapshot.summary || "", 280),
      updatedAt: safeText(snapshot.updatedAt || new Date().toISOString(), 80),
      runId: safeText(runId, 120)
    };
  }

  return {
    rawInput: safeText(idea, 1200),
    intake: mergedIntake,
    normalized: {
      goal,
      requestType: resolvedCategory,
      desiredArtifactType: safeText(desiredOutput, 180),
      inferredLane: preset.recommendedLane,
      audience,
      scopeSummary: `ATEAM should ${preset.problemFrame} for ${audience}.`
    },
    assumptions,
    clarifiers,
    routing: {
      recommendedLane: preset.recommendedLane,
      ownerAgentId: preset.ownerAgentId,
      reason: `ATEAM chose ${preset.recommendedLane} because the request reads like a ${preset.label.toLowerCase()} first pass.`
    },
    snapshots
  };
}

export function buildWorkflowBrief({
  idea = "",
  category = "website",
  answers = {},
  intake = {},
  request = null,
  runId = ""
} = {}) {
  const resolvedCategory = normalizeWorkflowCategory(category, idea);
  const preset = getWorkflowCategoryPreset(resolvedCategory, idea);
  const resolvedRequest =
    request ||
    buildWorkflowRequest({
      idea,
      category: resolvedCategory,
      intake,
      answers,
      runId
  });
  const title = deriveWorkflowTitle(idea);
  const audience = safeText(resolvedRequest.normalized?.audience, 220) || preset.audienceHint;
  const firstWin = safeText(resolvedRequest.normalized?.goal, 220);
  const constraints = safeText(
    resolvedRequest.intake?.constraints,
    220
  ) || inferConstraintNote(firstWin, preset);
  const signals = answerText(answers, "signals", inferSignalNote(idea, firstWin), 220);
  const decision = buildWorkflowDecision({
    idea,
    firstWin,
    audience,
    preset
  });
  const likelyUserValue = `For ${audience}, the first useful value is simple: ${lowerFirst(firstWin)} without extra complexity getting in the way.`;
  const recommendedDirection = `Start with a ${preset.deliveryTheme} first pass that proves ${lowerFirst(firstWin)} before layering in broader workflow or integrations.`;

  return {
    title,
    summary: `This first pass keeps ${title} focused on ${lowerFirst(firstWin)} for ${audience}, without pretending to be the whole product.`,
    audience,
    scope: firstWin,
    primaryGoal: firstWin,
    signals,
    likelyUserValue,
    recommendedDirection,
    quickVerdict: decision.quickVerdict,
    decisionNote: decision.decisionNote,
    constraints: safeList([
      constraints,
      "Keep version one narrow enough to explain in one breath.",
      "Avoid polishing edge cases before the main path works."
    ]),
    goals: safeList([
      firstWin,
      `Show enough structure to judge whether ${title} deserves a deeper build.`,
      "Produce a clear decision pack that Una Labs can scope quickly."
    ]),
    successCriteria: safeList([
      `A first user from ${audience} can complete the main path with minimal explanation.`,
      "The concept pack makes the core path, risks, and next move easy to judge.",
      "The handoff is clear enough to estimate a phase-one build."
    ]),
    recommendedLane: preset.recommendedLane,
    phasedPlan: safeList([
      "Capture the rough idea and strip out the noise.",
      "Lock the audience, the first win, and the safest lane.",
      "Generate a visual first pass and a simple route map.",
      "Run a quick review so the next move is obvious."
    ], 4),
    operatorNotes: safeList([
      `Keep the first pass centered on ${lowerFirst(firstWin)}.`,
      `Route this through ${preset.recommendedLane}.`,
      `Protect the main constraint during delivery: ${constraints}`
    ]),
    runLabel: runId ? `Workflow run ${runId}` : "Workflow run"
  };
}

export function buildWorkflowPlan({ request = {}, category = "website", brief = {}, runId = "" } = {}) {
  const resolvedCategory = normalizeWorkflowCategory(category, request?.rawInput || "");
  const preset = getWorkflowCategoryPreset(resolvedCategory, request?.rawInput || "");
  const assumptions = safeList(request?.assumptions || [], 4);
  const blockers = safeList(
    (request?.clarifiers || []).map((clarifier) => clarifier.reason || clarifier.prompt),
    4
  );
  const firstWin =
    safeText(request?.normalized?.goal, 220) || safeText(brief?.primaryGoal, 220) || preset.problemFrame;
  const expectedArtifactTitle = brief?.title
    ? `${brief.title} decision pack`
    : `${deriveWorkflowTitle(request?.rawInput || runId || "ATEAM")} decision pack`;

  return {
    summary: "ATEAM will turn this request into a visible, scoped first pass before any deeper execution work starts.",
    proposedSteps: [
      {
        id: "normalize_request",
        title: "Normalize the request",
        detail: `Clarify ${lowerFirst(firstWin)} and preserve the original intent in a stable request object.`
      },
      {
        id: "shape_first_pass",
        title: "Shape the first pass",
        detail: `Choose ${preset.recommendedLane} and keep the first useful version narrow enough to trust.`
      },
      {
        id: "generate_decision_pack",
        title: "Generate the decision pack",
        detail: "Return a concrete artifact with prototype direction, scope notes, and the clearest next move."
      }
    ],
    expectedArtifact: {
      type: safeText(request?.normalized?.desiredArtifactType, 160) || "Decision pack",
      title: expectedArtifactTitle,
      summary: `A public-safe artifact bundle that proves ${lowerFirst(firstWin)} without pretending to be the full product.`
    },
    assumptions,
    blockers,
    approvalActions: ["approve", "reject", "regenerate"],
    singleAgent: {
      ownerAgentId: safeText(request?.routing?.ownerAgentId, 80) || preset.ownerAgentId,
      lane: safeText(request?.routing?.recommendedLane, 120) || preset.recommendedLane
    },
    editable: {
      version: 1,
      edited: false,
      editorNotes: "",
      lastEditedAt: "",
      editedBy: "",
      templateId: ""
    }
  };
}

export function normalizeWorkflowPlanPatch(rawPatch = {}) {
  const patch = rawPatch && typeof rawPatch === "object" && !Array.isArray(rawPatch) ? rawPatch : {};
  const proposedSteps = (Array.isArray(patch.proposedSteps) ? patch.proposedSteps : [])
    .map((step, index) => ({
      id: safeText(step?.id, 80) || `step_${index + 1}`,
      title: safeText(step?.title, 160),
      detail: safeText(step?.detail, 280)
    }))
    .filter((step) => step.title || step.detail)
    .slice(0, 6);
  return {
    summary: safeText(patch.summary, 320),
    proposedSteps,
    expectedArtifact: {
      type: safeText(patch?.expectedArtifact?.type, 160),
      title: safeText(patch?.expectedArtifact?.title, 180),
      summary: safeText(patch?.expectedArtifact?.summary, 280)
    },
    blockers: normalizeStringArray(patch.blockers || [], 6),
    editorNotes: safeText(patch.editorNotes, 280),
    templateId: safeText(patch.templateId, 80)
  };
}

export function applyWorkflowPlanPatch({ basePlan = {}, patch = {}, actor = "public" } = {}) {
  const normalizedBase = basePlan && typeof basePlan === "object" && !Array.isArray(basePlan) ? basePlan : {};
  const normalizedPatch = normalizeWorkflowPlanPatch(patch);
  const nextSteps = normalizedPatch.proposedSteps.filter((step) => step.title || step.detail);
  const contentEdited = Boolean(
    normalizedPatch.summary ||
      normalizedPatch.blockers.length ||
      nextSteps.length ||
      normalizedPatch.expectedArtifact.type ||
      normalizedPatch.expectedArtifact.title ||
      normalizedPatch.expectedArtifact.summary
  );
  const currentVersion = Number(normalizedBase?.editable?.version || 1);

  return {
    ...normalizedBase,
    summary: normalizedPatch.summary || normalizedBase.summary || "",
    proposedSteps: nextSteps.length
      ? nextSteps.map((step, index) => ({
          id: step.id || normalizedBase?.proposedSteps?.[index]?.id || `step_${index + 1}`,
          title: step.title || normalizedBase?.proposedSteps?.[index]?.title || "",
          detail: step.detail || normalizedBase?.proposedSteps?.[index]?.detail || ""
        }))
      : Array.isArray(normalizedBase.proposedSteps)
        ? normalizedBase.proposedSteps
        : [],
    expectedArtifact: {
      ...(normalizedBase.expectedArtifact || {}),
      type: normalizedPatch.expectedArtifact.type || normalizedBase?.expectedArtifact?.type || "",
      title: normalizedPatch.expectedArtifact.title || normalizedBase?.expectedArtifact?.title || "",
      summary: normalizedPatch.expectedArtifact.summary || normalizedBase?.expectedArtifact?.summary || ""
    },
    blockers: normalizedPatch.blockers.length
      ? normalizedPatch.blockers
      : Array.isArray(normalizedBase.blockers)
        ? normalizedBase.blockers
        : [],
    editable: {
      ...(normalizedBase.editable && typeof normalizedBase.editable === "object" ? normalizedBase.editable : {}),
      edited: Boolean(normalizedBase?.editable?.edited || contentEdited),
      version: contentEdited ? currentVersion + 1 : currentVersion,
      editorNotes:
        normalizedPatch.editorNotes ||
        safeText(normalizedBase?.editable?.editorNotes, 280),
      lastEditedAt: new Date().toISOString(),
      editedBy: safeText(actor, 80) || "public",
      templateId: normalizedPatch.templateId || safeText(normalizedBase?.editable?.templateId, 80),
      patch: normalizedPatch
    }
  };
}

export function buildWorkflowEvaluation({ run = {}, outcome = "completed", failureReason = "" } = {}) {
  const artifacts = run?.artifacts && typeof run.artifacts === "object" ? run.artifacts : {};
  const hasDecisionPack = Boolean(artifacts?.prototype?.title || artifacts?.doc?.title);
  const hasPlan = Boolean(run?.plan?.proposedSteps?.length);
  const hasRequest = Boolean(run?.request?.normalized?.goal);
  const failed = safeText(outcome, 40) === "failed";
  const rejected = safeText(outcome, 40) === "rejected";

  const baseScore = failed ? 1 : rejected ? 2 : 4;
  const completenessBonus = hasDecisionPack ? 1 : 0;

  return {
    intentFidelity: Math.min(5, baseScore + (hasRequest ? 1 : 0)),
    scopeAdherence: Math.min(5, baseScore + (hasPlan ? 1 : 0)),
    artifactCompleteness: Math.min(5, baseScore + completenessBonus),
    assumptionDiscipline: Math.min(5, baseScore + (Array.isArray(run?.request?.assumptions) ? 1 : 0)),
    humanCorrectionNeeded: failed ? "high" : rejected ? "high" : "moderate",
    finalStatus: failed ? "failed" : rejected ? "rejected" : "completed",
    summary: failed
      ? `ATEAM failed before finishing the run. ${safeText(failureReason, 220) || "Inspect the run log for the failure point."}`
      : rejected
        ? "The run was rejected before execution completed and needs another planning pass."
        : "The run completed with a decision pack, visible routing, and a stored evaluation snapshot."
  };
}

export function buildWorkflowRisks({ brief, answers = {}, category = "website", request = null } = {}) {
  const preset = getWorkflowCategoryPreset(category);
  const firstWin = safeText(request?.normalized?.goal, 220) || answerText(answers, "firstWin", "", 220);
  const constraints =
    safeText(request?.intake?.constraints, 220) || answerText(answers, "constraints", inferConstraintNote(firstWin, preset), 220);
  const signals = answerText(answers, "signals", "", 220);

  return safeList([
    constraints ? `Main constraint: ${constraints}` : "",
    signals ? `Proof still to confirm: ${signals}` : "",
    firstWin ? `Do not let the build drift away from ${lowerFirst(firstWin)}.` : "",
    brief?.audience ? `Keep the audience tight around ${brief.audience}.` : ""
  ], 4);
}

function buildMockupScreens(run, preset) {
  const brief = run?.brief || {};
  const title = brief.title || deriveWorkflowTitle(run?.idea || "");
  const firstWin = brief.primaryGoal || preset.problemFrame;
  const audience = brief.audience || preset.audienceHint;

  return preset.screens.slice(0, 4).map((screenTitle, index) => ({
    id: `screen_${index + 1}`,
    title: screenTitle,
    caption:
      index === 0
        ? `Open with the clearest promise for ${audience}.`
        : index === 1
          ? `Show how ${lowerFirst(firstWin)} actually works in a believable first pass.`
          : index === 2
            ? "Keep the decision path visible so the user never wonders what happens next."
            : `Close the loop so ${title} feels ready for a real build decision.`,
    highlights: safeList([
      index === 0 ? "Promise, trust signal, and one strong action" : "",
      index === 1 ? "Core flow block with obvious state change" : "",
      index === 2 ? "Review, confirmation, or human-check moment" : "",
      index === 3 ? "Clear follow-up or handoff state" : "",
      `Tone: ${preset.deliveryTheme}`
    ], 4)
  }));
}

function buildPrototypeFrames(run, preset) {
  const brief = run?.brief || {};
  const title = brief.title || deriveWorkflowTitle(run?.idea || "");
  const firstWin = brief.primaryGoal || preset.problemFrame;

  return [
    {
      id: "frame_entry",
      title: "Start",
      purpose: `Introduce ${title} and make the next action feel obvious.`,
      interactions: safeList([
        "Primary CTA starts the main path immediately.",
        "Secondary CTA shows proof, examples, or context."
      ])
    },
    {
      id: "frame_flow",
      title: "Core Flow",
      purpose: `Prove the first useful win: ${lowerFirst(firstWin)}.`,
      interactions: safeList([
        "User completes the core action without extra branching.",
        "State, response, or progress is visible in plain language."
      ])
    },
    {
      id: "frame_review",
      title: "Review",
      purpose: "Show the human check, QA moment, or decision state before handoff.",
      interactions: safeList([
        "Review keeps the outcome safe and scoped.",
        "Next move into build or handoff is visible."
      ])
    }
  ];
}

export function buildWorkflowPack({ run } = {}) {
  const category = normalizeWorkflowCategory(run?.category, run?.idea);
  const preset = getWorkflowCategoryPreset(category, run?.idea);
  const brief =
    run?.brief ||
    buildWorkflowBrief({
      idea: run?.idea,
      category,
      answers: run?.answers,
      intake: run?.request?.intake,
      request: run?.request,
      runId: run?.id
    });
  const plan =
    run?.plan ||
    buildWorkflowPlan({
      request: run?.request,
      category,
      brief,
      runId: run?.id
    });
  const mockupScreens = buildMockupScreens({ ...run, brief }, preset);
  const prototypeFrames = buildPrototypeFrames({ ...run, brief }, preset);

  return {
    mockup: {
      title: `${brief.title} concept pack`,
      summary: `Figma-style concept screens for the first believable version of ${brief.title}.`,
      screens: mockupScreens
    },
    prototype: {
      title: `${brief.title} quick prototype`,
      summary: `A lightweight route map that proves ${lowerFirst(brief.primaryGoal || preset.prototypeFrame)}.`,
      frames: prototypeFrames,
      stack: preset.stack
    },
    smoke: {
      status: "first_pass_ready",
      summary: "Quick review shows the main path, the visible decision points, and the likely build watch-outs.",
      checks: [
        {
          label: "Main path is visible",
          result: "ready",
          note: "The first action, core flow, and review state are all represented."
        },
        {
          label: "Primary moves are clear",
          result: "ready",
          note: "The CTA, transition, and follow-up state are called out directly."
        },
        {
          label: "Build watch remains",
          result: "watch",
          note: "Integrations, edge cases, and production copy still need a scoped build pass."
        }
      ]
    },
    doc: {
      title: `${brief.title} build note`,
      summary: `Recommended move, risk watch, and system shape for ${brief.title}.`,
      sections: [
        {
          title: "Normalized request",
          items: safeList([
            safeText(run?.request?.normalized?.goal, 220),
            safeText(run?.request?.normalized?.scopeSummary, 220),
            safeText(run?.request?.routing?.reason, 220)
          ], 4)
        },
        {
          title: "Visible plan",
          items: safeList((plan?.proposedSteps || []).map((step) => `${step.title}: ${step.detail}`), 4)
        },
        {
          title: "Systems / integrations",
          items: safeList(preset.stack, 5)
        },
        {
          title: "Risk watch",
          items: safeList(run?.risks || [], 4)
        }
      ]
    },
    nextSteps: safeList([
      "Decide whether this should move into a scoped phase-one build with Una Labs.",
      `If yes, keep the first build centered on ${lowerFirst(brief.primaryGoal)}.`,
      "Use the pack to lock scope, timing, and integrations before deeper build work starts."
    ], 4)
  };
}

export function buildWorkflowHandoff({ run } = {}) {
  const category = normalizeWorkflowCategory(run?.category, run?.idea);
  const preset = getWorkflowCategoryPreset(category, run?.idea);
  const brief =
    run?.brief ||
    buildWorkflowBrief({
      idea: run?.idea,
      category,
      answers: run?.answers,
      intake: run?.request?.intake,
      request: run?.request,
      runId: run?.id
    });
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
      likelyUserValue: brief.likelyUserValue,
      recommendedDirection: brief.recommendedDirection,
      quickVerdict: brief.quickVerdict,
      goals: safeList(brief.goals || [], 5),
      constraints: safeList(brief.constraints || [], 5),
      successCriteria: safeList(brief.successCriteria || [], 5),
      phasedPlan: safeList(brief.phasedPlan || [], 5)
    },
    artifacts: {
      mockupTitle: safeText(artifacts?.mockup?.title, 140),
      prototypeTitle: safeText(artifacts?.prototype?.title, 140),
      smokeSummary: safeText(artifacts?.smoke?.summary, 220),
      docTitle: safeText(artifacts?.doc?.title, 140)
    },
    nextSteps: safeList(artifacts?.nextSteps || [], 5)
  };
}

export function buildWorkflowWorkItems(run) {
  const category = normalizeWorkflowCategory(run?.category, run?.idea);
  const preset = getWorkflowCategoryPreset(category, run?.idea);
  const brief =
    run?.brief ||
    buildWorkflowBrief({
      idea: run?.idea,
      category,
      answers: run?.answers,
      intake: run?.request?.intake,
      request: run?.request,
      runId: run?.id
    });
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
        title: `Build pack for ${brief.title}`,
        objective: `Generate the first concept pack for ${brief.title} without losing the core first win.`,
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
        title: `Review ${brief.title}`,
        objective: "Run a quick smoke pass and flag the main build watch-outs.",
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
        objective: "Prepare the Una Labs handoff pack and the clearest next move.",
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
