(function () {
  const modules = window.ATEAMModules || (window.ATEAMModules = {});

  const ORIGIN = window.location.origin;

  function normalizeBasePath(value = "") {
    const raw = String(value || "").trim();
    if (!raw || raw === "/") return "";
    const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
    return withLeadingSlash.replace(/\/+$/, "");
  }

  function detectAteamBasePath(pathname = "") {
    const normalized = String(pathname || "/").toLowerCase();
    if (normalized === "/ateam/operator" || normalized.startsWith("/ateam/operator/")) {
      return "/ateam/operator";
    }
    if (normalized === "/ateam" || normalized.startsWith("/ateam/")) {
      return "/ateam";
    }
    return "";
  }

  const ATEAM_BASE_PATH = normalizeBasePath(
    window.ATEAM_BASE_PATH || detectAteamBasePath(window.location.pathname)
  );

  function withBasePath(route = "/") {
    const normalizedRoute = String(route || "/").startsWith("/")
      ? String(route || "/")
      : `/${route}`;
    if (!ATEAM_BASE_PATH) return normalizedRoute;
    return normalizedRoute === "/" ? ATEAM_BASE_PATH : `${ATEAM_BASE_PATH}${normalizedRoute}`;
  }

  function stripBasePath(pathname = "") {
    const normalizedPath = String(pathname || "/") || "/";
    if (!ATEAM_BASE_PATH) return normalizedPath;
    if (normalizedPath === ATEAM_BASE_PATH) return "/";
    if (normalizedPath.startsWith(`${ATEAM_BASE_PATH}/`)) {
      return normalizedPath.slice(ATEAM_BASE_PATH.length) || "/";
    }
    return normalizedPath;
  }

  const apiBaseOverride = typeof window.ATEAM_API_BASE === "string" ? String(window.ATEAM_API_BASE).trim() : "";
  let storedApiBase = "";
  try {
    storedApiBase = ATEAM_BASE_PATH ? "" : (localStorage.getItem("ATEAM_API_BASE") || "");
  } catch {}

  const API_BASE =
    apiBaseOverride ||
    storedApiBase ||
    (ATEAM_BASE_PATH || (ORIGIN.includes("localhost:3000") || ORIGIN.includes("127.0.0.1:3000")
      ? ORIGIN
      : "http://localhost:3000"));

  const GLOBAL_TASK_ID = "global";
  const GLOBAL_PODCAST_ID = "global_podcast";
  const LOCAL_THREAD_KEY = `talk_thread_${GLOBAL_PODCAST_ID}`;
  const LOCAL_EVENTS_KEY = `talk_events_${GLOBAL_PODCAST_ID}`;

  const TTS_CONFIG = {
    rate: 0.98,
    pitch: 0.95,
    volume: 1.0
  };

  const TAP_COOLDOWN_MS = 200;
  const OFFICE_STUDIO_KEY = "ATEAM_OFFICE_STUDIO";
  const AGENT_STATUS_ORDER = ["Coach", "Strategist", "Builder", "Scout", "Think Tank", "Podcast"];

  const DEBUG_HEARTBEAT = false;
  const SILENCE_EVENT_START_MS = 1500;
  const CHAPTER_SILENCE_THRESHOLD_MS = 8000;
  const RAPID_SWITCH_THRESHOLD_MS = 1200;
  const INTERRUPT_RETRY_WINDOW_MS = 300;
  const INTERRUPT_RETRY_DELAY_MS = 100;
  const VOICE_CONFIRM_THRESHOLD_DEFAULT = 0.85;
  const VOICE_CONFIRM_THRESHOLD_KEY = "ATEAM_VOICE_CONFIRM_THRESHOLD";
  const CONFUSION_MAP_KEY = "ATEAM_CONFUSION_MAP_V1";
  const CONFUSION_MAP_MAX_ITEMS = 200;
  const EXPORT_PACK_SCHEMA_VERSION = "phase8_review_mode_export_pack_v2";

  const SPEAKER_OPTIONS = [
    { id: "unknown", label: "Unknown" },
    { id: "michael", label: "Michael" },
    { id: "mark", label: "Mark" },
    { id: "guest", label: "Guest" },
    { id: "ai_podcast", label: "Manchi AI" }
  ];
  const SPEAKER_REGISTRY_KEY = "ATEAM_SPEAKER_REGISTRY";

  const CONTENT_STATUS_LABELS = {
    draft: "Draft",
    pending_approval: "Pending Approval",
    approved: "Approved",
    scheduled: "Scheduled",
    rejected: "Rejected"
  };

  const OFFICE_AGENTS = [
    { id: "scout", name: "Tinye isi", role: "Signals", initials: "TI", mapsTo: "Scout" },
    { id: "quill", name: "Eze", role: "Writer", initials: "EZ", mapsTo: "Quill" },
    { id: "codex", name: "Billy", role: "Builder", initials: "BI", mapsTo: "Builder" },
    { id: "henry", name: "Manchi", role: "Coordinator", initials: "MA", mapsTo: "Coach" }
  ];

  const OFFICE_COOLER_OFFSETS = [
    { x: -26, y: -18 },
    { x: 22, y: -20 },
    { x: -28, y: 18 },
    { x: 26, y: 20 }
  ];

  const HUMOR_MEMORY_KEY = "ATEAM_HUMOR_MEMORY_V2";
  const HUMOR_MEMORY_LEGACY_KEY = "ATEAM_HUMOR_MEMORY_V1";

  const OFFICE_MODES = {
    flow: "FLOW",
    pulse: "PULSE",
    open_mic: "OPEN MIC"
  };

  const DEFAULT_HUMOR_LINES = [
    { text: "Same mission, different moods.", type: "line", tone: "witty", source: "agent", agent: "all" },
    { text: "We can be playful and still ship.", type: "line", tone: "witty", source: "agent", agent: "all" },
    { text: "If it looks calm, it is.", type: "line", tone: "witty", source: "agent", agent: "all" },
    { text: "Yes, it works. No, it will not explain itself.", type: "line", tone: "sarcastic", source: "agent", agent: "all" },
    { text: "Depth first, speed second.", type: "idea", tone: "reflective", source: "agent", agent: "henry" },
    { text: "Meaning before movement.", type: "idea", tone: "reflective", source: "agent", agent: "henry" },
    { text: "I followed the thread. It multiplied.", type: "line", tone: "witty", source: "agent", agent: "scout" },
    { text: "Curiosity just opened a new tab.", type: "line", tone: "witty", source: "agent", agent: "scout" },
    { text: "Give me a hook and I will lift the room.", type: "line", tone: "dramatic", source: "agent", agent: "quill" },
    { text: "Drama, but make it useful.", type: "line", tone: "dramatic", source: "agent", agent: "quill" },
    { text: "Constraints set. Output pending.", type: "line", tone: "sarcastic", source: "agent", agent: "codex" },
    { text: "Minimal words. Maximum fix.", type: "line", tone: "sarcastic", source: "agent", agent: "codex" }
  ];

  const MC_ROUTE_BY_VIEW = {
    entry: "/",
    tasks: "/tasks",
    agents: "/agents",
    content: "/content",
    approvals: "/approvals",
    council: "/council",
    calendar: "/calendar",
    projects: "/projects",
    memory: "/memory",
    docs: "/docs",
    people: "/people",
    office: "/office",
    team: "/team",
    system: "/system",
    radar: "/radar",
    factory: "/factory",
    pipeline: "/pipeline",
    ai_lab: "/ai-lab",
    talk: "/talk",
    speech: "/speech"
  };

  const MC_SEARCH_SHORTCUTS = [
    { view: "tasks", label: "Tasks", terms: ["task", "tasks", "dashboard", "home"] },
    { view: "agents", label: "Agents", terms: ["agent", "agents", "manchi", "coordinator"] },
    { view: "content", label: "Content", terms: ["content", "draft", "drafts", "radar"] },
    { view: "approvals", label: "Approvals", terms: ["approval", "approvals"] },
    { view: "council", label: "Council", terms: ["council", "governance", "strategy"] },
    { view: "calendar", label: "Calendar", terms: ["calendar", "schedule"] },
    { view: "projects", label: "Projects", terms: ["project", "projects", "initiative", "initiatives", "review", "ledger"] },
    { view: "memory", label: "Memory", terms: ["memory", "journal"] },
    { view: "docs", label: "Docs", terms: ["doc", "docs", "document", "documents", "runbook", "architecture"] },
    { view: "people", label: "People", terms: ["people", "contacts", "handoff", "handoffs"] },
    { view: "office", label: "Office", terms: ["office", "maker", "makers", "avatar", "avatars"] },
    { view: "team", label: "Team", terms: ["team", "roster"] },
    { view: "system", label: "System", terms: ["system", "status", "health"] },
    { view: "radar", label: "Radar", terms: ["signal", "signals", "topic", "topics"] },
    { view: "factory", label: "Factory", terms: ["factory", "build", "qa", "ship"] },
    { view: "pipeline", label: "Pipeline", terms: ["pipeline", "queue"] },
    { view: "ai_lab", label: "AI Lab", terms: ["ai lab", "lab", "voice", "speech"] },
    { view: "talk", label: "Talk", terms: ["talk", "chat", "conversation"] },
    { view: "speech", label: "Speech", terms: ["speech", "recording", "clarity"] }
  ];

  const WORKFLOW_SHELL_VIEWS = ["office", "team", "factory", "pipeline"];
  const MC_TALK_UI_KEY = "MC_TALK_UI_V1";
  const MC_MEMORY_KEY = "MC_MEMORY_JOURNAL_V1";
  const MC_MEMORY_UI_KEY = "MC_MEMORY_JOURNAL_UI_V1";
  const MC_CALENDAR_KEY = "MC_SCHEDULED_TASKS_V1";
  const MC_FACTORY_KEY = "MC_FACTORY_V1";
  const MC_OFFICE2_KEY = "MC_OFFICE2_V1";
  const MC_APPROVALS_UI_KEY = "MC_APPROVALS_UI_V1";

  const MC_OFFICE2_UI_KEY = "MC_OFFICE2_UI_V1";
  const OFFICE2_HIDE_LABELS_KEY = "hideLabels";

  const OFFICE2_LANES = {
    COORDINATION: "coordination",
    SIGNALS: "signals",
    CONTENT: "content",
    BUILD: "build",
    QA: "qa",
    THINK_TANK: "think_tank",
    VOICE: "voice",
    DESIGN: "design",
    OPS: "ops"
  };

  const OFFICE2_LANE_ACCENTS = {
    [OFFICE2_LANES.COORDINATION]: "rgba(248, 113, 113, 0.95)",
    [OFFICE2_LANES.SIGNALS]: "rgba(34, 197, 94, 0.95)",
    [OFFICE2_LANES.CONTENT]: "rgba(250, 204, 21, 0.95)",
    [OFFICE2_LANES.BUILD]: "rgba(96, 165, 250, 0.95)",
    [OFFICE2_LANES.QA]: "rgba(251, 113, 133, 0.95)",
    [OFFICE2_LANES.THINK_TANK]: "rgba(192, 132, 252, 0.95)",
    [OFFICE2_LANES.VOICE]: "rgba(56, 189, 248, 0.95)",
    [OFFICE2_LANES.DESIGN]: "rgba(244, 114, 182, 0.95)",
    [OFFICE2_LANES.OPS]: "rgba(148, 163, 184, 0.9)"
  };

  const OFFICE2_ROLE_ICONS = {
    coordinator: "coordinator",
    signals: "signals",
    writer: "writer",
    builder: "builder",
    qa: "qa",
    think_tank: "think_tank",
    voice: "voice",
    design: "design",
    ops: "ops"
  };

  const OFFICE2_AGENT_DIRECTORY = [
    {
      id: "alex",
      canonicalName: "Alex",
      displayName: "Alex",
      role: "Ops",
      lane: OFFICE2_LANES.OPS,
      silhouetteIcon: OFFICE2_ROLE_ICONS.ops,
      mapsTo: "",
      emoji: "🧑‍💻"
    },
    {
      id: "henry",
      canonicalName: "Henry",
      displayName: "Manchi",
      role: "Coordinator",
      lane: OFFICE2_LANES.COORDINATION,
      silhouetteIcon: OFFICE2_ROLE_ICONS.coordinator,
      mapsTo: "henry",
      emoji: "🧠"
    },
    {
      id: "scout",
      canonicalName: "Scout",
      displayName: "Tinye isi",
      role: "Signals",
      lane: OFFICE2_LANES.SIGNALS,
      silhouetteIcon: OFFICE2_ROLE_ICONS.signals,
      mapsTo: "scout",
      emoji: "🔎"
    },
    {
      id: "quill",
      canonicalName: "Quill",
      displayName: "Eze",
      role: "Writer",
      lane: OFFICE2_LANES.CONTENT,
      silhouetteIcon: OFFICE2_ROLE_ICONS.writer,
      mapsTo: "quill",
      emoji: "✍️"
    },
    {
      id: "pixel",
      canonicalName: "Pixel",
      displayName: "Nwa Baby",
      role: "Design",
      lane: OFFICE2_LANES.DESIGN,
      silhouetteIcon: OFFICE2_ROLE_ICONS.design,
      mapsTo: "",
      emoji: "🎨"
    },
    {
      id: "echo",
      canonicalName: "Echo",
      displayName: "Otota",
      role: "Voice",
      lane: OFFICE2_LANES.VOICE,
      silhouetteIcon: OFFICE2_ROLE_ICONS.voice,
      mapsTo: "",
      emoji: "🔊"
    },
    {
      id: "codex",
      canonicalName: "Codex",
      displayName: "Billy",
      role: "Builder",
      lane: OFFICE2_LANES.BUILD,
      silhouetteIcon: OFFICE2_ROLE_ICONS.builder,
      mapsTo: "codex",
      emoji: "🛠"
    },
    {
      id: "charlie",
      canonicalName: "Charlie",
      displayName: "Abobis",
      role: "Build Support",
      lane: OFFICE2_LANES.BUILD,
      silhouetteIcon: OFFICE2_ROLE_ICONS.builder,
      mapsTo: "",
      emoji: "🧩"
    },
    {
      id: "violet",
      canonicalName: "Violet",
      displayName: "Violet",
      role: "Think Tank",
      lane: OFFICE2_LANES.THINK_TANK,
      silhouetteIcon: OFFICE2_ROLE_ICONS.think_tank,
      mapsTo: "",
      emoji: "🟣"
    },
    {
      id: "ralph",
      canonicalName: "Ralph",
      displayName: "Go Well Daughter",
      role: "QA",
      lane: OFFICE2_LANES.QA,
      silhouetteIcon: OFFICE2_ROLE_ICONS.qa,
      mapsTo: "",
      emoji: "🧪"
    }
  ];

  const PROJECT_PORTFOLIO = [
    {
      id: "mission_control",
      name: "Mission Control",
      ownerAgentId: "henry",
      summary: "Finish the operator shell so every major route is usable and connected to live state.",
      outcome: "A complete command surface for running ATEAM locally.",
      linkedWorkItemIds: ["wi_seed_council", "wi_seed_calendar", "wi_seed_memory", "wi_seed_office"],
      docIds: ["readme", "architecture", "runbook"]
    },
    {
      id: "content_engine",
      name: "Content Engine",
      ownerAgentId: "scout",
      summary: "Turn raw radar signals into topics, drafts, approvals, and scheduled output.",
      outcome: "A believable signal-to-publish operating loop.",
      linkedWorkItemIds: ["wi_seed_pipeline"],
      docIds: ["readme", "extraction_roadmap"]
    },
    {
      id: "factory_ops",
      name: "Factory Ops",
      ownerAgentId: "ralph",
      summary: "Keep delivery moving through build, QA, review, and ship with visible gates.",
      outcome: "Lower friction from backlog to approved release.",
      linkedWorkItemIds: ["wi_seed_factory"],
      docIds: ["architecture", "handover_baseline"]
    },
    {
      id: "integrations",
      name: "Integrations",
      ownerAgentId: "charlie",
      summary: "Extend ATEAM beyond the local shell through gateways, approvals, and external touchpoints.",
      outcome: "Operational integrations that still respect the approval-first model.",
      linkedWorkItemIds: ["wi_seed_integrations"],
      docIds: ["telegram_gateway", "migration_readiness"]
    },
    {
      id: "ai_lab",
      name: "AI Lab",
      ownerAgentId: "henry",
      summary: "Unify live talk, speech clarity, and voice capabilities into one experimentation hub.",
      outcome: "A practical lab for conversation and speech workflows.",
      linkedWorkItemIds: [],
      docIds: ["readme", "handover_baseline"]
    }
  ];

  const OFFICE2_ZONE_ANCHORS = {
    cooler: { x: 24, y: 54 },
    user: { x: 50, y: 88 },
    blocked: { x: 82, y: 76 },
    lane: {
      [OFFICE2_LANES.COORDINATION]: { idle: { x: 60, y: 20 }, working: { x: 58, y: 17 } },
      [OFFICE2_LANES.SIGNALS]: { idle: { x: 18, y: 61 }, working: { x: 24, y: 53 } },
      [OFFICE2_LANES.CONTENT]: { idle: { x: 35, y: 58 }, working: { x: 40, y: 35 } },
      [OFFICE2_LANES.BUILD]: { idle: { x: 56, y: 70 }, working: { x: 70, y: 55 } },
      [OFFICE2_LANES.QA]: { idle: { x: 24, y: 23 }, working: { x: 18, y: 18 } },
      [OFFICE2_LANES.THINK_TANK]: { idle: { x: 50, y: 18 }, working: { x: 49, y: 14 } },
      [OFFICE2_LANES.VOICE]: { idle: { x: 84, y: 55 }, working: { x: 82, y: 50 } },
      [OFFICE2_LANES.DESIGN]: { idle: { x: 74, y: 80 }, working: { x: 72, y: 72 } },
      [OFFICE2_LANES.OPS]: { idle: { x: 24, y: 39 }, working: { x: 26, y: 32 } }
    }
  };

  const OFFICE2_COOLER_CLUSTER = [
    { x: -9.2, y: -7.2 },
    { x: 9.2, y: -7.0 },
    { x: -9.0, y: 7.0 },
    { x: 9.0, y: 7.2 },
    { x: 0.2, y: -7.4 },
    { x: 0.4, y: 7.4 },
    { x: -9.4, y: 0.3 },
    { x: 9.4, y: 0.2 },
    { x: -3.4, y: 0.4 },
    { x: 3.4, y: -0.3 }
  ];

  modules.config = Object.freeze({
    ORIGIN,
    normalizeBasePath,
    detectAteamBasePath,
    ATEAM_BASE_PATH,
    withBasePath,
    stripBasePath,
    API_BASE,
    GLOBAL_TASK_ID,
    GLOBAL_PODCAST_ID,
    LOCAL_THREAD_KEY,
    LOCAL_EVENTS_KEY,
    TTS_CONFIG,
    TAP_COOLDOWN_MS,
    OFFICE_STUDIO_KEY,
    AGENT_STATUS_ORDER,
    DEBUG_HEARTBEAT,
    SILENCE_EVENT_START_MS,
    CHAPTER_SILENCE_THRESHOLD_MS,
    RAPID_SWITCH_THRESHOLD_MS,
    INTERRUPT_RETRY_WINDOW_MS,
    INTERRUPT_RETRY_DELAY_MS,
    VOICE_CONFIRM_THRESHOLD_DEFAULT,
    VOICE_CONFIRM_THRESHOLD_KEY,
    CONFUSION_MAP_KEY,
    CONFUSION_MAP_MAX_ITEMS,
    EXPORT_PACK_SCHEMA_VERSION,
    SPEAKER_OPTIONS,
    SPEAKER_REGISTRY_KEY,
    CONTENT_STATUS_LABELS,
    OFFICE_AGENTS,
    OFFICE_COOLER_OFFSETS,
    HUMOR_MEMORY_KEY,
    HUMOR_MEMORY_LEGACY_KEY,
    OFFICE_MODES,
    DEFAULT_HUMOR_LINES,
    MC_ROUTE_BY_VIEW,
    MC_SEARCH_SHORTCUTS,
    WORKFLOW_SHELL_VIEWS,
    MC_TALK_UI_KEY,
    MC_MEMORY_KEY,
    MC_MEMORY_UI_KEY,
    MC_CALENDAR_KEY,
    MC_FACTORY_KEY,
    MC_OFFICE2_KEY,
    MC_APPROVALS_UI_KEY,
    MC_OFFICE2_UI_KEY,
    OFFICE2_HIDE_LABELS_KEY,
    OFFICE2_LANES,
    OFFICE2_LANE_ACCENTS,
    OFFICE2_ROLE_ICONS,
    OFFICE2_AGENT_DIRECTORY,
    PROJECT_PORTFOLIO,
    OFFICE2_ZONE_ANCHORS,
    OFFICE2_COOLER_CLUSTER
  });
})();
