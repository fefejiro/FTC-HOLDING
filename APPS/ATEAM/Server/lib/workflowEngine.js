function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeList(values = [], limit = 6) {
  return (Array.isArray(values) ? values : [])
    .map((value) => safeText(value, 180))
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
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
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

export function buildWorkflowProjectId(runId = "") {
  return `workflow_${slugify(runId) || "run"}`;
}

export function buildWorkflowQuestions({ idea = "", category = "website" } = {}) {
  const preset = getWorkflowCategoryPreset(category, idea);
  const ideaTitle = titleCaseFromIdea(idea);

  return [
    {
      id: "audience",
      label: "Who it is for",
      prompt: `Who needs this first in "${ideaTitle}"?`,
      hint: `Keep it concrete: ${preset.audienceHint}.`,
      placeholder: "Example: busy restaurant staff handling rush-hour orders on WhatsApp."
    },
    {
      id: "firstWin",
      label: "First useful win",
      prompt: "What should feel clearly easier in the first version?",
      hint: "Name the one useful win, plus any hard limit if it matters.",
      placeholder: "Example: take a request, route it fast, and show status back clearly."
    }
  ];
}

export function buildWorkflowBrief({ idea = "", category = "website", answers = {}, runId = "" } = {}) {
  const resolvedCategory = normalizeWorkflowCategory(category, idea);
  const preset = getWorkflowCategoryPreset(resolvedCategory, idea);
  const title = titleCaseFromIdea(idea);
  const audience = answerText(answers, "audience", preset.audienceHint, 220);
  const firstWin = answerText(
    answers,
    "firstWin",
    answerText(
      answers,
      "coreOutcome",
      `Give ${audience} a first version that can ${preset.problemFrame}.`,
      220
    ),
    220
  );
  const constraints = answerText(
    answers,
    "constraints",
    inferConstraintNote(firstWin, preset),
    220
  );
  const signals = answerText(
    answers,
    "signals",
    inferSignalNote(idea, firstWin),
    220
  );
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
    summary: `${title} should ${preset.problemFrame} for ${audience}. The first pass should prove ${lowerFirst(firstWin)} without pretending to be the whole product.`,
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

export function buildWorkflowRisks({ brief, answers = {}, category = "website" } = {}) {
  const preset = getWorkflowCategoryPreset(category);
  const firstWin = answerText(
    answers,
    "firstWin",
    answerText(answers, "coreOutcome", "", 220),
    220
  );
  const constraints = answerText(answers, "constraints", inferConstraintNote(firstWin, preset), 220);
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
  const title = brief.title || titleCaseFromIdea(run?.idea || "");
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
  const title = brief.title || titleCaseFromIdea(run?.idea || "");
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
          title: "Recommended move",
          items: safeList([
            brief.quickVerdict,
            brief.recommendedLane,
            brief.recommendedDirection
          ], 4)
        },
        {
          title: "Systems / integrations",
          items: safeList(preset.stack, 5)
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
