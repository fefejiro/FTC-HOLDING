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
const storedApiBase = ATEAM_BASE_PATH ? "" : (localStorage.getItem("ATEAM_API_BASE") || "");
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
const TALK_ADVANCED_KEY = "ATEAM_TALK_ADVANCED";

const config = (window.ATEAMModules && window.ATEAMModules.config) || {};
const browserUtils = (window.ATEAMModules && window.ATEAMModules.browserUtils) || {};

const {
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
  OFFICE2_LOCKED_AGENT_IDS,
  PROJECT_PORTFOLIO,
  OFFICE2_ZONE_ANCHORS,
  OFFICE2_COOLER_CLUSTER
} = config;

const {
  safeJsonParse,
  safeJsonStringify,
  countWords,
  formatBytes,
  isoDateToHuman,
  escapeHtml,
  renderMiniMarkdown,
  normalizedSpace,
  compactText
} = browserUtils;

if (!AGENT_STATUS_ORDER || !safeJsonParse) {
  throw new Error("ATEAM shared browser modules failed to load.");
}

const state = {
  view: localStorage.getItem("ATEAM_VIEW") || "entry",
  activeTaskId: "",
  activeTaskTitle: "",
  activeAgent: "",
  currentThread: [],
  talkState: "idle",
  workflowState: "idle",
  currentIntent: "",
  workflowRunId: null,
  transcriptExpanded: false,
  apiOnline: false,
  mediaStream: null,
  audioContext: null,
  analyser: null,
  analyserData: null,
  recognition: null,
  recognitionActive: false,
  supportsRecognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  supportsTTS: "speechSynthesis" in window,
  preferredVoiceURI: localStorage.getItem("ATEAM_VOICE_URI") || "",
  voiceStyle: localStorage.getItem("ATEAM_VOICE_STYLE") || "female_assistant",
  availableVoices: [],
  speaking: false,
  sessionActive: false,
  talkStreamEnabled: true,
  listeningFinal: "",
  listeningInterim: "",
  silenceMonitorTimer: null,
  noiseFloor: 0.008,
  silenceThreshold: 0.02,
  silenceMs: 1500,
  speakingStartTs: 0,
  silenceStartTs: 0,
  silenceWindowStartTs: 0,
  silenceStartedEventSent: false,
  silenceEndedEventSent: false,
  silenceWindowLocked: false,
  silenceChapterCreated: false,
  turnAudioStartMs: 0,
  turnAudioEndMs: 0,
  turnConfidenceTotal: 0,
  turnConfidenceSamples: 0,
  sttLastUpdateTs: 0,
  turnHadSpeech: false,
  turnFinalizePending: false,
  bargeStartTs: 0,
  userSubtitleLastTs: 0,
  userSubtitlePendingText: "",
  userSubtitleTimer: null,
  screenStream: null,
  cameraStream: null,
  screenCaptureTimer: null,
  cameraCaptureTimer: null,
  visionFrames: [],
  visionFrameId: 0,
  fallbackOpen: false,
  orbEnergy: 0.2,
  orbPhase: 0,
  orbSpin: 0,
  orbW: 0,
  orbH: 0,
  rafTs: null,
  subtitleFadeTimer: null,
  subtitleQueueUser: [],
  subtitleQueueAgent: [],
  subtitleRunnerUser: false,
  subtitleRunnerAgent: false,
  subtitleTimerUser: null,
  subtitleTimerAgent: null,
  subtitleTokenUser: 0,
  subtitleTokenAgent: 0,
  speechSession: 0,
  ttsResolve: null,
  ttsWarningShown: false,
  ttsServerWarningShown: false,
  ttsAudioElement: null,
  ttsAudioUrl: "",
  voiceInfoShown: false,
  lastPickedVoiceName: "",
  currentSpeakerId: localStorage.getItem("ATEAM_SPEAKER_ID") || "ai_podcast",
  reviewMode: localStorage.getItem("ATEAM_REVIEW_MODE") === "1",
  lastOrbTapTs: 0,
  pendingRequestController: null,
  pendingRequestToken: 0,
  pendingRequestTurnId: "",
  abortedTurnIds: {},
  activeAssistantTurnId: "",
  assistantThinking: false,
  assistantSpeaking: false,
  activeTtsController: null,
  lastInterruptTs: 0,
  pendingVoiceDraft: null,
  pendingVoiceDraftSuggestions: [],
  pendingVoiceDraftOriginalText: ""
};

const dashboardView = document.getElementById("dashboard-view");
const dashboardConsole = document.getElementById("dashboard-console");
const talkView = document.getElementById("talk-view");
const goDashboardBtn = document.getElementById("go-dashboard");
const goOfficeBtn = document.getElementById("go-office");
const goContentBtn = document.getElementById("go-content");
const goTalkBtn = document.getElementById("go-talk");
const contentView = document.getElementById("content-view");
const officeView = document.getElementById("office-view");
const approvalsView = document.getElementById("approvals-view");
const approvalsCountNode = document.getElementById("approvals-count");
const approvalsListNode = document.getElementById("approvals-list");
const approvalsDetailStatusNode = document.getElementById("approvals-detail-status");
const approvalsDetailNode = document.getElementById("approvals-detail");
const councilView = document.getElementById("council-view");
const calendarView = document.getElementById("calendar-view");
const projectsView = document.getElementById("projects-view");
const memoryView = document.getElementById("memory-view");
const docsView = document.getElementById("docs-view");
const peopleView = document.getElementById("people-view");
const officeRoomView = document.getElementById("office-room-view");
const teamView = document.getElementById("team-view");
const teamCanvas = document.getElementById("team-canvas");
const systemView = document.getElementById("system-view");
const radarView = document.getElementById("radar-view");
const factoryView = document.getElementById("factory-view");
const pipelineView = document.getElementById("pipeline-view");
const aiLabView = document.getElementById("ai-lab-view");
const unaLabsLink = document.getElementById("mc-unalabs-link");

if (ATEAM_BASE_PATH) {
  document.documentElement.classList.add("ateam-integrated");
  if (document.body) document.body.classList.add("ateam-integrated");
  if (unaLabsLink) unaLabsLink.classList.remove("hidden");
  document.title = "ATEAM | Una Labs";
}

const councilSummary = document.getElementById("council-summary");
const councilMetricPending = document.getElementById("council-metric-pending");
const councilMetricBlocked = document.getElementById("council-metric-blocked");
const councilMetricActive = document.getElementById("council-metric-active");
const councilMetricSignals = document.getElementById("council-metric-signals");
const councilSeats = document.getElementById("council-seats");
const councilDecisionList = document.getElementById("council-decision-list");
const councilLanePressure = document.getElementById("council-lane-pressure");
const councilJournalList = document.getElementById("council-journal-list");
const councilRefreshBtn = document.getElementById("council-refresh-btn");
const councilOpenApprovalsBtn = document.getElementById("council-open-approvals-btn");

const projectsSummary = document.getElementById("projects-summary");
const projectsMetricCount = document.getElementById("projects-metric-count");
const projectsMetricWork = document.getElementById("projects-metric-work");
const projectsMetricBlocked = document.getElementById("projects-metric-blocked");
const projectsMetricShip = document.getElementById("projects-metric-ship");
const projectsPortfolioList = document.getElementById("projects-portfolio-list");
const projectsDetail = document.getElementById("projects-detail");
const projectsLedger = document.getElementById("projects-ledger");
const projectsRefreshBtn = document.getElementById("projects-refresh-btn");
const projectsOpenFactoryBtn = document.getElementById("projects-open-factory-btn");
const projectsWorkTitle = document.getElementById("projects-work-title");
const projectsWorkObjective = document.getElementById("projects-work-objective");
const projectsWorkProject = document.getElementById("projects-work-project");
const projectsWorkStage = document.getElementById("projects-work-stage");
const projectsWorkOwner = document.getElementById("projects-work-owner");
const projectsWorkCreateBtn = document.getElementById("projects-work-create-btn");

const docsSummary = document.getElementById("docs-summary");
const docsMetricCount = document.getElementById("docs-metric-count");
const docsMetricArchitecture = document.getElementById("docs-metric-architecture");
const docsMetricPlatform = document.getElementById("docs-metric-platform");
const docsMetricOperations = document.getElementById("docs-metric-operations");
const docsSearchInput = document.getElementById("docs-search-input");
const docsList = document.getElementById("docs-list");
const docsDetailTitle = document.getElementById("docs-detail-title");
const docsDetailMeta = document.getElementById("docs-detail-meta");
const docsDetailBody = document.getElementById("docs-detail-body");
const docsRefreshBtn = document.getElementById("docs-refresh-btn");

const peopleSummary = document.getElementById("people-summary");
const peopleMetricContacts = document.getElementById("people-metric-contacts");
const peopleMetricOperators = document.getElementById("people-metric-operators");
const peopleMetricActive = document.getElementById("people-metric-active");
const peopleMetricHandoffs = document.getElementById("people-metric-handoffs");
const peopleContactsList = document.getElementById("people-contacts-list");
const peopleOperatorsList = document.getElementById("people-operators-list");
const peopleHandoffList = document.getElementById("people-handoff-list");
const peopleOpenTalkBtn = document.getElementById("people-open-talk-btn");
const peopleOpenTeamBtn = document.getElementById("people-open-team-btn");

const systemSummary = document.getElementById("system-summary");
const systemMetricMode = document.getElementById("system-metric-mode");
const systemMetricStorage = document.getElementById("system-metric-storage");
const systemMetricVoice = document.getElementById("system-metric-voice");
const systemMetricTools = document.getElementById("system-metric-tools");
const systemRuntimeCards = document.getElementById("system-runtime-cards");
const systemCountsList = document.getElementById("system-counts-list");
const systemToolsList = document.getElementById("system-tools-list");
const systemAlertsList = document.getElementById("system-alerts-list");
const systemRefreshBtn = document.getElementById("system-refresh-btn");

const radarSummary = document.getElementById("radar-summary");
const radarMetricSignals = document.getElementById("radar-metric-signals");
const radarMetricTopics = document.getElementById("radar-metric-topics");
const radarMetricDrafts = document.getElementById("radar-metric-drafts");
const radarMetricPending = document.getElementById("radar-metric-pending");
const radarSignalsList = document.getElementById("radar-signals-list");
const radarTopicsList = document.getElementById("radar-topics-list");
const radarClusters = document.getElementById("radar-clusters");
const radarRefreshBtn = document.getElementById("radar-refresh-btn");
const radarOpenContentBtn = document.getElementById("radar-open-content-btn");

const pipelineSummary = document.getElementById("pipeline-summary");
const pipelineMetricSignals = document.getElementById("pipeline-metric-signals");
const pipelineMetricDrafts = document.getElementById("pipeline-metric-drafts");
const pipelineMetricApprovals = document.getElementById("pipeline-metric-approvals");
const pipelineMetricDelivery = document.getElementById("pipeline-metric-delivery");
const pipelineBoard = document.getElementById("pipeline-board");
const pipelineStalledList = document.getElementById("pipeline-stalled-list");
const pipelineRefreshBtn = document.getElementById("pipeline-refresh-btn");
const pipelineOpenFactoryBtn = document.getElementById("pipeline-open-factory-btn");

const aiLabSummary = document.getElementById("ai-lab-summary");
const aiLabMetricTurns = document.getElementById("ai-lab-metric-turns");
const aiLabMetricSessions = document.getElementById("ai-lab-metric-sessions");
const aiLabMetricVoices = document.getElementById("ai-lab-metric-voices");
const aiLabMetricRecognition = document.getElementById("ai-lab-metric-recognition");
const aiLabModules = document.getElementById("ai-lab-modules");
const aiLabSessions = document.getElementById("ai-lab-sessions");
const aiLabTurns = document.getElementById("ai-lab-turns");
const aiLabCapabilities = document.getElementById("ai-lab-capabilities");
const aiLabRefreshBtn = document.getElementById("ai-lab-refresh-btn");
const aiLabOpenTalkBtn = document.getElementById("ai-lab-open-talk-btn");
const aiLabOpenSpeechBtn = document.getElementById("ai-lab-open-speech-btn");

const mcNavList = document.getElementById("mc-nav-list");
const mcSearchInput = document.getElementById("mc-search-input");
const mcPauseBtn = document.getElementById("mc-pause");
const mcPingBtn = document.getElementById("mc-ping");
const mcStatusBtn = document.getElementById("mc-status");
const mcRefreshBtn = document.getElementById("mc-refresh");
const mcFeedbackBtn = document.getElementById("mc-feedback");

const mcCommandDrawer = document.getElementById("mc-command-drawer");
const mcCommandDrawerBackdrop = document.getElementById("mc-command-drawer-backdrop");
const mcCommandDrawerBody = document.getElementById("mc-command-drawer-body");
const mcCommandDrawerClose = document.getElementById("mc-command-drawer-close");

const memorySearchInput = document.getElementById("memory-search-input");
const memoryJournalCount = document.getElementById("memory-journal-count");
const memoryJournalGroups = document.getElementById("memory-journal-groups");
const memoryLtmMeta = document.getElementById("memory-ltm-meta");
const journalTitle = document.getElementById("journal-title");
const journalSubhead = document.getElementById("journal-subhead");
const journalModified = document.getElementById("journal-modified");
const journalBody = document.getElementById("journal-body");

const calWeekGrid = document.getElementById("cal-week-grid");
const calWeekBtn = document.getElementById("cal-week-btn");
const calTodayBtn = document.getElementById("cal-today-btn");
const calRefreshBtn = document.getElementById("cal-refresh-btn");

const office2Room = document.getElementById("office2-room");
const office2Entities = document.getElementById("office2-entities");
const office2Tooltip = document.getElementById("office2-tooltip");
const office2ActivityEmpty = document.getElementById("office2-activity-empty");
const office2ActivityList = document.getElementById("office2-activity-list");
const office2AgentCards = document.getElementById("office2-agent-cards");
const office2StartChatBtn = document.getElementById("office2-start-chat");

const factoryBeltItems = document.getElementById("factory-belt-items");
const factoryBuildAgents = document.getElementById("factory-build-agents");
const factoryMetricShipped = document.getElementById("factory-metric-shipped");
const factoryMetricInProgress = document.getElementById("factory-metric-inprogress");
const factoryMetricBacklog = document.getElementById("factory-metric-backlog");
const factoryMetricBlocked = document.getElementById("factory-metric-blocked");
const factoryMetricAvgTime = document.getElementById("factory-metric-avgtime");
const factoryMetricCompleted = document.getElementById("factory-metric-completed");
const factoryCompletedList = document.getElementById("factory-completed-list");

const chipTask = document.getElementById("chip-task");
const chipAgent = document.getElementById("chip-agent");
const chipApi = document.getElementById("chip-api");

const taskCards = Array.from(document.querySelectorAll(".task-card"));
const decisionButtons = Array.from(document.querySelectorAll(".decision-btn"));
const dashboardInput = document.getElementById("dashboard-input");
const dashboardSend = document.getElementById("dashboard-send");
const dashboardThread = document.getElementById("dashboard-thread");

const talkTaskLabel = document.getElementById("talk-task-label");
const talkStateNode = document.getElementById("talk-state");
const talkStateLabel = document.getElementById("talk-state-label");
const talkSubtitle = document.getElementById("talk-subtitle");
const talkHint = document.getElementById("talk-hint");
const talkVoiceToggleBtn = document.getElementById("talk-voice-toggle-btn");
const talkAdvancedToggleBtn = document.getElementById("talk-advanced-toggle-btn");
const talkSettingsPanel = document.getElementById("talk-settings-panel");
const talkAdvancedSections = document.getElementById("talk-advanced-sections");
const talkTranscriptWrap = document.getElementById("talk-transcript-wrap");
const talkTranscriptToggle = document.getElementById("talk-transcript-toggle");
const talkTranscript = document.getElementById("talk-transcript");
const talkTimelineWrap = document.getElementById("talk-timeline-wrap");
const talkTimeline = document.getElementById("talk-timeline");
const talkChapters = document.getElementById("talk-chapters");
const talkSpeakerAnalytics = document.getElementById("talk-speaker-analytics");
const talkSpeakerAnalyticsControls = document.getElementById("talk-speaker-analytics-controls");
const talkUiModeBtn = document.getElementById("talk-ui-mode-btn");
const talkChatInput = document.getElementById("talk-chat-input");
const talkChatSendBtn = document.getElementById("talk-chat-send");
const timelineFilters = document.getElementById("timeline-filters");
const timelineRefreshBtn = document.getElementById("timeline-refresh-btn");
const timelinePauseBtn = document.getElementById("timeline-pause-btn");
const timelineResumeBtn = document.getElementById("timeline-resume-btn");
const timelineClearBtn = document.getElementById("timeline-clear-btn");
const timelineExportBtn = document.getElementById("timeline-export-btn");
const timelineExportPackBtn = document.getElementById("timeline-export-pack-btn");
const reviewModeBtn = document.getElementById("review-mode-btn");
const timelineHighlightBtn = document.getElementById("timeline-highlight-btn");
const timelineReviewControls = document.getElementById("timeline-review-controls");
const timelineReviewPrevBtn = document.getElementById("timeline-review-prev-btn");
const timelineReviewNextBtn = document.getElementById("timeline-review-next-btn");
const timelineReviewLatestBtn = document.getElementById("timeline-review-latest-btn");
const timelineReviewAutoplayBtn = document.getElementById("timeline-review-autoplay-btn");
const timelineReviewStatus = document.getElementById("timeline-review-status");
const chapterClearFocusBtn = document.getElementById("chapter-clear-focus-btn");
const talkSpeakerSelect = document.getElementById("talk-speaker-select");
const talkSpeakerEditLabelBtn = document.getElementById("talk-speaker-edit-label-btn");
const timelineSpeakerFilter = document.getElementById("timeline-speaker-filter");
const ttsToggleBtn = document.getElementById("tts-toggle-btn");
const ttsStopBtn = document.getElementById("tts-stop-btn");
const talkOrbButton = document.getElementById("talk-orb-button");
const talkVoiceStyle = document.getElementById("talk-voice-style");
const visionControls = document.getElementById("vision-controls");
const visionIndicator = document.getElementById("vision-indicator");
const screenShareBtn = document.getElementById("screen-share-btn");
const cameraViewBtn = document.getElementById("camera-view-btn");
const screenPreviewWrap = document.getElementById("screen-preview-wrap");
const cameraPreviewWrap = document.getElementById("camera-preview-wrap");
const screenPreview = document.getElementById("screen-preview");
const cameraPreview = document.getElementById("camera-preview");
const screenStopBtn = document.getElementById("screen-stop-btn");
const cameraStopBtn = document.getElementById("camera-stop-btn");

const subtitleUser = document.getElementById("subtitle-user");
const subtitleAgent = document.getElementById("subtitle-agent");

const fallbackComposer = document.getElementById("fallback-composer");
const fallbackInput = document.getElementById("fallback-input");
const fallbackSuggestions = document.getElementById("fallback-suggestions");
const fallbackSendBtn = document.getElementById("fallback-send-btn");
const fallbackRetryBtn = document.getElementById("fallback-retry-btn");
const fallbackCancelBtn = document.getElementById("fallback-cancel-btn");

const orbWrap = document.getElementById("talk-orb-button");
const orbCanvas = document.getElementById("talk-orb");
const orbCtx = orbCanvas ? orbCanvas.getContext("2d") : null;
const toastContainer = document.getElementById("toast-container");

const contentSignalCount = document.getElementById("content-signal-count");
const contentTopicCount = document.getElementById("content-topic-count");
const contentDraftCount = document.getElementById("content-draft-count");
const contentPendingCount = document.getElementById("content-pending-count");

const contentSignalTitle = document.getElementById("content-signal-title");
const contentSignalSource = document.getElementById("content-signal-source");
const contentSignalUrl = document.getElementById("content-signal-url");
const contentSignalSummary = document.getElementById("content-signal-summary");
const contentSignalSave = document.getElementById("content-signal-save");
const contentSignalClear = document.getElementById("content-signal-clear");

const contentTopicTitle = document.getElementById("content-topic-title");
const contentTopicRationale = document.getElementById("content-topic-rationale");
const contentTopicSave = document.getElementById("content-topic-save");
const contentTopicClear = document.getElementById("content-topic-clear");

const contentRadarList = document.getElementById("content-radar-list");
const contentScoutList = document.getElementById("content-scout-list");
const contentDraftList = document.getElementById("content-draft-list");
const contentPipelineList = document.getElementById("content-pipeline-list");

const contentDraftActive = document.getElementById("content-draft-active");
const contentDraftTopic = document.getElementById("content-draft-topic");
const contentDraftHook = document.getElementById("content-draft-hook");
const contentDraftExplanation = document.getElementById("content-draft-explanation");
const contentDraftInsight = document.getElementById("content-draft-insight");
const contentDraftCta = document.getElementById("content-draft-cta");
const contentDraftStatus = document.getElementById("content-draft-status");
const contentDraftSchedule = document.getElementById("content-draft-schedule");
const contentDraftSave = document.getElementById("content-draft-save");
const contentDraftRequest = document.getElementById("content-draft-request");
const contentDraftApprove = document.getElementById("content-draft-approve");
const contentDraftReject = document.getElementById("content-draft-reject");

const officeCoolerList = document.getElementById("office-cooler-list");
const officeCoolerSummary = document.getElementById("office-cooler-summary");
const officeStage = document.getElementById("office-stage");
const officeStudioToggle = document.getElementById("office-studio-toggle");
const officeAttentionChip = document.getElementById("office-attention-chip");
const officeCommandStation = document.querySelector(".office-command");
const officeCommandZone = document.getElementById("office-command-zone");
const officeBlockedZone = document.getElementById("office-blocked-zone");
const officeDeskSeats = {
  henry: document.getElementById("office-seat-henry"),
  scout: document.getElementById("office-seat-scout"),
  quill: document.getElementById("office-seat-quill"),
  codex: document.getElementById("office-seat-codex")
};
const officeUserZone = document.getElementById("office-user-zone");
const officeModeChip = document.getElementById("office-mode-chip");
const officeHumorAgent = document.getElementById("office-humor-agent");
const officeHumorText = document.getElementById("office-humor-text");
const officeHumorAdd = document.getElementById("office-humor-add");
const officeAgentPool = document.getElementById("office-agent-pool");
const officePoolStatus = document.getElementById("office-pool-status");
const officeCommandEmpty = document.getElementById("office-command-empty");
const officeCommandActive = document.getElementById("office-command-active");
const officeCommandName = document.getElementById("office-command-name");
const officeCommandRole = document.getElementById("office-command-role");
const officeCommandStatus = document.getElementById("office-command-status");
const officeCommandTask = document.getElementById("office-command-task");
const officeCommandLogs = document.getElementById("office-command-logs");
const officeControlDecisions = document.getElementById("office-control-decisions");
const officeActionApprove = document.getElementById("office-action-approve");
const officeActionEdit = document.getElementById("office-action-edit");
const officeActionRetry = document.getElementById("office-action-retry");
const officeActionCancel = document.getElementById("office-action-cancel");
const officeActionPause = document.getElementById("office-action-pause");
const officeActionOverride = document.getElementById("office-action-override");
const officeActionViewLogs = document.getElementById("office-action-viewlogs");

const map = document.getElementById("map");
const rooms = {
  "room-strategy": document.getElementById("room-strategy"),
  "room-apps": document.getElementById("room-apps"),
  "room-jobs": document.getElementById("room-jobs"),
  "room-think": document.getElementById("room-think")
};
const tokens = {
  Coach: document.getElementById("token-coach"),
  Strategist: document.getElementById("token-strategist"),
  Builder: document.getElementById("token-builder"),
  Scout: document.getElementById("token-scout"),
  "Think Tank": document.getElementById("token-thinker")
};
const agentStatusBadges = {
  Coach: document.getElementById("agent-status-coach"),
  Strategist: document.getElementById("agent-status-strategist"),
  Builder: document.getElementById("agent-status-builder"),
  Scout: document.getElementById("agent-status-scout"),
  "Think Tank": document.getElementById("agent-status-thinker"),
  Podcast: document.getElementById("agent-status-podcast")
};
const runtimeState = {
  lane: "talk",
  isListening: false,
  assistantThinking: false,
  assistantSpeaking: false,
  activeAgent: "Coach",
  lastTurnId: "",
  ttsDisabled: false
};
let runtimeHeartbeatTimer = null;
let runtimeHeartbeatInFlight = false;
let runtimeHeartbeatPending = false;
let runtimeAgentStatuses = null;
let runtimeHasEmittedStatus = false;
const timelineState = {
  events: [],
  filter: "all",
  speakerFilter: "all",
  currentSessionStartMs: 0,
  lastFetchedAt: 0,
  lastCount: -1,
  lastEventId: "",
  lastRenderedKey: "",
  pollingPaused: false,
  chapterWindow: null,
  turnSpeakerMap: {}
};
const chapterState = {
  chapters: [],
  activeChapterId: "",
  lastRenderedKey: ""
};
const speakerAnalyticsState = {
  rows: [],
  canonicalRows: [],
  timing: {
    measuredTurns: 0,
    unmeasuredTurns: 0,
    measuredTalkMs: 0
  },
  analyticsKey: "",
  sortBy: "turns",
  lastRefreshEmittedKey: "",
  lastRenderedKey: ""
};
const segmentState = {
  currentSegmentId: "",
  currentSegmentStartAtMs: 0
};
const contentState = {
  store: { signals: [], topics: [], drafts: [] },
  selectedDraftId: ""
};
const officeState = {
  active: false,
  activeAgentId: "",
  lastActiveAgentId: "",
  agents: {},
  overrides: {},
  tasks: [],
  nodes: {},
  timer: null,
  doneTimers: {},
  moveTimers: {},
  pulseTimers: {},
  mode: "flow",
  attentionLeaderId: "",
  waitingActive: false,
  studio: (() => {
    const stored = localStorage.getItem(OFFICE_STUDIO_KEY);
    if (stored === null || stored === undefined || stored === "") return true;
    return stored === "1";
  })(),
  humorMemory: null,
  chatterTimer: null,
  lastSpeakerId: "",
  speechTimers: {}
};
let timelinePollTimer = null;
let timelineFetchInFlight = false;
const reviewPlaybackState = {
  focusedEventKey: "",
  autoPlay: false,
  timer: null,
  intervalMs: 2000
};

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function apiRequest(path, options = {}) {
  const req = {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  };
  if (options.body !== undefined) req.body = JSON.stringify(options.body);
  if (options.signal) req.signal = options.signal;

  const res = await fetch(apiUrl(path), req);
  if (!res.ok) {
    let details = "";
    let parsed = null;
    try {
      details = await res.text();
    } catch {}
    if (details) {
      try {
        parsed = JSON.parse(details);
      } catch {}
    }
    const err = new Error(`${res.status} ${res.statusText} ${details}`.trim());
    err.status = res.status;
    err.payload = parsed;
    err.details = details;
    throw err;
  }
  return res.json();
}

async function emitEvent(type, actor, lane, summary, meta = {}) {
  const sessionId = GLOBAL_PODCAST_ID;
  try {
    await apiRequest(`/events/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: { type, actor, lane, summary, meta }
    });
    return true;
  } catch (err) {
    console.error("[Event Emit Error]", err);
    return false;
  }
}

async function apiListWorkItems({ stage = "", limit = 80 } = {}) {
  const qs = new URLSearchParams();
  if (stage) qs.set("stage", stage);
  if (limit) qs.set("limit", String(limit));
  const data = await apiRequest(`/api/work-items?${qs.toString()}`);
  return Array.isArray(data?.items) ? data.items : [];
}

async function apiListWorkflowRuns({ phase = "", limit = 80 } = {}) {
  const qs = new URLSearchParams();
  if (phase) qs.set("phase", phase);
  if (limit) qs.set("limit", String(limit));
  const data = await apiRequest(`/api/workflow/runs?${qs.toString()}`);
  return Array.isArray(data?.runs) ? data.runs : [];
}

async function apiCreateWorkflowRun(idea, { requestedBy = "operator", category = "" } = {}) {
  const body = { idea, requestedBy };
  if (category) body.category = category;
  const data = await apiRequest("/api/workflow/runs", { method: "POST", body });
  return data?.run || null;
}

async function apiApproveWorkflowRun(runId, { gate = "brief", decision = "approved", actor = "operator" } = {}) {
  const safeId = String(runId || "").trim();
  if (!safeId) return null;
  const data = await apiRequest(`/api/workflow/runs/${encodeURIComponent(safeId)}/approve`, {
    method: "POST",
    body: { gate, decision, actor }
  });
  return data?.run || null;
}

async function apiGenerateWorkflowPack(runId, { actor = "operator" } = {}) {
  const safeId = String(runId || "").trim();
  if (!safeId) return null;
  const data = await apiRequest(`/api/workflow/runs/${encodeURIComponent(safeId)}/generate-pack`, {
    method: "POST",
    body: { actor }
  });
  return data?.run || null;
}

async function apiCreateWorkItem(payload) {
  const data = await apiRequest("/api/work-items", { method: "POST", body: payload });
  return data?.item || null;
}

async function apiSetWorkItemStage(workItemId, stage, extra = {}) {
  const id = String(workItemId || "").trim();
  if (!id) return null;
  const data = await apiRequest(`/api/work-items/${encodeURIComponent(id)}/stage`, {
    method: "POST",
    body: { stage, ...extra }
  });
  return data?.item || null;
}

function isRequestInFlightError(err) {
  const status = Number(err?.status);
  if (status === 409) return true;
  const payloadError = String(err?.payload?.error || "").trim().toLowerCase();
  if (payloadError === "request_in_flight") return true;
  const message = String(err?.message || "").toLowerCase();
  return message.includes("request_in_flight") || message.includes("stream_failed_409");
}

function createTurnId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTurnId(value) {
  return String(value || "").trim();
}

function pruneAbortedTurnIds() {
  const entries = Object.entries(state.abortedTurnIds || {}).sort((a, b) => Number(a[1]) - Number(b[1]));
  if (entries.length <= 60) return;
  const removeCount = entries.length - 60;
  for (let i = 0; i < removeCount; i += 1) {
    delete state.abortedTurnIds[entries[i][0]];
  }
}

function markTurnAborted(turnId) {
  const key = normalizeTurnId(turnId);
  if (!key) return;
  state.abortedTurnIds[key] = Date.now();
  pruneAbortedTurnIds();
}

function clearTurnAborted(turnId) {
  const key = normalizeTurnId(turnId);
  if (!key) return;
  delete state.abortedTurnIds[key];
}

function isTurnAborted(turnId) {
  const key = normalizeTurnId(turnId);
  if (!key) return false;
  return Boolean(state.abortedTurnIds?.[key]);
}

function createSegmentId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return `seg_${globalThis.crypto.randomUUID()}`;
  }
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSpeakerId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (SPEAKER_OPTIONS.some((opt) => opt.id === raw)) return raw;
  return "unknown";
}

function defaultSpeakerLabelById(speakerId) {
  const id = normalizeSpeakerId(speakerId);
  const optionLabel = SPEAKER_OPTIONS.find((opt) => opt.id === id)?.label;
  if (optionLabel) return optionLabel;
  if (!id || id === "unknown") return "Unknown";
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function loadSpeakerRegistry() {
  const registry = {};
  for (const option of SPEAKER_OPTIONS) {
    registry[option.id] = { id: option.id, label: option.label };
  }
  try {
    const raw = localStorage.getItem(SPEAKER_REGISTRY_KEY);
    if (!raw) return registry;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return registry;
    for (const option of SPEAKER_OPTIONS) {
      const incoming = parsed[option.id];
      const label =
        typeof incoming === "string"
          ? incoming.trim()
          : typeof incoming?.label === "string"
            ? incoming.label.trim()
            : "";
      // Migrate older default label for the podcast assistant.
      if (option.id === "ai_podcast" && String(label || "").trim().toLowerCase() === "ai") continue;
      if (label) registry[option.id] = { id: option.id, label };
    }
  } catch {}
  return registry;
}

const speakerRegistry = loadSpeakerRegistry();

function persistSpeakerRegistry() {
  try {
    const compact = {};
    for (const option of SPEAKER_OPTIONS) {
      compact[option.id] = speakerLabelById(option.id);
    }
    localStorage.setItem(SPEAKER_REGISTRY_KEY, JSON.stringify(compact));
  } catch {}
}

function speakerLabelById(speakerId) {
  const id = normalizeSpeakerId(speakerId);
  const label = String(speakerRegistry[id]?.label || "").trim();
  if (label) return label;
  return defaultSpeakerLabelById(id);
}

function renderSpeakerControlOptions() {
  if (talkSpeakerSelect) {
    const selectedSpeakerId = normalizeSpeakerId(state.currentSpeakerId || talkSpeakerSelect.value);
    talkSpeakerSelect.innerHTML = "";
    for (const option of SPEAKER_OPTIONS) {
      const optNode = document.createElement("option");
      optNode.value = option.id;
      optNode.textContent = speakerLabelById(option.id);
      talkSpeakerSelect.appendChild(optNode);
    }
    talkSpeakerSelect.value = selectedSpeakerId;
  }

  if (timelineSpeakerFilter) {
    const selectedFilter = timelineState.speakerFilter === "all" ? "all" : normalizeSpeakerId(timelineState.speakerFilter);
    timelineSpeakerFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";
    timelineSpeakerFilter.appendChild(allOption);
    for (const option of SPEAKER_OPTIONS) {
      const optNode = document.createElement("option");
      optNode.value = option.id;
      optNode.textContent = speakerLabelById(option.id);
      timelineSpeakerFilter.appendChild(optNode);
    }
    timelineSpeakerFilter.value = selectedFilter;
  }

  if (talkSpeakerEditLabelBtn) {
    const label = speakerLabelById(state.currentSpeakerId || "unknown");
    talkSpeakerEditLabelBtn.textContent = `Edit ${label}`;
  }
}

function setSpeakerLabel(speakerId, nextLabel) {
  const id = normalizeSpeakerId(speakerId);
  const normalizedLabel = String(nextLabel || "").trim() || defaultSpeakerLabelById(id);
  const previousLabel = speakerLabelById(id);
  if (normalizedLabel === previousLabel) return false;
  speakerRegistry[id] = { id, label: normalizedLabel };
  persistSpeakerRegistry();
  renderSpeakerControlOptions();
  void refreshSpeakerAnalyticsFromEvents(timelineState.events, { emitSource: "refresh" });
  timelineState.lastRenderedKey = "";
  renderTimeline();
  return true;
}

function setCurrentSpeakerId(speakerId, emitSelection = false) {
  const next = normalizeSpeakerId(speakerId);
  const nextLabel = speakerLabelById(next);
  state.currentSpeakerId = next;
  localStorage.setItem("ATEAM_SPEAKER_ID", next);
  renderSpeakerControlOptions();
  if (talkSpeakerSelect && talkSpeakerSelect.value !== next) talkSpeakerSelect.value = next;
  if (emitSelection) {
    void emitEvent("speaker_selected", "user", "talk", `Speaker selected: ${nextLabel}`, {
      speakerId: next,
      speakerLabel: nextLabel
    });
  }
}

function hydrateSegmentStateFromEvents(events = []) {
  let activeSegmentId = "";
  let activeSegmentStartAtMs = 0;
  for (const event of events) {
    const type = String(event?.type || "");
    const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
    if (type === "segment_started") {
      const segmentId = String(meta?.segmentId || "").trim();
      if (!segmentId) continue;
      activeSegmentId = segmentId;
      activeSegmentStartAtMs = Number(meta?.startAtMs) || getEventTimestampMs(event);
      continue;
    }
    if (type === "segment_ended") {
      const segmentId = String(meta?.segmentId || "").trim();
      if (!segmentId) continue;
      if (segmentId === activeSegmentId) {
        activeSegmentId = "";
        activeSegmentStartAtMs = 0;
      }
    }
  }
  segmentState.currentSegmentId = activeSegmentId;
  segmentState.currentSegmentStartAtMs = activeSegmentStartAtMs;
}

async function ensureActiveSegment(reason = "turn", atMs = Date.now()) {
  if (segmentState.currentSegmentId) return segmentState.currentSegmentId;
  const segmentId = createSegmentId();
  const startAtMs = Number(atMs) || Date.now();
  segmentState.currentSegmentId = segmentId;
  segmentState.currentSegmentStartAtMs = startAtMs;
  await emitEvent("segment_started", "system", "talk", `Segment started (${reason})`, {
    segmentId,
    startAtMs,
    reason
  });
  return segmentId;
}

async function endActiveSegment(reason = "segment_end", atMs = Date.now()) {
  if (!segmentState.currentSegmentId) return null;
  const segmentId = segmentState.currentSegmentId;
  const startAtMs = Number(segmentState.currentSegmentStartAtMs) || Number(atMs) || Date.now();
  const endAtMs = Math.max(startAtMs, Number(atMs) || Date.now());
  const durationMs = Math.max(0, endAtMs - startAtMs);
  await emitEvent("segment_ended", "system", "talk", `Segment ended (${reason})`, {
    segmentId,
    startAtMs,
    endAtMs,
    durationMs,
    reason
  });
  segmentState.currentSegmentId = "";
  segmentState.currentSegmentStartAtMs = 0;
  return segmentId;
}

async function rotateSegment(reason = "long_silence", atMs = Date.now()) {
  await endActiveSegment(reason, atMs);
  return ensureActiveSegment(reason, atMs);
}

function buildTurnSpeakerMap(events = []) {
  const map = {};
  for (const event of events) {
    const type = String(event?.type || "");
    const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
    const turnId = normalizeTurnId(event?.turnId || meta?.turnId || "");
    if (!turnId) continue;
    if (type === "talk_turn_committed" || type === "speaker_labeled") {
      map[turnId] = normalizeSpeakerId(meta?.speakerId);
      continue;
    }
    if (type === "speaker_label_edited") {
      map[turnId] = normalizeSpeakerId(meta?.newSpeakerId || meta?.speakerId);
    }
  }
  return map;
}

function getEffectiveSpeakerId(event) {
  const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
  const turnId = normalizeTurnId(event?.turnId || meta?.turnId || "");
  if (turnId && timelineState.turnSpeakerMap?.[turnId]) return normalizeSpeakerId(timelineState.turnSpeakerMap[turnId]);
  if (meta?.newSpeakerId) return normalizeSpeakerId(meta.newSpeakerId);
  if (meta?.speakerId) return normalizeSpeakerId(meta.speakerId);
  return "unknown";
}

function setRuntimeStateForTurnCommitted(turnId, shouldEmit = true) {
  runtimeState.lane = "talk";
  runtimeState.isListening = true;
  runtimeState.assistantThinking = false;
  runtimeState.assistantSpeaking = false;
  runtimeState.activeAgent = "Coach";
  runtimeState.lastTurnId = normalizeTurnId(turnId);
  if (shouldEmit) scheduleRuntimeHeartbeatTick(true);
}

function setRuntimeStateForAssistantStarted(turnId, shouldEmit = true) {
  runtimeState.lane = "talk";
  runtimeState.isListening = false;
  runtimeState.assistantThinking = true;
  runtimeState.assistantSpeaking = false;
  runtimeState.activeAgent = "Podcast";
  runtimeState.lastTurnId = normalizeTurnId(turnId) || runtimeState.lastTurnId;
  if (shouldEmit) scheduleRuntimeHeartbeatTick(true);
}

function setRuntimeStateForAssistantCompleted(turnId, shouldEmit = true) {
  runtimeState.lane = "talk";
  runtimeState.isListening = false;
  runtimeState.assistantThinking = false;
  runtimeState.assistantSpeaking = false;
  runtimeState.activeAgent = "Coach";
  runtimeState.lastTurnId = normalizeTurnId(turnId) || runtimeState.lastTurnId;
  if (shouldEmit) scheduleRuntimeHeartbeatTick(true);
}

function setRuntimeStateForAssistantSpeaking(turnId, shouldEmit = true) {
  runtimeState.lane = "talk";
  runtimeState.isListening = false;
  runtimeState.assistantThinking = false;
  runtimeState.assistantSpeaking = true;
  runtimeState.activeAgent = "Podcast";
  runtimeState.lastTurnId = normalizeTurnId(turnId) || runtimeState.lastTurnId;
  if (shouldEmit) scheduleRuntimeHeartbeatTick(true);
}

function setRuntimeStateIdle(turnId = "", shouldEmit = true) {
  runtimeState.lane = "talk";
  runtimeState.isListening = false;
  runtimeState.assistantThinking = false;
  runtimeState.assistantSpeaking = false;
  runtimeState.activeAgent = "Coach";
  runtimeState.lastTurnId = normalizeTurnId(turnId) || runtimeState.lastTurnId;
  if (shouldEmit) scheduleRuntimeHeartbeatTick(true);
}

function deriveAgentStatuses() {
  const statuses = Object.fromEntries(AGENT_STATUS_ORDER.map((agent) => [agent, "Idle"]));
  if (runtimeState.lane !== "talk") {
    return statuses;
  }
  if (runtimeState.assistantSpeaking) {
    statuses.Podcast = "Speaking";
    return statuses;
  }
  if (runtimeState.assistantThinking) {
    statuses.Podcast = "Thinking";
    return statuses;
  }
  if (runtimeState.isListening) {
    statuses.Coach = "Listening";
  }
  return statuses;
}

function applyAgentStatusesToUi(statuses) {
  AGENT_STATUS_ORDER.forEach((agent) => {
    const status = String(statuses?.[agent] || "Idle");
    const badge = agentStatusBadges[agent];
    if (badge) {
      badge.textContent = status;
      badge.dataset.status = status.toLowerCase();
    }
    const token = tokens[agent];
    if (token) {
      token.dataset.status = status.toLowerCase();
      token.title = `${agent}: ${status}`;
    }
  });
}

function collectStatusChanges(previousStatuses, nextStatuses) {
  if (!previousStatuses) return [];
  const changes = [];
  for (const agent of AGENT_STATUS_ORDER) {
    const prev = String(previousStatuses?.[agent] || "Idle");
    const next = String(nextStatuses?.[agent] || "Idle");
    if (prev !== next) {
      changes.push({ agent, from: prev, to: next });
    }
  }
  return changes;
}

async function runRuntimeHeartbeatTick(emitOnChange = true) {
  if (runtimeHeartbeatInFlight) {
    runtimeHeartbeatPending = runtimeHeartbeatPending || Boolean(emitOnChange);
    return;
  }
  runtimeHeartbeatInFlight = true;
  try {
    const nextStatuses = deriveAgentStatuses();
    applyAgentStatusesToUi(nextStatuses);
    if (officeState.active) {
      updateOfficeSimulation();
    }

    const changes = collectStatusChanges(runtimeAgentStatuses, nextStatuses);
    const shouldEmit = emitOnChange && (!runtimeHasEmittedStatus || changes.length);
    if (shouldEmit) {
      const summary = changes.map((entry) => `${entry.agent}: ${entry.to}`).join(" | ");
      const statusKey = AGENT_STATUS_ORDER.map((agent) => `${agent}:${nextStatuses[agent] || "Idle"}`).join("|");
      if (DEBUG_HEARTBEAT) {
        console.info("[Heartbeat] agent_status_updated", {
          turnId: runtimeState.lastTurnId || null,
          isListening: runtimeState.isListening,
          assistantThinking: runtimeState.assistantThinking,
          assistantSpeaking: runtimeState.assistantSpeaking,
          statusKey
        });
      }
      const emitted = await emitEvent("agent_status_updated", "system", "system", `Status update: ${summary || statusKey}`, {
        turnId: runtimeState.lastTurnId || undefined,
        statusKey,
        statuses: nextStatuses,
        changes
      });
      if (emitted) runtimeHasEmittedStatus = true;
    }
    runtimeAgentStatuses = nextStatuses;
  } finally {
    runtimeHeartbeatInFlight = false;
    if (runtimeHeartbeatPending) {
      const shouldEmit = runtimeHeartbeatPending;
      runtimeHeartbeatPending = false;
      void runRuntimeHeartbeatTick(shouldEmit);
    }
  }
}

function scheduleRuntimeHeartbeatTick(emitOnChange = true) {
  if (runtimeHeartbeatInFlight) {
    runtimeHeartbeatPending = runtimeHeartbeatPending || Boolean(emitOnChange);
    return;
  }
  void runRuntimeHeartbeatTick(emitOnChange);
}

function stopRuntimeHeartbeat() {
  if (runtimeHeartbeatTimer) {
    clearInterval(runtimeHeartbeatTimer);
    runtimeHeartbeatTimer = null;
  }
}

function startRuntimeHeartbeat() {
  stopRuntimeHeartbeat();
  scheduleRuntimeHeartbeatTick(true);
  runtimeHeartbeatTimer = setInterval(() => {
    scheduleRuntimeHeartbeatTick(true);
  }, 3000);
}

function applyRuntimeStateFromEvent(event) {
  const type = String(event?.type || "");
  const turnId = normalizeTurnId(event?.turnId || event?.meta?.turnId || "");
  if (type === "talk_turn_committed") {
    setRuntimeStateForTurnCommitted(turnId, false);
    return;
  }
  if (type === "assistant_response_started") {
    setRuntimeStateForAssistantStarted(turnId, false);
    return;
  }
  if (type === "assistant_response_completed") {
    setRuntimeStateForAssistantCompleted(turnId, false);
    return;
  }
  if (type === "error") {
    setRuntimeStateIdle(turnId, false);
    return;
  }
  if (type === "agent_status_updated") {
    const statusMeta = event?.meta?.statuses;
    if (statusMeta && typeof statusMeta === "object" && !Array.isArray(statusMeta)) {
      const podcastStatus = String(statusMeta?.Podcast || "Idle");
      const coachStatus = String(statusMeta?.Coach || "Idle");
      runtimeState.lane = "talk";
      runtimeState.assistantSpeaking = podcastStatus === "Speaking";
      runtimeState.assistantThinking = podcastStatus === "Thinking";
      runtimeState.isListening = coachStatus === "Listening";
      runtimeState.activeAgent =
        runtimeState.assistantSpeaking || runtimeState.assistantThinking ? "Podcast" : "Coach";
      runtimeAgentStatuses = Object.fromEntries(
        AGENT_STATUS_ORDER.map((agent) => [agent, String(statusMeta?.[agent] || "Idle")])
      );
      applyAgentStatusesToUi(runtimeAgentStatuses);
    }
    if (turnId) runtimeState.lastTurnId = turnId;
    return;
  }
  if (turnId) runtimeState.lastTurnId = turnId;
}

async function hydrateRuntimeStateFromLatestEvent() {
  try {
    const data = await apiRequest(`/events/${encodeURIComponent(GLOBAL_PODCAST_ID)}`);
    const events = Array.isArray(data?.events) ? data.events : [];
    const latest = events.length ? events[events.length - 1] : null;
    if (!latest) {
      setRuntimeStateIdle("", false);
      await runRuntimeHeartbeatTick(false);
      return;
    }
    applyRuntimeStateFromEvent(latest);
    await runRuntimeHeartbeatTick(false);
  } catch (err) {
    console.error("[RuntimeState] hydrate failed", err);
    setRuntimeStateIdle("", false);
    await runRuntimeHeartbeatTick(false);
  }
}

function showToast(message, type = "info") {
  if (!toastContainer) return;
  const node = document.createElement("div");
  node.className = `toast ${type === "error" ? "error" : type === "ok" ? "ok" : ""}`;
  node.textContent = message;
  toastContainer.appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

function setApiOnline(ok) {
  state.apiOnline = Boolean(ok);
  if (chipApi) chipApi.textContent = `API: ${state.apiOnline ? "online" : "offline"}`;
}

function saveLocalThread(thread) {
  try {
    localStorage.setItem(LOCAL_THREAD_KEY, JSON.stringify(thread || []));
  } catch {}
}

function loadLocalThread() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_THREAD_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalEvents(events) {
  try {
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events || []));
  } catch {}
}

function loadLocalEvents() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function buildTalkDemoThread() {
  return [
    {
      role: "user",
      agent: "",
      content: "What is your name",
      ts: "2026-03-20T19:03:40-04:00"
    },
    {
      role: "assistant",
      agent: "Coach",
      content: "I'm Manchi. Drop the rough idea, and I'll shape the first pass.",
      ts: "2026-03-20T19:03:46-04:00"
    }
  ];
}

function buildTalkDemoEvents() {
  const statusSummary =
    "Status update: Coach:Idle|Strategist:Idle|Builder:Idle|Scout:Idle|Think Tank:Idle|Podcast:Idle";
  const statuses = {
    Coach: "Idle",
    Strategist: "Idle",
    Builder: "Idle",
    Scout: "Idle",
    "Think Tank": "Idle",
    Podcast: "Idle"
  };
  const demoTurnId = "seed_turn_1";
  const assistantReply = "I'm Manchi. Drop the rough idea, and I'll shape the first pass.";

  return [
    {
      id: "seed_evt_chapter_20",
      type: "chapter_created",
      actor: "system",
      lane: "talk",
      summary: "Chapter created",
      meta: {
        chapterId: "chapter_20_silence",
        reason: "long_silence",
        title: "Chapter 20 - Silence",
        summary: "Long silence break (00:08)",
        startAtMs: 0,
        endAtMs: 183000,
        turnIds: []
      },
      timestamp: "2026-03-20T19:02:00-04:00"
    },
    {
      id: "seed_evt_chapter_21",
      type: "chapter_created",
      actor: "system",
      lane: "talk",
      summary: "Chapter created",
      meta: {
        chapterId: "chapter_21_highlight",
        reason: "highlight",
        title: "Highlight 21",
        summary: "",
        startAtMs: 183000,
        endAtMs: 217000,
        turnIds: []
      },
      timestamp: "2026-03-20T19:02:40-04:00"
    },
    {
      id: "seed_evt_status_1",
      type: "agent_status_updated",
      actor: "system",
      lane: "system",
      summary: statusSummary,
      meta: { statuses },
      timestamp: "2026-03-20T19:03:55-04:00"
    },
    {
      id: "seed_evt_turn_1",
      type: "talk_turn_committed",
      actor: "user",
      lane: "talk",
      summary: "What is your name",
      turnId: demoTurnId,
      meta: { text: "What is your name", speakerId: "ai_podcast", turnId: demoTurnId },
      timestamp: "2026-03-20T19:04:05-04:00"
    },
    {
      id: "seed_evt_assistant_1",
      type: "assistant_response_completed",
      actor: "podcast",
      lane: "talk",
      summary: `Agent (Coach): ${assistantReply}`,
      turnId: demoTurnId,
      meta: { agent: "Coach", agentReply: assistantReply, speakerId: "ai_podcast", turnId: demoTurnId },
      timestamp: "2026-03-20T19:04:12-04:00"
    }
  ];
}

function ensureTalkDemoSeeded() {
  const thread = loadLocalThread();
  if (!Array.isArray(thread) || thread.length === 0) {
    saveLocalThread(buildTalkDemoThread());
  }
  const events = loadLocalEvents();
  if (!Array.isArray(events) || events.length === 0) {
    saveLocalEvents(buildTalkDemoEvents());
  }
}

function clearSubtitleFadeTimer() {
  if (state.subtitleFadeTimer) {
    clearTimeout(state.subtitleFadeTimer);
    state.subtitleFadeTimer = null;
  }
}

function showSubtitleNode(node, text) {
  if (!node) return;
  node.textContent = text || "";
  if (text) node.classList.add("visible");
}

function hideSubtitleNode(node) {
  if (!node) return;
  node.classList.remove("visible");
}

function setUserSubtitle(text) {
  clearSubtitleFadeTimer();
  hideSubtitleNode(subtitleAgent);
  showSubtitleNode(subtitleUser, normalizedSpace(text));
}

function setAgentSubtitle(text) {
  clearSubtitleFadeTimer();
  hideSubtitleNode(subtitleUser);
  showSubtitleNode(subtitleAgent, normalizedSpace(text));
}

function fadeSubtitlesSoon(delayMs = 2400) {
  clearSubtitleFadeTimer();
  state.subtitleFadeTimer = setTimeout(() => {
    hideSubtitleNode(subtitleUser);
    hideSubtitleNode(subtitleAgent);
  }, delayMs);
}

function clearSubtitleTimer(kind) {
  if (kind === "user") {
    if (state.subtitleTimerUser) {
      clearTimeout(state.subtitleTimerUser);
      state.subtitleTimerUser = null;
    }
    return;
  }
  if (state.subtitleTimerAgent) {
    clearTimeout(state.subtitleTimerAgent);
    state.subtitleTimerAgent = null;
  }
}

function clearSubtitleQueue(kind) {
  clearSubtitleTimer(kind);
  if (kind === "user") {
    state.subtitleQueueUser = [];
    state.subtitleRunnerUser = false;
    state.subtitleTokenUser += 1;
    return;
  }
  state.subtitleQueueAgent = [];
  state.subtitleRunnerAgent = false;
  state.subtitleTokenAgent += 1;
}

function stopSubtitleChunker(kind = "all") {
  if (kind === "all" || kind === "user") clearSubtitleQueue("user");
  if (kind === "all" || kind === "agent") clearSubtitleQueue("agent");
}

function splitSubtitlePhrases(text, minWords = 6, maxWords = 12) {
  const normalized = normalizedSpace(text);
  if (!normalized) return [];
  const punctuated = normalized.match(/[^.!?]+[.!?]?/g) || [normalized];
  const phrases = [];
  for (const rawSegment of punctuated) {
    const segment = normalizedSpace(rawSegment);
    if (!segment) continue;
    const words = segment.split(" ");
    if (words.length <= maxWords) {
      phrases.push(segment);
      continue;
    }
    let idx = 0;
    while (idx < words.length) {
      const remaining = words.length - idx;
      const size = remaining <= maxWords ? remaining : Math.max(minWords, Math.min(maxWords, 9));
      phrases.push(words.slice(idx, idx + size).join(" "));
      idx += size;
    }
  }
  return phrases;
}

function phraseDisplayMs(phrase, minMs = 650, maxMs = 1400) {
  const words = normalizedSpace(phrase).split(" ").filter(Boolean).length;
  if (!words) return minMs;
  const ms = 260 + words * 120;
  return Math.max(minMs, Math.min(maxMs, ms));
}

function stopUserSubtitleTimer() {
  if (state.userSubtitleTimer) {
    clearTimeout(state.userSubtitleTimer);
    state.userSubtitleTimer = null;
  }
}

function subtitleStateFor(kind) {
  if (kind === "user") {
    return {
      queueKey: "subtitleQueueUser",
      runKey: "subtitleRunnerUser",
      timerKind: "user",
      tokenKey: "subtitleTokenUser",
      node: subtitleUser,
      other: subtitleAgent
    };
  }
  return {
    queueKey: "subtitleQueueAgent",
    runKey: "subtitleRunnerAgent",
    timerKind: "agent",
    tokenKey: "subtitleTokenAgent",
    node: subtitleAgent,
    other: subtitleUser
  };
}

function enqueueSubtitlePhrases(kind, phrases, append = false) {
  const cfg = subtitleStateFor(kind);
  const list = Array.isArray(phrases) ? phrases.map((p) => normalizedSpace(p)).filter(Boolean) : [];
  if (!list.length) return;
  if (!append) {
    clearSubtitleQueue(kind);
  }
  state[cfg.queueKey].push(...list);
  void runSubtitleQueue(kind);
}

async function runSubtitleQueue(kind) {
  const cfg = subtitleStateFor(kind);
  if (state[cfg.runKey]) return;
  state[cfg.runKey] = true;
  const token = state[cfg.tokenKey];
  try {
    while (state[cfg.queueKey].length && token === state[cfg.tokenKey]) {
      const phrase = state[cfg.queueKey].shift();
      const displayMs = phraseDisplayMs(phrase);
      await new Promise((resolve) => {
        if (token !== state[cfg.tokenKey]) {
          resolve();
          return;
        }
        clearSubtitleFadeTimer();
        hideSubtitleNode(cfg.other);
        const show = () => {
          if (token !== state[cfg.tokenKey]) {
            resolve();
            return;
          }
          showSubtitleNode(cfg.node, phrase);
          clearSubtitleTimer(cfg.timerKind);
          if (cfg.timerKind === "user") {
            state.subtitleTimerUser = setTimeout(() => {
              state.subtitleTimerUser = null;
              resolve();
            }, displayMs);
          } else {
            state.subtitleTimerAgent = setTimeout(() => {
              state.subtitleTimerAgent = null;
              resolve();
            }, displayMs);
          }
        };
        const nodeVisible = Boolean(cfg.node && cfg.node.classList && cfg.node.classList.contains("visible"));
        if (nodeVisible) {
          try {
            cfg.node.classList.remove("visible");
          } catch {}
          clearSubtitleTimer(cfg.timerKind);
          if (cfg.timerKind === "user") {
            state.subtitleTimerUser = setTimeout(() => {
              state.subtitleTimerUser = null;
              show();
            }, 150);
          } else {
            state.subtitleTimerAgent = setTimeout(() => {
              state.subtitleTimerAgent = null;
              show();
            }, 150);
          }
        } else {
          show();
        }
      });
    }
  } finally {
    state[cfg.runKey] = false;
    if (state[cfg.queueKey].length && token === state[cfg.tokenKey]) {
      void runSubtitleQueue(kind);
    }
  }
}

function runSubtitleChunks(kind, text, options = {}) {
  const opts =
    typeof options === "number"
      ? { append: false, minWords: 6, maxWords: 12 }
      : {
          append: Boolean(options.append),
          minWords: Number.isFinite(options.minWords) ? Number(options.minWords) : 6,
          maxWords: Number.isFinite(options.maxWords) ? Number(options.maxWords) : 12
        };
  const chunks = splitSubtitlePhrases(text, opts.minWords, opts.maxWords);
  if (!chunks.length) {
    if (!opts.append) {
      if (kind === "user") hideSubtitleNode(subtitleUser);
      else hideSubtitleNode(subtitleAgent);
    }
    return;
  }
  enqueueSubtitlePhrases(kind, chunks, opts.append);
}

function queueUserSubtitle(text) {
  const latest = normalizedSpace(text);
  if (!latest) {
    hideSubtitleNode(subtitleUser);
    stopUserSubtitleTimer();
    state.userSubtitlePendingText = "";
    clearSubtitleQueue("user");
    return;
  }
  state.userSubtitlePendingText = latest;
  const now = Date.now();
  const elapsed = now - state.userSubtitleLastTs;
  const flush = () => {
    const pending = state.userSubtitlePendingText;
    state.userSubtitlePendingText = "";
    state.userSubtitleLastTs = Date.now();
    runSubtitleChunks("user", pending, { append: false, minWords: 6, maxWords: 12 });
  };
  if (elapsed >= 260) {
    stopUserSubtitleTimer();
    flush();
    return;
  }
  if (!state.userSubtitleTimer) {
    state.userSubtitleTimer = setTimeout(() => {
      state.userSubtitleTimer = null;
      flush();
    }, 260 - elapsed);
  }
}

function chunkText(text, wordsPerChunk = 12) {
  const words = normalizedSpace(text).split(" ").filter(Boolean);
  if (!words.length) return [];
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks;
}

function extractPhrasesFromBuffer(buffer, force = false) {
  let working = String(buffer || "");
  const phrases = [];
  while (true) {
    const punctMatch = working.match(/^(.*?[.!?])(\s+|$)/);
    if (punctMatch) {
      const phrase = normalizedSpace(punctMatch[1]);
      if (phrase) phrases.push(phrase);
      working = working.slice(punctMatch[0].length);
      continue;
    }

    const words = normalizedSpace(working).split(" ").filter(Boolean);
    if (!words.length) break;
    if (!force && words.length < 12) break;

    const take = force ? words.length : Math.min(10, words.length);
    const phrase = words.slice(0, take).join(" ");
    if (phrase) phrases.push(phrase);
    working = words.slice(take).join(" ");
    if (force) break;
  }
  return {
    phrases,
    remaining: working
  };
}

function parseSseDataPayload(raw) {
  const text = String(raw || "");
  if (!text) return "";
  const first = text.trimStart()[0];
  if (first === "{" || first === "[" || first === "\"") {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function normalizeStreamReply(donePayload, fullText) {
  const selectCanonicalReply = (doneReply, streamReply) => {
    const done = normalizedSpace(doneReply || "");
    const stream = normalizedSpace(streamReply || "");
    if (!done && !stream) return "";
    if (!done) return stream;
    if (!stream) return done;
    if (done === stream) return done;

    const doneCollapsed = normalizeAssistantReplyText(done);
    const streamCollapsed = normalizeAssistantReplyText(stream);
    if (doneCollapsed === streamCollapsed) return doneCollapsed;

    // If one text clearly contains the other as duplicated tail/body, keep the shorter canonical version.
    if (done.includes(stream) && done.length >= stream.length * 1.5) return stream;
    if (stream.includes(done) && stream.length >= done.length * 1.5) return done;

    // Prefer stream buffer when done payload collapses exactly to stream content.
    if (doneCollapsed === stream) return stream;
    if (streamCollapsed === done) return done;

    // Default: prefer done payload for non-duplication protocol metadata finalization.
    return done;
  };

  if (typeof donePayload === "string") {
    return {
      ok: true,
      reply: selectCanonicalReply(donePayload, fullText)
    };
  }
  if (donePayload && typeof donePayload === "object") {
    return {
      ok: donePayload.ok !== false,
      taskId: donePayload.taskId || GLOBAL_PODCAST_ID,
      agent: donePayload.agent || "podcast",
      reply: selectCanonicalReply(donePayload.reply, fullText),
      updatedThread: Array.isArray(donePayload.updatedThread) ? donePayload.updatedThread : null,
      modelUsed: donePayload.modelUsed || "",
      fallbackUsed: Boolean(donePayload.fallbackUsed)
    };
  }
  return {
    ok: true,
    taskId: GLOBAL_PODCAST_ID,
    agent: "podcast",
    reply: normalizedSpace(fullText),
    updatedThread: null
  };
}

function tryParseBoolean(input, fallback = false) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function parseMetaPayload(metaPayload) {
  if (!metaPayload || typeof metaPayload !== "object") return {};
  return {
    modelUsed: String(metaPayload.modelUsed || ""),
    fallbackUsed: tryParseBoolean(metaPayload.fallbackUsed, false)
  };
}

function mergeResultMeta(result, meta) {
  if (!result || !meta) return result;
  return {
    ...result,
    modelUsed: result.modelUsed || meta.modelUsed || "",
    fallbackUsed: Boolean(result.fallbackUsed || meta.fallbackUsed)
  };
}

function ensureResultThread(result) {
  if (!result) return result;
  if (!Array.isArray(result.updatedThread)) {
    result.updatedThread = null;
  }
  return result;
}

function splitReplySentences(text = "") {
  const normalized = normalizedSpace(String(text || "").replace(/([.!?])([A-Za-z])/g, "$1 $2"));
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]?/g);
  if (!matches) return [normalized];
  return matches.map((part) => normalizedSpace(part)).filter(Boolean);
}

function areTokenSequencesEqual(left = "", right = "") {
  const leftTokens = String(left || "").toLowerCase().split(" ").filter(Boolean);
  const rightTokens = String(right || "").toLowerCase().split(" ").filter(Boolean);
  if (leftTokens.length !== rightTokens.length) return false;
  for (let i = 0; i < leftTokens.length; i += 1) {
    if (leftTokens[i] !== rightTokens[i]) return false;
  }
  return true;
}

function dedupeAdjacentSentenceRuns(text = "") {
  const sentences = splitReplySentences(text);
  if (!sentences.length) return "";
  const compact = [];
  for (const sentence of sentences) {
    const prev = compact[compact.length - 1];
    if (prev && areTokenSequencesEqual(prev, sentence)) continue;
    compact.push(sentence);
  }
  if (compact.length < 2) return normalizedSpace(compact.join(" "));

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let runSize = Math.floor(compact.length / 2); runSize >= 1; runSize -= 1) {
      for (let start = 0; start + runSize * 2 <= compact.length; start += 1) {
        let same = true;
        for (let offset = 0; offset < runSize; offset += 1) {
          if (!areTokenSequencesEqual(compact[start + offset], compact[start + runSize + offset])) {
            same = false;
            break;
          }
        }
        if (!same) continue;
        compact.splice(start + runSize, runSize);
        changed = true;
        break outer;
      }
    }
  }
  return normalizedSpace(compact.join(" "));
}

function dedupeRepeatedWordRuns(text = "", minRunWords = 3) {
  const words = normalizedSpace(text).split(" ").filter(Boolean);
  if (!words.length) return "";
  if (words.length < minRunWords * 2) return words.join(" ");

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let runSize = Math.floor(words.length / 2); runSize >= minRunWords; runSize -= 1) {
      for (let start = 0; start + runSize * 2 <= words.length; start += 1) {
        let same = true;
        for (let offset = 0; offset < runSize; offset += 1) {
          if (words[start + offset].toLowerCase() !== words[start + runSize + offset].toLowerCase()) {
            same = false;
            break;
          }
        }
        if (!same) continue;
        words.splice(start + runSize, runSize);
        changed = true;
        break outer;
      }
    }
  }
  return words.join(" ");
}

function normalizeAssistantReplyText(input) {
  let text = normalizedSpace(input || "");
  if (!text) return "";

  for (let repeats = 4; repeats >= 2; repeats -= 1) {
    if (text.length % repeats !== 0) continue;
    const partLen = text.length / repeats;
    const first = text.slice(0, partLen);
    let allSame = true;
    for (let i = 1; i < repeats; i += 1) {
      if (text.slice(i * partLen, (i + 1) * partLen) !== first) {
        allSame = false;
        break;
      }
    }
    if (allSame) return normalizedSpace(first);
  }

  const left = text.slice(0, Math.floor(text.length / 2));
  const right = text.slice(Math.floor(text.length / 2));
  if (left && right && Math.abs(left.length - right.length) <= 20 && normalizedSpace(left) === normalizedSpace(right)) {
    return normalizedSpace(left);
  }

  text = dedupeAdjacentSentenceRuns(text);
  text = dedupeRepeatedWordRuns(text, 3);
  return text;
}

function clampStringReply(result) {
  if (!result) return result;
  result.reply = normalizeAssistantReplyText(result.reply || "");
  return result;
}

function normalizeTalkResult(result) {
  return clampStringReply(ensureResultThread(result));
}

function resultFromStream(donePayload, fullText, metaPayload) {
  const result = normalizeTalkResult(normalizeStreamReply(donePayload, fullText));
  return {
    ...mergeResultMeta(result, parseMetaPayload(metaPayload)),
    transport: "stream"
  };
}

function subtitlesForStreamPhrase(phrase) {
  const chunks = splitSubtitlePhrases(phrase, 6, 12);
  return chunks.length ? chunks : [normalizedSpace(phrase)];
}

function pushStreamPhraseToSubtitle(phrase) {
  const items = subtitlesForStreamPhrase(phrase);
  enqueueSubtitlePhrases("agent", items, true);
}

function finalizeStreamPhraseBuffer(phraseBuffer, onPhrase) {
  const flushed = extractPhrasesFromBuffer(phraseBuffer, true);
  for (const phrase of flushed.phrases) {
    if (typeof onPhrase === "function") onPhrase(phrase);
  }
  return flushed.remaining;
}

function pushBufferedStreamPhrases(phraseBuffer, onPhrase) {
  const flushed = extractPhrasesFromBuffer(phraseBuffer, false);
  for (const phrase of flushed.phrases) {
    if (typeof onPhrase === "function") onPhrase(phrase);
  }
  return flushed.remaining;
}

function parseSseBlock(block) {
  const lines = String(block || "").split("\n");
  let eventName = "message";
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^\s/, ""));
    }
  }
  return {
    eventName,
    payload: parseSseDataPayload(dataLines.join("\n"))
  };
}

function setTalkState(next) {
  state.talkState = next;
  state.assistantThinking = next === "thinking";
  state.assistantSpeaking = next === "speaking";
  const label =
    next === "listening"
      ? "Listening"
      : next === "thinking"
      ? "Thinking"
      : next === "speaking"
      ? "Speaking"
      : "Idle";

  if (talkStateNode) talkStateNode.dataset.state = next;
  if (talkStateLabel) talkStateLabel.textContent = label;

  if (next === "idle") {
    fadeSubtitlesSoon(2600);
  } else {
    clearSubtitleFadeTimer();
  }

  updateStopVoiceBtnUi();
  updateTalkVoiceToggleUi();
  if (!talkHint) return;
  if (next === "idle") talkHint.textContent = state.reviewMode && !state.sessionActive ? "Review mode active. Disable review mode to talk." : "Type the intake below or start voice intake.";
  if (next === "listening") talkHint.textContent = "Listening... press Stop voice intake when you're done.";
  if (next === "thinking") talkHint.textContent = "ATEAM is shaping the intake...";
  if (next === "speaking") talkHint.textContent = "ATEAM is replying...";
}

function loadTalkAdvancedPref() {
  try {
    return localStorage.getItem(TALK_ADVANCED_KEY) === "1";
  } catch {
    return false;
  }
}

function setTalkAdvancedVisible(visible, options = {}) {
  const on = Boolean(visible);
  const persist = options.persist !== false;
  if (talkSettingsPanel) talkSettingsPanel.classList.toggle("hidden", !on);
  if (talkAdvancedSections) talkAdvancedSections.classList.toggle("hidden", !on);
  if (talkAdvancedToggleBtn) {
    talkAdvancedToggleBtn.textContent = on ? "Hide session details" : "Show session details";
    talkAdvancedToggleBtn.setAttribute("aria-expanded", on ? "true" : "false");
    talkAdvancedToggleBtn.classList.toggle("active", on);
  }
  if (!persist) return;
  try {
    localStorage.setItem(TALK_ADVANCED_KEY, on ? "1" : "0");
  } catch {}
}

function updateTalkVoiceToggleUi() {
  if (!talkVoiceToggleBtn) return;
  if (!state.supportsRecognition) {
    talkVoiceToggleBtn.textContent = "Voice unavailable";
    talkVoiceToggleBtn.dataset.state = "disabled";
    talkVoiceToggleBtn.disabled = true;
    return;
  }

  talkVoiceToggleBtn.disabled = false;
  let label = "Start voice intake";
  let buttonState = "idle";
  if (state.sessionActive) {
    if (state.talkState === "thinking" || state.talkState === "speaking" || state.assistantThinking || state.assistantSpeaking) {
      label = "Interrupt and listen";
      buttonState = state.talkState === "speaking" ? "speaking" : "thinking";
    } else {
      label = "Stop voice intake";
      buttonState = "listening";
    }
  }
  talkVoiceToggleBtn.textContent = label;
  talkVoiceToggleBtn.dataset.state = buttonState;
}

function setOrbSubtitle(text) {
  if (talkSubtitle) talkSubtitle.textContent = text || "";
}

function cancelPendingThinking() {
  const pendingTurnId = normalizeTurnId(state.pendingRequestTurnId || runtimeState.lastTurnId);
  if (pendingTurnId) markTurnAborted(pendingTurnId);
  if (state.pendingRequestController) {
    state.pendingRequestController.abort();
    state.pendingRequestController = null;
  }
  if (pendingTurnId && normalizeTurnId(state.activeAssistantTurnId) === pendingTurnId) {
    state.activeAssistantTurnId = "";
  }
  state.assistantThinking = false;
  state.pendingRequestTurnId = "";
  state.pendingRequestToken += 1;
  updateStopVoiceBtnUi();
}

function workflowShellModeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return String(params.get("shell") || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function workflowRunIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return String(params.get("workflowRunId") || "").trim();
  } catch {
    return "";
  }
}

function isWorkflowShellActive() {
  return Boolean(ATEAM_BASE_PATH) && workflowShellModeFromUrl() === "workflow";
}

function isWorkflowShellView(view) {
  return WORKFLOW_SHELL_VIEWS.includes(String(view || "").trim().toLowerCase());
}

function applyWorkflowShellChrome() {
  if (!mcNavList) return;
  const active = isWorkflowShellActive();
  mcNavList.querySelectorAll(".mc-nav-item").forEach((btn) => {
    const view = String(btn.dataset.view || "").trim().toLowerCase();
    const allowed = !active || isWorkflowShellView(view);
    btn.classList.toggle("hidden", !allowed);
    btn.disabled = !allowed;
  });

  if (unaLabsLink && active) {
    const workflowRunId = workflowRunIdFromUrl();
    unaLabsLink.textContent = "Back to ATEAM output";
    unaLabsLink.href = workflowRunId
      ? `/ateam?run=${encodeURIComponent(workflowRunId)}`
      : "/ateam";
  }
}

function mcViewFromPath(pathname) {
  const raw = String(stripBasePath(pathname) || "/").toLowerCase();
  const path = raw === "/index.html" ? "/" : raw;
  if (path === "/") return "entry";
  const hit = Object.entries(MC_ROUTE_BY_VIEW).find(([, route]) => route === path);
  if (hit) return hit[0];
  const prefix = Object.entries(MC_ROUTE_BY_VIEW).find(([, route]) => path.startsWith(route + "/"));
  return prefix ? prefix[0] : "";
}

function routeForView(view) {
  return withBasePath(MC_ROUTE_BY_VIEW[view] || "/tasks");
}

function resolveMissionControlSearch(query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return null;
  return MC_SEARCH_SHORTCUTS.find((entry) =>
    entry.terms.some((term) => normalized === term || normalized.includes(term))
  ) || null;
}

function handleMissionControlSearch(query) {
  const value = String(query || "").trim();
  if (!value) return;
  const match = resolveMissionControlSearch(value);
  if (!match) {
    showToast(`Search ready: ${value}`, "ok");
    return;
  }
  setView(match.view);
  if (match.view === "agents" && value.toLowerCase().includes("manchi")) {
    setOfficeActiveAgent("henry");
    openCommandDrawer();
  }
  showToast(`Opened ${match.label}.`, "ok");
}

// ===== Talk UI modes (Focus vs Console) =====
function talkFocusFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (!params.has("focus")) return null;
    const raw = String(params.get("focus") || "").trim().toLowerCase();
    if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
    return false;
  } catch {
    return null;
  }
}

function loadTalkUiPrefs() {
  const stored = safeJsonParse(localStorage.getItem(MC_TALK_UI_KEY), {});
  return {
    focus: Boolean(stored?.focus)
  };
}

function saveTalkUiPrefs(next = {}) {
  try {
    localStorage.setItem(MC_TALK_UI_KEY, safeJsonStringify({ focus: Boolean(next?.focus) }));
  } catch {}
}

function setTalkFocusMode(on, opts = {}) {
  const enabled = Boolean(on);
  if (talkView) talkView.classList.toggle("talk-focus", enabled);
  // When Focus is on, hide Mission Control chrome for a clean "listen" view.
  if (document?.body) document.body.classList.toggle("mc-talk-focus", enabled && state.view === "talk");
  if (talkUiModeBtn) talkUiModeBtn.textContent = enabled ? "Details" : "Focus";
  if (opts.persist !== false) saveTalkUiPrefs({ focus: enabled });

  // Focus mode is intentionally minimal; pause timeline polling (and extra noise) while it is active.
  if (state.view === "talk") {
    setTimelinePollingPaused(enabled);
  }

  if (opts.updateUrl) {
    const route = routeForView("talk");
    const query = enabled ? "?focus=1" : "";
    try {
      history.replaceState({}, "", `${route}${query}`);
    } catch {}
  }
}

function applyTalkUiModeFromLocation() {
  const fromUrl = talkFocusFromUrl();
  if (fromUrl === true || fromUrl === false) {
    setTalkFocusMode(fromUrl, { persist: true });
    return;
  }
  const prefs = loadTalkUiPrefs();
  setTalkFocusMode(Boolean(prefs.focus), { persist: false });
}

function setView(view, options = {}) {
  view = String(view || "entry").toLowerCase();
  if (view === "dashboard") view = "tasks";
  const allowed = Object.keys(MC_ROUTE_BY_VIEW);
  if (!allowed.includes(view)) view = "entry";
  if (isWorkflowShellActive() && !isWorkflowShellView(view)) view = "office";

  state.view = view;
  try {
    localStorage.setItem("ATEAM_VIEW", state.view);
  } catch {}

  const silent = Boolean(options.silent);
  const replace = Boolean(options.replace);
  let query = "";
  if (typeof options.query === "string") {
    query = String(options.query || "").trim();
    if (query && !query.startsWith("?")) query = `?${query.replace(/^\?+/, "")}`;
  }
  const route = routeForView(view);
  const nextUrl = `${route}${query}`;
  if (!silent && (window.location.pathname !== route || window.location.search !== query)) {
    try {
      history[replace ? "replaceState" : "pushState"]({}, "", nextUrl);
    } catch {}
  }

  const pageNodes = Array.from(document.querySelectorAll("[data-mc-page]"));
  pageNodes.forEach((node) => {
    const page = String(node.dataset.mcPage || "").trim().toLowerCase();
    node.classList.toggle("hidden", page !== view);
  });

  if (mcNavList) {
    mcNavList.querySelectorAll(".mc-nav-item").forEach((btn) => {
      btn.classList.toggle("active", String(btn.dataset.view || "") === view);
    });
  }

  // Hide MC chrome when in entry view
  const entryOn = state.view === "entry";
  if (document?.body) {
    document.body.classList.toggle("mc-entry-mode", entryOn);
  }

  applyWorkflowShellChrome();

  const talkOn = state.view === "talk";
  const speechOn = state.view === "speech";
  const contentOn = state.view === "content";
  const tasksOn = state.view === "tasks";

  // Ensure we never leave the chrome hidden when navigating away from Talk.
  if (!talkOn && document?.body) document.body.classList.remove("mc-talk-focus");

  if (goDashboardBtn) goDashboardBtn.classList.toggle("active", tasksOn);
  if (goTalkBtn) goTalkBtn.classList.toggle("active", talkOn);
  if (goContentBtn) goContentBtn.classList.toggle("active", contentOn);
  if (goOfficeBtn) goOfficeBtn.classList.toggle("active", state.view === "office");
  const goSpeechBtn = document.getElementById("go-speech");
  if (goSpeechBtn) goSpeechBtn.classList.toggle("active", speechOn);

  if (tasksOn && state.sessionActive) {
    endSession();
  }

  if (!talkOn) {
    stopTimelinePolling();
  }

  if (talkOn) {
    loadTalkSession();
    applyTalkUiModeFromLocation();
    scheduleTimelinePoll(0);
    requestAnimationFrame(() => {
      resizeOrbCanvas();
      if (talkChatInput && talkView && talkView.classList.contains("talk-focus")) {
        talkChatInput.focus();
      }
    });
  }

  if (speechOn) {
    initSpeechClarity();
  }

  if (contentOn) {
    void loadContentPipeline();
  }

  const needsOfficeSync = ["agents", "office", "factory", "pipeline", "approvals"].includes(state.view);
  if (needsOfficeSync) {
    startOfficeSync();
    scheduleOfficeScale();
  } else {
    stopOfficeSync();
  }

  applyOfficeStudioMode();
  if (view !== "office") {
    closeCommandDrawer();
    stopOffice2LiveSync();
    stopOffice2HudSync();
  }
  renderMissionControlView(view);
}

// ===== Mission Control: Drawer + Pages =====
const missionControlState = {
  memory: {
    filter: "",
    selectedId: ""
  },
  approvals: {
    selectedId: "",
    items: []
  },
  calendar: {
    selectedDay: 2
  },
  overview: {
    loadedAt: 0,
    health: null,
    voice: null,
    approvals: [],
    workItems: [],
    workflowRuns: [],
    content: { signals: [], topics: [], drafts: [] },
    speechSessions: []
  },
  projects: {
    selectedId: "mission_control"
  },
  docs: {
    filter: "",
    selectedId: "",
    items: [],
    detailById: {}
  },
  office2: {
    selectedId: "",
    roster: [],
    positions: {}
  },
  factory: {
    items: [],
    workItems: []
  }
};

const commandDrawerState = {
  node: null,
  homeParent: null,
  homeNext: null
};

function rememberCommandDrawerHome(node) {
  if (!node || commandDrawerState.homeParent) return;
  commandDrawerState.homeParent = node.parentElement;
  commandDrawerState.homeNext = node.nextElementSibling;
}

function getPortableCommandNode() {
  if (commandDrawerState.node && document.contains(commandDrawerState.node)) {
    return commandDrawerState.node;
  }
  const node = document.querySelector(".office-panel-command");
  if (!node) return null;
  commandDrawerState.node = node;
  rememberCommandDrawerHome(node);
  return node;
}

function openCommandDrawer() {
  if (!mcCommandDrawer || !mcCommandDrawerBody || !mcCommandDrawerBackdrop) return;
  const node = getPortableCommandNode();
  if (!node) return;
  rememberCommandDrawerHome(node);
  mcCommandDrawerBody.appendChild(node);
  mcCommandDrawer.classList.remove("hidden");
  mcCommandDrawerBackdrop.classList.remove("hidden");
}

function closeCommandDrawer() {
  if (!mcCommandDrawer || !mcCommandDrawerBody || !mcCommandDrawerBackdrop) return;
  mcCommandDrawer.classList.add("hidden");
  mcCommandDrawerBackdrop.classList.add("hidden");

  const node = getPortableCommandNode();
  if (!node) return;
  const parent = commandDrawerState.homeParent;
  if (!parent) return;
  if (commandDrawerState.homeNext && parent.contains(commandDrawerState.homeNext)) {
    parent.insertBefore(node, commandDrawerState.homeNext);
  } else {
    parent.appendChild(node);
  }
}

function renderMissionControlView(view) {
  if (view === "council") {
    void renderCouncilPage();
    return;
  }
  if (view === "projects") {
    void renderProjectsPage();
    return;
  }
  if (view === "memory") {
    renderMemoryPage();
    return;
  }
  if (view === "docs") {
    void renderDocsPage();
    return;
  }
  if (view === "people") {
    renderPeoplePage();
    return;
  }
  if (view === "calendar") {
    renderCalendarPage();
    return;
  }
  if (view === "system") {
    void renderSystemPage();
    return;
  }
  if (view === "radar") {
    void renderRadarPage();
    return;
  }
  if (view === "office") {
    renderOffice2Page();
    return;
  }
  if (view === "approvals") {
    void renderApprovalsPage();
    return;
  }
  if (view === "team") {
    renderTeamPage();
    return;
  }
  if (view === "factory") {
    void renderFactoryPage();
    return;
  }
  if (view === "pipeline") {
    void renderPipelinePage();
    return;
  }
  if (view === "ai_lab") {
    void renderAiLabPage();
    return;
  }
  if (view === "tasks") {
    void renderTasksPage();
  }
}

// ===== Mission Control: Approvals Page =====
function approvalsLoadUiPrefs() {
  const stored = safeJsonParse(localStorage.getItem(MC_APPROVALS_UI_KEY), {});
  const selectedId = typeof stored?.selectedId === "string" ? stored.selectedId : "";
  if (selectedId) missionControlState.approvals.selectedId = selectedId;
  return { selectedId };
}

function approvalsSaveUiPrefs(next = {}) {
  const selectedId = typeof next?.selectedId === "string" ? next.selectedId : "";
  try {
    localStorage.setItem(MC_APPROVALS_UI_KEY, safeJsonStringify({ selectedId }));
  } catch {}
  missionControlState.approvals.selectedId = selectedId;
}

function approvalStatusLabel(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "approved") return "Approved";
  if (raw === "rejected") return "Rejected";
  if (raw === "cancelled") return "Cancelled";
  return "Pending";
}

function approvalStatusTone(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "approved") return "ok";
  if (raw === "rejected") return "error";
  if (raw === "cancelled") return "muted";
  return "pending";
}

function formatApprovalTime(iso) {
  try {
    const d = new Date(String(iso || ""));
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

function prettyJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

async function apiListApprovals({ status = "", limit = 80 } = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (limit) qs.set("limit", String(limit));
  const data = await apiRequest(`/api/approvals?${qs.toString()}`);
  return Array.isArray(data?.approvals) ? data.approvals : [];
}

async function apiDecideApproval(approvalId, decision, { sessionId = GLOBAL_PODCAST_ID, actor = "user" } = {}) {
  const safeId = String(approvalId || "").trim();
  if (!safeId) return null;
  const data = await apiRequest(`/api/approvals/${encodeURIComponent(safeId)}/decision`, {
    method: "POST",
    body: { sessionId, decision, actor }
  });
  return data?.approval || null;
}

function renderApprovalsEmpty() {
  if (approvalsCountNode) approvalsCountNode.textContent = "0";
  if (approvalsListNode) approvalsListNode.innerHTML = `<div class="control-empty">No approvals.</div>`;
  if (approvalsDetailStatusNode) approvalsDetailStatusNode.textContent = "—";
  if (approvalsDetailNode) approvalsDetailNode.innerHTML = `<div class="control-empty">Select an approval to review.</div>`;
}

function renderApprovalsList(items, selectedId) {
  if (!approvalsListNode) return;
  approvalsListNode.innerHTML = "";

  if (!items.length) {
    approvalsListNode.innerHTML = `<div class="control-empty">No approvals.</div>`;
    return;
  }

  items.forEach((approval) => {
    const id = String(approval?.id || "");
    const status = String(approval?.status || "pending");
    const policy = String(approval?.policy || "").trim();
    const summary = String(approval?.summary || "").trim();
    const requestedBy = String(approval?.requestedBy || "").trim();
    const createdTs = String(approval?.createdTs || approval?.created_ts || "");

    const row = document.createElement("div");
    row.className = `approval-row${id === selectedId ? " active" : ""}`;
    row.dataset.approvalId = id;
    row.innerHTML = `
      <div class="approval-row-top">
        <div class="approval-policy">${escapeHtml(policy || "approval")}</div>
        <div class="approval-status-pill" data-tone="${escapeHtml(approvalStatusTone(status))}">${escapeHtml(approvalStatusLabel(status))}</div>
      </div>
      <div class="approval-summary">${escapeHtml(summary || "Approval requested")}</div>
      <div class="approval-meta">${escapeHtml(requestedBy ? `Requested by ${requestedBy}` : "Requested")}${createdTs ? ` · ${escapeHtml(formatApprovalTime(createdTs))}` : ""}</div>
    `;
    row.addEventListener("click", () => {
      approvalsSaveUiPrefs({ selectedId: id });
      renderApprovalsList(items, id);
      renderApprovalDetail(items.find((a) => String(a?.id || "") === id) || null);
    });
    approvalsListNode.appendChild(row);
  });
}

function renderApprovalDetail(approval) {
  if (!approvalsDetailNode || !approvalsDetailStatusNode) return;
  if (!approval) {
    approvalsDetailStatusNode.textContent = "—";
    approvalsDetailNode.innerHTML = `<div class="control-empty">Select an approval to review.</div>`;
    return;
  }

  const id = String(approval?.id || "");
  const status = String(approval?.status || "pending");
  const policy = String(approval?.policy || "").trim();
  const summary = String(approval?.summary || "").trim();
  const requestedBy = String(approval?.requestedBy || "").trim();
  const createdTs = String(approval?.createdTs || approval?.created_ts || "");
  const payload = approval?.payload && typeof approval.payload === "object" ? approval.payload : {};

  approvalsDetailStatusNode.textContent = approvalStatusLabel(status);

  const blocks = [];
  blocks.push(`
    <div class="approval-detail-block">
      <div class="approval-detail-label">Summary</div>
      <div class="approval-detail-value">${escapeHtml(summary || "Approval requested")}</div>
    </div>
  `);
  blocks.push(`
    <div class="approval-detail-block">
      <div class="approval-detail-label">Policy</div>
      <div class="approval-detail-value">${escapeHtml(policy || "approval")}</div>
    </div>
  `);
  blocks.push(`
    <div class="approval-detail-block">
      <div class="approval-detail-label">Requested By</div>
      <div class="approval-detail-value">${escapeHtml(requestedBy || "system")}</div>
    </div>
  `);
  blocks.push(`
    <div class="approval-detail-block">
      <div class="approval-detail-label">Created</div>
      <div class="approval-detail-value">${escapeHtml(createdTs ? formatApprovalTime(createdTs) : "")}</div>
    </div>
  `);
  blocks.push(`
    <div class="approval-detail-block">
      <div class="approval-detail-label">Payload</div>
      <div class="approval-detail-value">${escapeHtml(prettyJson(payload))}</div>
    </div>
  `);

  const canDecide = String(status || "").toLowerCase() === "pending";
  const actions = canDecide
    ? `
      <div class="approval-actions">
        <button class="approval-btn approve" type="button" data-decision="approved">Approve</button>
        <button class="approval-btn reject" type="button" data-decision="rejected">Reject</button>
      </div>
    `
    : "";

  approvalsDetailNode.innerHTML = `${blocks.join("")}${actions}`;

  if (canDecide) {
    approvalsDetailNode.querySelectorAll(".approval-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const decision = String(btn.dataset.decision || "").trim();
        if (!decision) return;
        btn.disabled = true;
        try {
          await mcHandleApprovalDecision(id, decision);
        } catch (err) {
          showToast("Approval decision failed.", "error");
          btn.disabled = false;
        }
      });
    });
  }
}

async function renderApprovalsPage(opts = {}) {
  if (!approvalsView || approvalsView.classList.contains("hidden")) return;
  if (!approvalsCountNode || !approvalsListNode || !approvalsDetailNode || !approvalsDetailStatusNode) return;

  approvalsLoadUiPrefs();

  try {
    const approvals = await apiListApprovals({ limit: 120 });
    const items = (Array.isArray(approvals) ? approvals : []).slice();
    // Sort with pending first, then newest first.
    items.sort((a, b) => {
      const aPending = String(a?.status || "").toLowerCase() === "pending" ? 0 : 1;
      const bPending = String(b?.status || "").toLowerCase() === "pending" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      const at = Date.parse(String(a?.createdTs || a?.created_ts || "")) || 0;
      const bt = Date.parse(String(b?.createdTs || b?.created_ts || "")) || 0;
      return bt - at;
    });

    missionControlState.approvals.items = items;
    const pendingCount = items.filter((a) => String(a?.status || "").toLowerCase() === "pending").length;
    approvalsCountNode.textContent = String(pendingCount);

    const currentSelected = String(missionControlState.approvals.selectedId || "").trim();
    const hasSelected = currentSelected && items.some((a) => String(a?.id || "") === currentSelected);
    const selectedId = hasSelected ? currentSelected : String(items[0]?.id || "");
    if (!opts.preserveSelection && selectedId && selectedId !== currentSelected) {
      approvalsSaveUiPrefs({ selectedId });
    } else if (!hasSelected && selectedId) {
      approvalsSaveUiPrefs({ selectedId });
    }

    renderApprovalsList(items, String(missionControlState.approvals.selectedId || selectedId));
    renderApprovalDetail(items.find((a) => String(a?.id || "") === String(missionControlState.approvals.selectedId || selectedId)) || null);
  } catch (err) {
    renderApprovalsEmpty();
  }
}

// ===== Mission Control: Team =====
function renderTeamPage() {
  if (!teamCanvas) return;

  const agentById = (id) => OFFICE2_AGENT_DIRECTORY.find((a) => a.id === id) || null;
  const accentFor = (agent) => OFFICE2_LANE_ACCENTS[String(agent?.lane || "")] || "rgba(226, 241, 255, 0.7)";

  // titleRole removed — role_title from locked registry shows directly via agent.role.
  const CARD_META = {
    henry: {
      blurb: "Keeps the operating picture tight, routes work across lanes, and makes sure decisions land cleanly.",
      tags: ["Orchestration", "Alignment", "Delegation"]
    },
    ralph: {
      blurb: "Owns the quality gate, verifies outcomes, and blocks weak handoffs before they ship.",
      tags: ["Quality", "Verification", "Sign-off"]
    },
    scout: {
      blurb: "Tracks the market, spots live signals, and turns noise into actionable intelligence.",
      tags: ["Signals", "Research", "Intelligence"]
    },
    quill: {
      blurb: "Shapes strategy into usable narratives, sharp briefs, and publish-ready messaging.",
      tags: ["Strategy", "Messaging", "Clarity"]
    },
    pixel: {
      blurb: "Builds visuals that feel deliberate, persuasive, and consistent across the brand system.",
      tags: ["Visual", "Brand", "Craft"]
    },
    echo: {
      blurb: "Runs channel execution so voice, podcast, and distribution work leave the system ready to publish.",
      tags: ["Distribution", "Voice", "Operations"]
    },
    codex: {
      blurb: "Owns the build lane from implementation through runtime reliability and technical delivery.",
      tags: ["Engineering", "Systems", "Delivery"]
    },
    violet: {
      blurb: "Deep research and analysis. Turns ambiguity into options.",
      tags: ["Research", "Analysis", "Options"]
    }
  };

  const renderTags = (tags = []) =>
    Array.isArray(tags) && tags.length
      ? `<div class="team-card-tags">${tags.map((t) => `<span class="team-tag">${escapeHtml(t)}</span>`).join("")}</div>`
      : "";

  const renderCard = (agentId, variant = "") => {
    const agent = agentById(agentId);
    const meta = CARD_META[agentId] || {};
    const accent = accentFor(agent);
    const role = agent?.role || "";
    const displayName = agent?.displayName || agentId;
    const icon = agent?.emoji || "";
    const slotNote = meta.channelSlot ? ` <span class="team-card-slot-note">channel slot</span>` : "";

    return `
      <div class="team-card ${variant}${meta.channelSlot ? " team-card--slot" : ""}" data-agent-id="${escapeHtml(agentId)}" style="--accent:${accent}">
        <div class="team-card-head">
          <div class="team-card-avatar" aria-hidden="true">${escapeHtml(icon)}</div>
          <div class="team-card-head-meta">
            <div class="team-card-name">${escapeHtml(role || displayName)}${slotNote}</div>
            <div class="team-card-role">${escapeHtml(displayName)}</div>
          </div>
        </div>
        <div class="team-card-desc">${escapeHtml(meta.blurb || "")}</div>
        ${renderTags(meta.tags)}
      </div>
    `;
  };

  const henry = renderCard("henry", "team-card--primary");
  const ralph = renderCard("ralph");
  const scout = renderCard("scout", "team-card--signal");
  const quill = renderCard("quill", "team-card--signal");
  const pixel = renderCard("pixel", "team-card--action");
  const echo = renderCard("echo", "team-card--action");
  const codex = renderCard("codex", "team-card--meta");
  const violet = renderCard("violet", "team-card--meta");

  teamCanvas.innerHTML = `
    <section class="team-map-panel">
      <div class="team-map-header">
        <h2 class="team-map-title">Org Map</h2>
        <p class="team-map-note">Full role picture. The locked operating roster covers Manchi, Maro, Bunur, Kevwe, Tobi, Ada, Seyi, and Ife.</p>
      </div>
      <div class="team-map">
        <div class="team-row team-row--top">${henry}</div>
        <div class="team-connector team-connector--down" aria-hidden="true"></div>
        <div class="team-divider"><span>FTC OPERATIONS</span></div>
        <div class="team-row team-row--ops">${ralph}</div>
        <div class="team-divider team-divider--split" aria-hidden="true">
          <div class="team-divider-col"><span>INPUT SIGNAL</span></div>
          <div class="team-divider-col"><span>OUTPUT ACTION</span></div>
        </div>
        <div class="team-row team-row--io">${scout}${quill}${pixel}${echo}</div>
        <div class="team-divider"><span>META LAYER</span></div>
        <div class="team-row team-row--meta">${codex}${violet}</div>
      </div>
    </section>
  `;
}

// ===== Memory Page =====
function seedMemoryStore() {
  const stored = safeJsonParse(localStorage.getItem(MC_MEMORY_KEY), null);
  if (stored && Array.isArray(stored.entries) && stored.entries.length) return stored;

  const mk = (date, body) => ({
    id: date,
    date,
    modifiedAt: new Date(date + "T18:12:00").toISOString(),
    body: String(body || "")
  });

  const entries = [];
  entries.push(
    mk(
      "2026-03-20",
      `## What\n- Ran ATEAM as Mission Control.\n- Captured a few decisions from the day.\n\n## Decisions\n- Keep the system private and approval-first.\n\n## Next\n- Tighten the Office + Calendar flows.`
    )
  );
  entries.push(
    mk(
      "2026-03-19",
      `## What\n- Reviewed queued approvals.\n- Cleaned up agent priorities.\n\n## Key Insight\n- Attention should be visible before it is readable.`
    )
  );
  entries.push(
    mk(
      "2026-03-17",
      `## What\n- Started the Mission Control UI shell.\n- Mapped ATEAM agents into a live Office + Factory view.\n\n## Decisions\n- Reuse existing logic; wrap it in a new chrome.\n- Seed mock data where backend does not exist yet.\n\n## Key Insight\n- Behavior should be readable without labels.\n\n## Next\n- Memory → Office → Calendar → Factory.`
    )
  );
  for (let day = 14; day >= 1; day--) {
    const dd = String(day).padStart(2, "0");
    entries.push(
      mk(
        `2026-03-${dd}`,
        `## What\n- Journal seed entry.\n\n## Notes\n- Replace with real journal content when memory store is wired.`
      )
    );
  }
  for (let day = 25; day >= 1; day--) {
    const dd = String(day).padStart(2, "0");
    entries.push(
      mk(
        `2026-02-${dd}`,
        `## What\n- Journal seed entry.\n\n## Notes\n- Replace with real journal content when memory store is wired.`
      )
    );
  }
  for (let day = 10; day >= 1; day--) {
    const dd = String(day).padStart(2, "0");
    entries.push(
      mk(
        `2026-01-${dd}`,
        `## What\n- Journal seed entry.\n\n## Notes\n- Replace with real journal content when memory store is wired.`
      )
    );
  }
  entries.push(
    mk(
      "2025-12-31",
      `## What\n- Journal seed entry.\n\n## Notes\n- Replace with real journal content when memory store is wired.`
    )
  );

  const seed = {
    version: 1,
    selectedId: "2026-03-17",
    entries
  };
  localStorage.setItem(MC_MEMORY_KEY, safeJsonStringify(seed));
  return seed;
}

function loadMemoryStore() {
  const seed = seedMemoryStore();
  const stored = safeJsonParse(localStorage.getItem(MC_MEMORY_KEY), seed);
  if (!stored || !Array.isArray(stored.entries)) return seed;
  return stored;
}

function saveMemoryStore(next) {
  if (!next) return;
  localStorage.setItem(MC_MEMORY_KEY, safeJsonStringify(next));
}

function loadMemoryUiState() {
  return safeJsonParse(localStorage.getItem(MC_MEMORY_UI_KEY), { collapsed: {} });
}

function saveMemoryUiState(next) {
  localStorage.setItem(MC_MEMORY_UI_KEY, safeJsonStringify(next));
}

function groupJournalEntries(entries, filter = "") {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  const match = (entry) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return String(entry.id || "").toLowerCase().includes(q) || String(entry.body || "").toLowerCase().includes(q);
  };

  const groups = [
    { id: "today", label: "Today", items: [] },
    { id: "yesterday", label: "Yesterday", items: [] },
    { id: "this_week", label: "This Week", items: [] },
    { id: "this_month", label: "This Month", items: [] },
    { id: "2026-02", label: "February 2026", items: [] },
    { id: "2026-01", label: "January 2026", items: [] },
    { id: "2025-12", label: "December 2025", items: [] }
  ];

  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  entries
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .forEach((entry) => {
      if (!match(entry)) return;
      const iso = String(entry.date || entry.id || "");
      if (!iso) return;
      if (iso === todayIso) {
        groups[0].items.push(entry);
        return;
      }
      if (iso === yesterdayIso) {
        groups[1].items.push(entry);
        return;
      }
      const dt = new Date(iso + "T12:00:00");
      if (dt >= startOfWeek) {
        groups[2].items.push(entry);
        return;
      }
      if (dt >= startOfMonth) {
        groups[3].items.push(entry);
        return;
      }
      const prefix = iso.slice(0, 7);
      const monthGroup = groups.find((g) => g.id === prefix);
      if (monthGroup) monthGroup.items.push(entry);
    });

  return groups;
}

function selectJournalEntry(entryId) {
  const store = loadMemoryStore();
  const exists = store.entries.some((entry) => entry.id === entryId);
  if (!exists) return;
  store.selectedId = entryId;
  saveMemoryStore(store);
  missionControlState.memory.selectedId = entryId;
  renderMemoryPage();
}

function renderJournalViewer(entry) {
  if (!entry) return;
  const body = String(entry.body || "");
  const wordCount = countWords(body);
  const bytes =
    typeof TextEncoder !== "undefined" ? new TextEncoder().encode(body).length : Math.max(body.length, 0);
  if (journalTitle) journalTitle.textContent = `Journal: ${entry.id}`;
  if (journalSubhead) journalSubhead.textContent = `${isoDateToHuman(entry.id)} • ${formatBytes(bytes)} • ${wordCount} words`;
  if (journalModified) journalModified.textContent = `Modified about ${formatRelativeTime(entry.modifiedAt)}`;
  if (journalBody) journalBody.innerHTML = renderMiniMarkdown(body);
}

function renderMemoryPage() {
  if (!memoryView || !memoryJournalGroups || !journalBody) return;
  const store = loadMemoryStore();
  const ui = loadMemoryUiState();
  const filter = String(missionControlState.memory.filter || "").trim();
  const selectedId = missionControlState.memory.selectedId || store.selectedId || store.entries[0]?.id || "";
  missionControlState.memory.selectedId = selectedId;

  if (memoryJournalCount) {
    memoryJournalCount.textContent = `${store.entries.length} entries`;
  }
  if (memoryLtmMeta) {
    memoryLtmMeta.textContent = `1,942 words • updated ${formatRelativeTime(new Date().toISOString())}`;
  }

  const groups = groupJournalEntries(store.entries, filter);
  memoryJournalGroups.innerHTML = "";
  for (const group of groups) {
    const collapsed = ui?.collapsed?.[group.id] ? "1" : "0";
    const wrap = document.createElement("div");
    wrap.className = "memory-group";
    wrap.dataset.groupId = group.id;
    wrap.dataset.collapsed = collapsed;

    const head = document.createElement("div");
    head.className = "memory-group-head";
    head.innerHTML = `
      <div class="memory-group-title"><span class="memory-caret">▾</span>${escapeHtml(group.label)}</div>
      <div class="memory-group-count">${group.items.length}</div>
    `;
    head.addEventListener("click", () => {
      const next = loadMemoryUiState();
      next.collapsed = next.collapsed || {};
      next.collapsed[group.id] = !next.collapsed[group.id];
      saveMemoryUiState(next);
      renderMemoryPage();
    });

    const bodyNode = document.createElement("div");
    bodyNode.className = "memory-group-body";
    for (const entry of group.items) {
      const bytes =
        typeof TextEncoder !== "undefined"
          ? new TextEncoder().encode(String(entry.body || "")).length
          : Math.max(String(entry.body || "").length, 0);
      const words = countWords(entry.body || "");
      const row = document.createElement("div");
      row.className = "memory-entry" + (entry.id === selectedId ? " active" : "");
      row.dataset.entryId = entry.id;
      row.innerHTML = `
        <div class="memory-entry-main">
          <div class="memory-entry-day">${escapeHtml(entry.id)}</div>
          <div class="memory-entry-meta">${escapeHtml(formatRelativeTime(entry.modifiedAt))} • ${words} words</div>
        </div>
        <div class="memory-entry-size">${escapeHtml(formatBytes(bytes))}</div>
      `;
      row.addEventListener("click", () => selectJournalEntry(entry.id));
      bodyNode.appendChild(row);
    }

    wrap.appendChild(head);
    wrap.appendChild(bodyNode);
    memoryJournalGroups.appendChild(wrap);
  }

  const active = store.entries.find((entry) => entry.id === selectedId) || store.entries[0];
  if (active) renderJournalViewer(active);
}

// ===== Calendar Page =====
function seedCalendarStore() {
  const stored = safeJsonParse(localStorage.getItem(MC_CALENDAR_KEY), null);
  if (stored && Array.isArray(stored.tasks) && stored.tasks.length) return stored;

  const tasks = [];
  const add = (day, title, time, variant, recurringLabel = "") => {
    tasks.push({
      id: `${day}_${title}_${time}`.replace(/\s+/g, "_").toLowerCase(),
      day,
      title,
      time,
      variant,
      recurringLabel
    });
  };

  for (let d = 0; d < 7; d++) {
    add(d, "Reaction Poller", "", "neutral", "Recurring");
    add(d, "Trend Radar", "12:00 PM", "orange");
    add(d, "Morning Kickoff", "6:55 AM", "neutral");
    add(d, "YouTube OpenC…", "7:00 AM", "red");
    add(d, "Scout Morning …", "8:00 AM", "green");
    add(d, "Morning Brief", "8:00 AM", "yellow");
    add(d, "Quill Script Writer", "8:30 AM", "blue");
    add(d, "Daily Digest", "9:00 AM", "purple");
  }
  // A little screenshot-specific spice.
  add(1, "Stock Scarcity R…", "7:30 AM", "neutral");
  add(2, "Trend Radar Daily…", "8:00 AM", "neutral");
  add(4, "Trend Radar Daily…", "8:00 AM", "neutral");

  const seed = { version: 1, tasks };
  localStorage.setItem(MC_CALENDAR_KEY, safeJsonStringify(seed));
  return seed;
}

function loadCalendarStore() {
  const seed = seedCalendarStore();
  const stored = safeJsonParse(localStorage.getItem(MC_CALENDAR_KEY), seed);
  if (!stored || !Array.isArray(stored.tasks)) return seed;
  return stored;
}

function renderCalendarPage() {
  if (!calendarView || !calWeekGrid) return;
  const store = loadCalendarStore();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selected = Number.isFinite(missionControlState.calendar.selectedDay) ? missionControlState.calendar.selectedDay : 2;

  calWeekGrid.innerHTML = "";
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const col = document.createElement("div");
    col.className = "cal-day" + (dayIndex === selected ? " active" : "");
    col.dataset.dayIndex = String(dayIndex);

    const head = document.createElement("div");
    head.className = "cal-day-head";
    head.textContent = days[dayIndex];

    const body = document.createElement("div");
    body.className = "cal-day-body";

    store.tasks
      .filter((t) => t.day === dayIndex)
      .forEach((task) => {
        const leftMeta = task.time || task.recurringLabel || "";
        const rightMeta = task.time ? task.recurringLabel || "" : "";
        const card = document.createElement("div");
        card.className = "cal-event";
        card.dataset.variant = task.variant;
        card.innerHTML = `
          <div class="cal-event-title">${escapeHtml(task.title)}</div>
          <div class="cal-event-meta">
            <span>${escapeHtml(leftMeta)}</span>
            <span>${escapeHtml(rightMeta)}</span>
          </div>
        `;
        body.appendChild(card);
      });

    col.appendChild(head);
    col.appendChild(body);
    calWeekGrid.appendChild(col);
  }
}

// ===== Pixel Office Page =====
function mcAgentById(agentId) {
  const id = String(agentId || "").trim();
  if (!id) return null;
  return OFFICE2_AGENT_DIRECTORY.find((a) => a.id === id) || null;
}

function mcDisplayName(agentId) {
  const agent = mcAgentById(agentId);
  return String(agent?.displayName || agentId || "").trim();
}

// Returns the role_title for the agent. Used wherever a structured/audit label is needed.
function mcCanonicalName(agentId) {
  const agent = mcAgentById(agentId);
  return String(agent?.role || agentId || "").trim();
}

const MC_PUBLIC_AGENT_ROLE_BY_RUNTIME = {
  coach: "henry",
  strategist: "quill",
  builder: "codex",
  scout: "scout",
  "think tank": "violet",
  podcast: "echo"
};

function mcPublicAgentRole(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/\s+/g, " ");
  const mappedAgentId = MC_PUBLIC_AGENT_ROLE_BY_RUNTIME[normalized];
  if (mappedAgentId) return mcCanonicalName(mappedAgentId) || raw;
  const directAgent = mcAgentById(normalized);
  if (directAgent) return mcCanonicalName(normalized) || raw;
  return raw;
}

function mcPublicLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const humanizeToken = (token) =>
    String(token || "")
      .replace(/(?:[_-])v\d+\b/gi, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase())
      .trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, " ");
  if (normalized === "system") return "System";
  if (normalized === "ai_podcast") return speakerLabelById("ai_podcast");
  const mappedAgentId = MC_PUBLIC_AGENT_ROLE_BY_RUNTIME[normalized];
  if (mappedAgentId) return mcCanonicalName(mappedAgentId) || raw;
  const directAgent = mcAgentById(normalized);
  if (directAgent) return mcDisplayName(normalized) || mcCanonicalName(normalized) || raw;
  if (SPEAKER_OPTIONS.some((option) => option.id === normalized)) return speakerLabelById(normalized);
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(raw)) return humanizeToken(raw);
  if (/[a-z0-9]+(?:[_-][a-z0-9]+)+/i.test(raw)) {
    return raw.replace(/\b[a-z0-9]+(?:[_-][a-z0-9]+)+\b/gi, (token) => humanizeToken(token));
  }
  return raw;
}

function mcRunStateLabel(state) {
  const s = String(state || "").trim().toLowerCase();
  const labels = {
    draft: "Draft",
    planning: "Planning",
    awaiting_approval: "Awaiting approval",
    approved: "Approved",
    executing: "Executing",
    completed: "Completed",
    failed: "Failed",
    escalated: "Escalated",
    queued: "Queued"
  };
  return labels[s] || s.replaceAll("_", " ");
}

let office2LiveTimer = null;
let office2HudTimer = null;

function office2IconSvg(kind) {
  const safe = String(kind || "");
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  if (safe === OFFICE2_ROLE_ICONS.coordinator) {
    return `<svg ${common}><path d="M9 5h6"/><path d="M9 3h6v4H9z"/><path d="M8 7h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.signals) {
    return `<svg ${common}><path d="M4 20h4"/><path d="M6 20V10"/><path d="M6 10c0-4 6-4 6 0"/><path d="M12 10c0-6 8-6 8 0"/><path d="M20 20h-4"/><circle cx="6" cy="8" r="1"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.writer) {
    return `<svg ${common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.builder) {
    return `<svg ${common}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2-2 2.4-2.4z"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.qa) {
    return `<svg ${common}><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"/><path d="M8 12l2 2 6-6"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.think_tank) {
    return `<svg ${common}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.voice) {
    return `<svg ${common}><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.design) {
    return `<svg ${common}><path d="M12 3c5 0 9 3 9 7s-3 7-7 7h-1a2 2 0 0 0-2 2v1h-1c-4 0-7-3-7-7s4-10 9-10z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="13.5" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/></svg>`;
  }
  if (safe === OFFICE2_ROLE_ICONS.ops) {
    return `<svg ${common}><path d="M10 6h10"/><path d="M10 18h10"/><path d="M4 10h16"/><path d="M4 14h16"/><path d="M6 6v12"/></svg>`;
  }
  return `<svg ${common}><circle cx="12" cy="12" r="9"/></svg>`;
}

function office2GetAccent(agent) {
  return OFFICE2_LANE_ACCENTS[String(agent?.lane || "")] || "rgba(226, 241, 255, 0.75)";
}

function office2HashUnit(input = "") {
  const str = String(input || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function office2ComputeStatus(agent) {
  const derived = missionControlState.office2?.derivedStatus || {};
  const agentId = String(agent?.id || "").trim();
  if (agentId && derived[agentId]) return String(derived[agentId] || "idle");

  const mapsTo = String(agent?.mapsTo || "").trim();
  if (mapsTo && derived[mapsTo]) return String(derived[mapsTo] || "idle");
  if (mapsTo && officeState.agents[mapsTo] && officeState.agents[mapsTo].status) {
    return String(officeState.agents[mapsTo].status || "idle");
  }
  return "idle";
}

function office2ShouldGatherAtCooler() {
  // Gather when the core 4 are idle (Open Mic vibe) and nobody needs attention.
  const core = ["henry", "scout", "quill", "codex"];
  const derived = missionControlState.office2?.derivedStatus || {};
  const statuses = core.map((id) => String(derived[id] || officeState.agents[id]?.status || "idle"));
  return statuses.every((s) => s === "idle");
}

function office2DesiredPosition(agent, status, indexInRoster) {
  const lane = String(agent?.lane || "");
  const laneAnchors = OFFICE2_ZONE_ANCHORS.lane[lane] || { idle: { x: 50, y: 50 }, working: { x: 50, y: 50 } };

  // Stable micro-offset so agents don't perfectly stack when sharing a lane.
  const laneJx = (office2HashUnit(agent.id + "_lx") - 0.5) * 3.2;
  const laneJy = (office2HashUnit(agent.id + "_ly") - 0.5) * 2.6;

  const gather = office2ShouldGatherAtCooler();
  // Only cluster the canonical "core 4" at the cooler for the open-mic vibe.
  // Everyone else stays in their lane so the scene doesn't become a pile-up.
  const coreIds = ["henry", "scout", "quill", "codex"];
  const mapsTo = String(agent?.mapsTo || agent?.id || "").trim().toLowerCase();
  const isCore = coreIds.includes(mapsTo);
  if (gather && status === "idle" && isCore) {
    const anchor = OFFICE2_ZONE_ANCHORS.cooler;
    const coreIndex = coreIds.indexOf(mapsTo);
    const off = OFFICE2_COOLER_CLUSTER[coreIndex % OFFICE2_COOLER_CLUSTER.length] || { x: 0, y: 0 };
    const jx = (office2HashUnit(agent.id + "_cx") - 0.5) * 0.9;
    const jy = (office2HashUnit(agent.id + "_cy") - 0.5) * 0.9;
    return {
      x: anchor.x + off.x + jx,
      y: anchor.y + off.y + jy
    };
  }

  if (status === "waiting_for_you") return { x: OFFICE2_ZONE_ANCHORS.user.x + laneJx * 0.25, y: OFFICE2_ZONE_ANCHORS.user.y + laneJy * 0.25 };
  if (status === "blocked") return { x: OFFICE2_ZONE_ANCHORS.blocked.x + laneJx, y: OFFICE2_ZONE_ANCHORS.blocked.y + laneJy };
  if (status === "working") {
    const base = laneAnchors.working || laneAnchors.idle;
    return { x: base.x + laneJx, y: base.y + laneJy };
  }
  return { x: laneAnchors.idle.x + laneJx, y: laneAnchors.idle.y + laneJy };
}

function clampPct(value, min, max) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function office2LoadUiPrefs() {
  const stored = safeJsonParse(localStorage.getItem(MC_OFFICE2_UI_KEY), {});
  const hideLabels = Boolean(stored?.[OFFICE2_HIDE_LABELS_KEY]);
  missionControlState.office2.hideLabels = hideLabels;
  return { hideLabels };
}

function office2SaveUiPrefs(prefs) {
  const next = {
    [OFFICE2_HIDE_LABELS_KEY]: Boolean(prefs?.hideLabels)
  };
  try {
    localStorage.setItem(MC_OFFICE2_UI_KEY, safeJsonStringify(next));
  } catch {}
  missionControlState.office2.hideLabels = Boolean(next[OFFICE2_HIDE_LABELS_KEY]);
}

function office2ApplyLabelMode() {
  if (!officeRoomView) return;
  officeRoomView.classList.toggle("office2-hide-labels", Boolean(missionControlState.office2.hideLabels));
}

function office2ToggleLabels() {
  const on = !Boolean(missionControlState.office2.hideLabels);
  office2SaveUiPrefs({ hideLabels: on });
  office2ApplyLabelMode();
}

function startOffice2LiveSync() {
  if (office2LiveTimer) return;
  office2LiveTimer = setInterval(() => {
    if (!officeRoomView || officeRoomView.classList.contains("hidden")) return;
    office2SyncEntities();
  }, 900);
}

function stopOffice2LiveSync() {
  if (!office2LiveTimer) return;
  clearInterval(office2LiveTimer);
  office2LiveTimer = null;
}

async function refreshOffice2Hud() {
  if (!officeRoomView || officeRoomView.classList.contains("hidden")) return;
  const [approvals, workItems, runsData] = await Promise.all([
    apiRequest("/api/approvals?status=pending&limit=50").then((d) => (Array.isArray(d?.approvals) ? d.approvals : [])).catch(() => []),
    apiListWorkItems({ limit: 120 }).catch(() => []),
    apiRequest("/api/workflow/runs?limit=20").then((d) => (Array.isArray(d?.runs) ? d.runs : [])).catch(() => [])
  ]);

  missionControlState.factory.workItems = Array.isArray(workItems) ? workItems : [];

  const pendingApprovals = approvals.filter((a) => String(a?.status || "") === "pending");
  const isSeed = (it) => String(it?.id || "").startsWith("wi_seed_");
  const reviewItems = (workItems || []).filter((it) => String(it?.stage || "").toUpperCase() === "REVIEW" && !isSeed(it));
  const buildItems = (workItems || []).filter((it) => String(it?.stage || "").toUpperCase() === "BUILD" && !isSeed(it));
  const qaItems = (workItems || []).filter((it) => String(it?.stage || "").toUpperCase() === "QA" && !isSeed(it));
  const backlogItems = (workItems || []).filter((it) => String(it?.stage || "").toUpperCase() === "BACKLOG" && !isSeed(it));

  const textOf = (it) => `${String(it?.title || "")} ${String(it?.objective || "")}`.toLowerCase();
  const anyKeyword = (text, keywords) => keywords.some((k) => text.includes(k));
  const researchKeys = ["research", "scan", "radar", "trend", "news", "competitor", "opportunity", "find", "source", "job"];
  const writeKeys = ["write", "draft", "post", "linkedin", "script", "content", "reply", "message", "comment", "dm"];

  const researchBacklog = backlogItems.filter((it) => anyKeyword(textOf(it), researchKeys));
  const writeBacklog = backlogItems.filter((it) => anyKeyword(textOf(it), writeKeys));

  const derived = {};
  const meta = {};

  const setDerived = (id, status, lastTask = "", nextAction = "") => {
    derived[id] = status;
    meta[id] = { lastTask, nextAction };
  };

  // Derive status from active WorkflowRuns — ownerAgentId shows who's carrying the run.
  const activeRuns = (runsData || []).filter((r) => ["executing", "awaiting_approval", "approved"].includes(String(r?.state || "")));
  const runByOwner = new Map();
  for (const run of activeRuns) {
    const ownerId = String(run?.ownerAgentId || "").trim();
    if (ownerId && !runByOwner.has(ownerId)) runByOwner.set(ownerId, run);
  }

  // Store runs on state for Office activity feed
  missionControlState.office2.activeRuns = activeRuns;

  const needsAttention = pendingApprovals.length > 0 || reviewItems.length > 0;
  if (needsAttention) {
    const attentionTask = pendingApprovals.length
      ? `Approval needed (${pendingApprovals.length})`
      : `Review queue (${reviewItems.length})`;
    setDerived("henry", "waiting_for_you", attentionTask, "Review with you");
  } else if (runByOwner.has("henry")) {
    const r = runByOwner.get("henry");
    setDerived("henry", "working", r.brief?.title || r.title || "Active workflow", "Coordinating");
  } else {
    setDerived("henry", "idle", "No recent task", "");
  }

  const runFallback = (id, ifWorkLabel, ifWorkAction) => {
    if (runByOwner.has(id)) {
      const r = runByOwner.get(id);
      return setDerived(id, "working", r.brief?.title || r.title || "Active workflow", ifWorkAction || "Working");
    }
    setDerived(id, "idle", "No recent task", "");
  };

  if (buildItems.length) {
    setDerived("codex", "working", String(buildItems[0]?.title || "Build in progress"), "Build");
  } else {
    runFallback("codex", "Build in progress", "Build");
  }

  if (qaItems.length) {
    setDerived("ralph", "working", String(qaItems[0]?.title || "QA checks"), "Verify");
  } else {
    runFallback("ralph", "QA checks", "Verify");
  }

  if (researchBacklog.length) {
    setDerived("scout", "working", String(researchBacklog[0]?.title || "Scanning signals"), "Scan");
  } else {
    runFallback("scout", "Scanning signals", "Scan");
  }
  if (writeBacklog.length) {
    setDerived("quill", "working", String(writeBacklog[0]?.title || "Writing"), "Draft");
  } else {
    runFallback("quill", "Writing", "Draft");
  }

  // pixel, echo, and violet have no work-item signal — derive entirely from active runs.
  runFallback("pixel", "Design work", "Design");
  runFallback("echo", "Channel operations", "Manage channel");
  runFallback("violet", "Research", "Research");

  missionControlState.office2.derivedStatus = derived;
  missionControlState.office2.derivedMeta = meta;

  office2SyncEntities();
  void renderOffice2Activity();
}

function startOffice2HudSync() {
  if (office2HudTimer) return;
  void refreshOffice2Hud();
  office2HudTimer = setInterval(() => {
    void refreshOffice2Hud();
  }, 2500);
}

function stopOffice2HudSync() {
  if (!office2HudTimer) return;
  clearInterval(office2HudTimer);
  office2HudTimer = null;
}

function office2SeedRoster() {
  if (missionControlState.office2.roster.length) return missionControlState.office2.roster;
  // Office shows only the 8 locked agents. alex is a supporting slot, not a crew member.
  const locked = new Set(OFFICE2_LOCKED_AGENT_IDS);
  const roster = OFFICE2_AGENT_DIRECTORY.filter((a) => locked.has(a.id)).map((agent) => ({ ...agent }));
  missionControlState.office2.roster = roster;
  return roster;
}

function office2EnsureSelected() {
  const stored = safeJsonParse(localStorage.getItem(MC_OFFICE2_KEY), null);
  if (stored && typeof stored.selectedId === "string" && stored.selectedId) {
    missionControlState.office2.selectedId = stored.selectedId;
    return stored.selectedId;
  }
  const seed = { version: 2, selectedId: "henry" };
  localStorage.setItem(MC_OFFICE2_KEY, safeJsonStringify(seed));
  missionControlState.office2.selectedId = "henry";
  return "henry";
}

function pixelPalette(agentId = "") {
  const id = String(agentId || "").toLowerCase();
  if (id === "henry") {
    return { skin: "#8f5b3d", body: "#3b82f6", pants: "#182235", hair: "#111827", accent: "#bfdcff", glasses: true, hat: "" };
  }
  if (id === "scout") {
    return { skin: "#6f472e", body: "#10b981", pants: "#1b2338", hair: "#16181f", accent: "#7cecc6", glasses: false, hat: "" };
  }
  if (id === "quill") {
    return { skin: "#4f2c1f", body: "#a855f7", pants: "#20263d", hair: "#20111d", accent: "#d8b4fe", glasses: true, hat: "" };
  }
  if (id === "codex") {
    return { skin: "#c18a62", body: "#f97316", pants: "#1d2638", hair: "#6b3418", accent: "#fed7aa", glasses: false, hat: "cap" };
  }
  if (id === "pixel") {
    return { skin: "#7b4a33", body: "#ec4899", pants: "#1f2138", hair: "#3a1026", accent: "#f9a8d4", glasses: false, hat: "beanie" };
  }
  if (id === "echo") {
    return { skin: "#9c6845", body: "#22c55e", pants: "#17263a", hair: "#221f1f", accent: "#93c5fd", glasses: false, hat: "headset" };
  }
  if (id === "violet") {
    return { skin: "#d9b39b", body: "#8b5cf6", pants: "#252649", hair: "#342356", accent: "#ddd6fe", glasses: false, hat: "" };
  }
  if (id === "ralph") {
    return { skin: "#a56a48", body: "#f59e0b", pants: "#21273b", hair: "#50311a", accent: "#fde68a", glasses: true, hat: "cap" };
  }
  if (id === "alex") {
    return { skin: "#85543b", body: "#4f8cff", pants: "#1d2438", hair: "#0f172a", accent: "#bfdbfe", glasses: false, hat: "cap" };
  }
  return { skin: "#b88362", body: "#64748b", pants: "#1e293b", hair: "#111827", accent: "#dbeafe", glasses: false, hat: "" };
}

function drawPixelPerson(canvas, agentId) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { skin, body, pants, hair, accent, glasses, hat } = pixelPalette(agentId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  if (hat === "beanie") {
    ctx.fillStyle = accent;
    ctx.fillRect(4, 1, 8, 2);
    ctx.fillRect(5, 3, 6, 1);
  } else if (hat === "cap") {
    ctx.fillStyle = accent;
    ctx.fillRect(4, 1, 8, 2);
    ctx.fillRect(9, 3, 4, 1);
  }

  ctx.fillStyle = hair;
  ctx.fillRect(5, 1, 6, 2);
  ctx.fillRect(4, 3, 1, 2);
  ctx.fillRect(11, 3, 1, 2);

  ctx.fillStyle = skin;
  ctx.fillRect(5, 3, 6, 6);

  ctx.fillStyle = "#101827";
  ctx.fillRect(7, 5, 1, 1);
  ctx.fillRect(9, 5, 1, 1);
  ctx.fillRect(8, 7, 1, 1);

  if (glasses) {
    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(6, 5, 3, 1);
    ctx.fillRect(8, 5, 1, 1);
    ctx.fillRect(9, 5, 3, 1);
  }

  if (hat === "headset") {
    ctx.fillStyle = accent;
    ctx.fillRect(4, 4, 1, 3);
    ctx.fillRect(11, 4, 1, 3);
    ctx.fillRect(5, 3, 6, 1);
  }

  ctx.fillStyle = body;
  ctx.fillRect(4, 9, 8, 5);
  ctx.fillRect(3, 10, 1, 3);
  ctx.fillRect(12, 10, 1, 3);
  ctx.fillStyle = accent;
  ctx.fillRect(7, 9, 2, 2);
  ctx.fillStyle = pants;
  ctx.fillRect(5, 14, 2, 3);
  ctx.fillRect(9, 14, 2, 3);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(5, 17, 2, 1);
  ctx.fillRect(9, 17, 2, 1);
}

function office2AgentAriaLabel(agent) {
  const display = String(agent?.displayName || agent?.id || "").trim();
  const role = String(agent?.role || "Operator").trim();
  const status = office2StatusLabel(agent?.mapsTo || agent?.id);
  const task = office2TaskLabel(agent?.mapsTo || agent?.id);
  return [display, role, status, task].filter(Boolean).join(". ");
}

function office2StatusLabel(mapsTo) {
  const id = String(mapsTo || "");
  const derived = missionControlState.office2?.derivedStatus || {};
  const status = derived[id] || (id && officeState.agents[id] ? officeState.agents[id].status : "idle");
  if (status === "waiting_for_you") return "Waiting";
  if (status === "working") return "Active";
  if (status === "blocked") return "Blocked";
  if (status === "done") return "Done";
  return "Idle";
}

function office2TaskLabel(mapsTo) {
  const id = String(mapsTo || "");
  const derivedMeta = missionControlState.office2?.derivedMeta || {};
  const derivedLast = derivedMeta?.[id]?.lastTask ? String(derivedMeta[id].lastTask || "") : "";
  const last = derivedLast || (id && officeState.agents[id] ? String(officeState.agents[id].lastTask || "") : "");
  if (!last) return "";
  if (last.trim().toLowerCase() === "no recent task") return "";
  return last;
}

function setOffice2Selected(agentId) {
  missionControlState.office2.selectedId = agentId;
  const stored = safeJsonParse(localStorage.getItem(MC_OFFICE2_KEY), { version: 2, selectedId: agentId });
  stored.selectedId = agentId;
  localStorage.setItem(MC_OFFICE2_KEY, safeJsonStringify(stored));
}

function renderOffice2Entities() {
  if (!office2Entities) return;
  const roster = office2SeedRoster();
  office2EnsureSelected();

  if (!missionControlState.office2.nodes) missionControlState.office2.nodes = {};

  roster.forEach((agent, idx) => {
    let el = missionControlState.office2.nodes[agent.id];
    if (!el || !office2Entities.contains(el)) {
      el = document.createElement("button");
      el.type = "button";
      el.className = "office2-entity";
      el.dataset.agentId = agent.id;
      el.dataset.displayName = agent.displayName || agent.id;
      el.dataset.lane = agent.lane || "";
      el.dataset.role = agent.role || "";

      const badge = document.createElement("div");
      badge.className = "office2-role-badge";
      badge.innerHTML = office2IconSvg(agent.silhouetteIcon);
      el.appendChild(badge);

      const spriteWrap = document.createElement("div");
      spriteWrap.className = "office2-sprite-wrap";
      const spriteRole = document.createElement("div");
      spriteRole.className = "office2-sprite-role";

      const canvas = document.createElement("canvas");
      canvas.width = 20;
      canvas.height = 20;
      drawPixelPerson(canvas, agent.id);
      spriteRole.appendChild(canvas);
      spriteWrap.appendChild(spriteRole);

      const shadow = document.createElement("div");
      shadow.className = "office2-ground-shadow";

      const label = document.createElement("div");
      label.className = "office2-entity-label";
      label.innerHTML = `
        <div class="office2-entity-role">${escapeHtml(agent.role || "")}</div>
        <div class="office2-entity-display">${escapeHtml(agent.displayName || agent.id)}</div>
      `;

      el.appendChild(spriteWrap);
      el.appendChild(shadow);
      el.appendChild(label);

      el.style.setProperty("--lane-accent", office2GetAccent(agent));
      el.style.setProperty("--blink-delay", `${Math.floor(office2HashUnit(agent.id + "_blink") * 2400)}ms`);
      el.setAttribute("aria-label", office2AgentAriaLabel(agent));

      el.addEventListener("mouseenter", () => {
        if (!office2Tooltip) return;
        const display = String(agent.displayName || agent.id || "").trim();
        const role = String(agent.role || "").trim();
        const task = office2TaskLabel(agent.mapsTo || agent.id);

        const nameLine = role ? `${role} \u2013 ${display}` : display;
        const safeName = escapeHtml(nameLine.trim());
        const safeTask = task ? `<div class="office2-tip-task">${escapeHtml(task)}</div>` : "";
        office2Tooltip.innerHTML = `<div class="office2-tip-name">${safeName}</div>${safeTask}`;

        const rect = el.getBoundingClientRect();
        const roomRect = office2Room?.getBoundingClientRect();
        if (!roomRect) return;
        office2Tooltip.style.left = `${rect.left - roomRect.left + rect.width / 2}px`;
        office2Tooltip.style.top = `${rect.top - roomRect.top}px`;
        office2Tooltip.classList.remove("hidden");
      });

      el.addEventListener("mouseleave", () => {
        if (office2Tooltip) office2Tooltip.classList.add("hidden");
      });

      el.addEventListener("click", () => {
        if (office2Tooltip) office2Tooltip.classList.add("hidden");
        setOffice2Selected(agent.id);
        renderOffice2AgentCards();
        if (agent.mapsTo) {
          setOfficeActiveAgent(agent.mapsTo);
          openCommandDrawer();
        } else {
          showToast("Demo agent selected.", "ok");
        }
      });

      missionControlState.office2.nodes[agent.id] = el;
      office2Entities.appendChild(el);
    }

    // Keep label content consistent across hot reloads / incremental updates.
    const labelNode = el.querySelector(".office2-entity-label");
    if (labelNode) {
      const displayNode = labelNode.querySelector(".office2-entity-display");
      if (displayNode) displayNode.textContent = agent.displayName || agent.id;
      let roleNode = labelNode.querySelector(".office2-entity-role");
      if (!roleNode && displayNode) {
        roleNode = document.createElement("div");
        roleNode.className = "office2-entity-role";
        labelNode.insertBefore(roleNode, displayNode);
      }
      if (roleNode) roleNode.textContent = agent.role || "";
    }

    const status = office2ComputeStatus(agent);
    el.dataset.status = status;
    el.dataset.lane = agent.lane || "";
    el.style.setProperty("--lane-accent", office2GetAccent(agent));
    el.setAttribute("aria-label", office2AgentAriaLabel(agent));

    const desired = office2DesiredPosition(agent, status, idx);
    const x = clampPct(desired.x, 6, 94);
    const y = clampPct(desired.y, 10, 92);

    const prevX = Number(el.dataset.px || "");
    const prevY = Number(el.dataset.py || "");
    const moved = Number.isFinite(prevX) && Number.isFinite(prevY) ? Math.hypot(prevX - x, prevY - y) > 1.2 : true;
    el.dataset.px = String(x);
    el.dataset.py = String(y);

    if (moved) {
      el.classList.add("moving");
      clearTimeout(officeState.moveTimers[`office2_${agent.id}`]);
      officeState.moveTimers[`office2_${agent.id}`] = setTimeout(() => {
        el.classList.remove("moving");
      }, 520);
    }

    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
  });
}

function syncOffice2AgentCards() {
  if (!office2AgentCards) return;
  const roster = office2SeedRoster();
  const byId = Object.fromEntries(roster.map((agent) => [agent.id, agent]));
  const selected = missionControlState.office2.selectedId || office2EnsureSelected() || "henry";
  missionControlState.office2.selectedId = selected;

  Array.from(office2AgentCards.querySelectorAll(".office2-agent-card")).forEach((card) => {
    const agentId = String(card.dataset.agentId || "");
    const agent = byId[agentId];
    card.classList.toggle("active", agentId === selected);
    card.setAttribute("aria-pressed", agentId === selected ? "true" : "false");
    const statusNode = card.querySelector(".office2-agent-status");
    if (statusNode && agent) statusNode.textContent = office2StatusLabel(agent.mapsTo || agent.id);
  });
}

function office2SyncEntities() {
  if (!officeRoomView || officeRoomView.classList.contains("hidden")) return;
  renderOffice2Entities();
  syncOffice2AgentCards();
}

function renderOffice2AgentCards() {
  if (!office2AgentCards) return;
  const roster = office2SeedRoster();
  const selected = missionControlState.office2.selectedId || office2EnsureSelected() || "henry";
  missionControlState.office2.selectedId = selected;

  office2AgentCards.innerHTML = "";
  roster.forEach((agent) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "office2-agent-card" + (agent.id === selected ? " active" : "");
    card.dataset.agentId = agent.id;
    card.title = `${agent.role} \u00b7 ${agent.displayName || agent.id}`;
    card.setAttribute("aria-pressed", agent.id === selected ? "true" : "false");
    card.setAttribute("aria-label", office2AgentAriaLabel(agent));
    card.innerHTML = `
      <div class="office2-agent-avatar" aria-hidden="true"><canvas width="20" height="20"></canvas></div>
      <div class="office2-agent-meta">
        <div class="office2-agent-name">${escapeHtml(agent.role || agent.id)}</div>
        <div class="office2-agent-hint">${escapeHtml(agent.displayName || "")}</div>
      </div>
      <div class="office2-agent-status">${escapeHtml(office2StatusLabel(agent.mapsTo || agent.id))}</div>
    `;
    drawPixelPerson(card.querySelector("canvas"), agent.id);
    card.addEventListener("click", () => {
      setOffice2Selected(agent.id);
      renderOffice2AgentCards();
      if (agent.mapsTo) {
        setOfficeActiveAgent(agent.mapsTo);
        openCommandDrawer();
      } else {
        showToast("Demo agent selected.", "ok");
      }
    });
    office2AgentCards.appendChild(card);
  });
}

async function renderOffice2Activity() {
  if (!office2ActivityEmpty || !office2ActivityList) return;
  const afterIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let events = [];
  try {
    const data = await apiRequest(`/events/${encodeURIComponent(GLOBAL_PODCAST_ID)}?after=${encodeURIComponent(afterIso)}&limit=80`);
    events = Array.isArray(data?.events) ? data.events : [];
  } catch (err) {
    // Keep calm: if events endpoint is offline, show empty state.
    events = [];
  }

  // Default to a "signal" feed (not firehose). We keep Talk turns + decisions + approvals + errors.
  const noisyTypes = new Set(["agent_status_updated", "speaker_analytics_generated", "segment_started", "speaker_labeled"]);
  events = events.filter((evt) => !noisyTypes.has(String(evt?.type || "")));

  // Prepend active workflow runs as synthetic events so Office shows live run context.
  const activeRuns = missionControlState.office2?.activeRuns || [];
  const runEvents = activeRuns.slice(0, 4).map((run) => ({
    _synthetic: true,
    timestamp: run.updatedAt || run.createdAt || "",
    actor: mcCanonicalName(run.ownerAgentId) || run.ownerAgentId || "operator",
    lane: run.brief?.recommendedLane || run.category || "",
    summary: run.brief?.title || run.title || run.idea || "Active workflow",
    type: mcRunStateLabel(run.state)
  }));

  const allRows = [...runEvents, ...events.slice(-24)];

  if (!allRows.length) {
    office2ActivityEmpty.classList.remove("hidden");
    office2ActivityList.classList.add("hidden");
    return;
  }

  office2ActivityEmpty.classList.add("hidden");
  office2ActivityList.classList.remove("hidden");

  office2ActivityList.innerHTML = "";
  allRows.forEach((event) => {
    const row = document.createElement("div");
    row.className = "office2-activity-row" + (event._synthetic ? " office2-activity-row-run" : "");
    const ts = event?.timestamp ? new Date(event.timestamp) : null;
    const timeLabel = ts && Number.isFinite(ts.getTime())
      ? ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "--:--:--";
    const source = [String(event?.actor || ""), String(event?.lane || "")]
      .map((value) => mcPublicLabel(value))
      .filter(Boolean)
      .join(" \u2022 ");
    const rawSummary = String(event?.summary || "").trim() || String(event?.type || "").trim();
    const summary = mcPublicLabel(rawSummary);
    const type = mcPublicLabel(String(event?.type || "").trim());
    row.innerHTML = `
      <div class="office2-activity-time">${escapeHtml(timeLabel)}</div>
      <div class="office2-activity-main">
        <div class="office2-activity-src">${escapeHtml(source)}</div>
        <div class="office2-activity-msg">${escapeHtml(summary)}</div>
      </div>
      <div class="office2-activity-type">${escapeHtml(type)}</div>
    `;
    office2ActivityList.appendChild(row);
  });
}

function renderOffice2Page() {
  if (!officeRoomView || !office2Entities || !office2AgentCards) return;
  office2SeedRoster();
  office2LoadUiPrefs();
  office2ApplyLabelMode();

  const labelsBtn = document.getElementById("office2-toggle-labels");
  if (labelsBtn && !labelsBtn.dataset.bound) {
    labelsBtn.dataset.bound = "1";
    labelsBtn.addEventListener("click", () => {
      office2ToggleLabels();
      labelsBtn.classList.toggle("active", Boolean(missionControlState.office2.hideLabels));
    });
  }
  if (labelsBtn) labelsBtn.classList.toggle("active", Boolean(missionControlState.office2.hideLabels));

  renderOffice2Entities();
  renderOffice2AgentCards();
  void renderOffice2Activity();
  startOffice2LiveSync();
  startOffice2HudSync();
}

// ===== Factory Page =====
function seedFactoryStore() {
  const stored = safeJsonParse(localStorage.getItem(MC_FACTORY_KEY), null);
  if (stored && Array.isArray(stored.items) && stored.items.length) return stored;

  const now = Date.now();
  const mk = (id, stage, ageMins, blocked = false) => ({
    id,
    stage,
    createdAt: new Date(now - ageMins * 60 * 1000).toISOString(),
    blocked
  });

  const items = [
    mk("pkg_council", "build", 92),
    mk("pkg_factory", "qa", 48),
    mk("pkg_calendar", "review", 28),
    mk("pkg_memory", "backlog", 180),
    mk("pkg_office", "backlog", 210),
    mk("pkg_pipeline", "build", 62),
    mk("pkg_integrations", "review", 120, true)
  ];

  const seed = { version: 1, items };
  localStorage.setItem(MC_FACTORY_KEY, safeJsonStringify(seed));
  return seed;
}

function loadFactoryStore() {
  const seed = seedFactoryStore();
  const stored = safeJsonParse(localStorage.getItem(MC_FACTORY_KEY), seed);
  if (!stored || !Array.isArray(stored.items)) return seed;
  return stored;
}

function saveFactoryStore(next) {
  localStorage.setItem(MC_FACTORY_KEY, safeJsonStringify(next));
}

function factoryStageIndex(stage) {
  const order = ["backlog", "build", "qa", "review", "ship"];
  const idx = order.indexOf(stage);
  return idx === -1 ? 0 : idx;
}

function normalizeFactoryStage(stage) {
  const raw = String(stage || "").trim().toLowerCase();
  if (raw === "backlog" || raw === "build" || raw === "qa" || raw === "review" || raw === "ship") return raw;
  const up = String(stage || "").trim().toUpperCase();
  if (up === "BACKLOG") return "backlog";
  if (up === "BUILD") return "build";
  if (up === "QA") return "qa";
  if (up === "REVIEW") return "review";
  if (up === "SHIP") return "ship";
  return "backlog";
}

function mapWorkItemToFactoryItem(item) {
  if (!item) return null;
  const stage = normalizeFactoryStage(item.stage);
  const blocked = Boolean(item?.data?.blocked) || String(item?.risk || "").toLowerCase() === "high";
  return {
    id: String(item.id),
    stage,
    createdAt: String(item.createdTs || item.created_at || item.createdAt || new Date().toISOString()),
    blocked,
    title: String(item.title || ""),
    objective: String(item.objective || ""),
    approvalId: String(item?.data?.approvalId || "").trim() || null
  };
}

async function loadFactoryItems() {
  try {
    const items = await apiListWorkItems({ limit: 200 });
    const mapped = (items || []).map(mapWorkItemToFactoryItem).filter(Boolean);
    missionControlState.factory.items = mapped;
    missionControlState.factory.workItems = items;
    return mapped;
  } catch {
    const store = loadFactoryStore();
    const mapped = (store.items || []).map((it) => ({
      id: it.id,
      stage: normalizeFactoryStage(it.stage),
      createdAt: String(it.createdAt || new Date().toISOString()),
      blocked: Boolean(it.blocked),
      title: it.id,
      objective: "",
      approvalId: null
    }));
    missionControlState.factory.items = mapped;
    return mapped;
  }
}

async function advanceFactoryItem(itemId) {
  const id = String(itemId || "").trim();
  if (!id) return;
  const order = ["backlog", "build", "qa", "review", "ship"];

  const current = (missionControlState.factory.items || []).find((it) => it.id === id);
  const currentStage = current ? normalizeFactoryStage(current.stage) : "backlog";
  const idx = order.indexOf(currentStage);
  const nextStage = order[(idx + 1) % order.length];

  try {
    await apiSetWorkItemStage(id, nextStage.toUpperCase(), { actor: "user", reason: "ui_click_advance", sessionId: GLOBAL_PODCAST_ID });
  } catch {
    // Fallback: localStorage mode
    const store = loadFactoryStore();
    const item = store.items.find((it) => it.id === id);
    if (!item) return;
    const i2 = order.indexOf(normalizeFactoryStage(item.stage));
    item.stage = order[(i2 + 1) % order.length];
    if (item.stage === "ship") item.shippedAt = new Date().toISOString();
    saveFactoryStore(store);
  }
  void renderFactoryPage();
}

function renderFactoryMetrics(items, completedCount = 0) {
  const shippedToday = items.filter((it) => it.stage === "ship").length;
  const inProgress = items.filter((it) => ["build", "qa", "review"].includes(it.stage)).length;
  const backlog = items.filter((it) => it.stage === "backlog").length;
  const blocked = items.filter((it) => Boolean(it.blocked)).length;

  if (factoryMetricShipped) factoryMetricShipped.textContent = String(shippedToday);
  if (factoryMetricInProgress) factoryMetricInProgress.textContent = String(inProgress);
  if (factoryMetricBacklog) factoryMetricBacklog.textContent = String(backlog);
  if (factoryMetricBlocked) factoryMetricBlocked.textContent = String(blocked);
  if (factoryMetricAvgTime) factoryMetricAvgTime.textContent = inProgress || shippedToday ? "—" : "—";
  if (factoryMetricCompleted) factoryMetricCompleted.textContent = String(completedCount);
}

function renderFactoryBelt(items) {
  if (!factoryBeltItems) return;
  factoryBeltItems.innerHTML = "";

  const width = factoryBeltItems.getBoundingClientRect().width || 600;
  const stages = ["backlog", "build", "qa", "review", "ship"];
  const pkgSize = 20;
  const margin = 28;
  const span = Math.max(0, width - margin * 2);
  const step = stages.length > 1 ? span / (stages.length - 1) : 0;
  const anchors = Object.fromEntries(stages.map((stage, idx) => [stage, margin + idx * step]));

  const offsetsForCount = (count) => {
    if (count <= 1) return [0];
    if (count === 2) return [-10, 10];
    if (count === 3) return [-12, 0, 12];
    if (count === 4) return [-18, -6, 6, 18];
    if (count === 5) return [-24, -12, 0, 12, 24];
    const out = [];
    const half = Math.floor(count / 2);
    for (let i = -half; i <= half; i++) out.push(i * 10);
    return out;
  };

  const byStage = Object.fromEntries(stages.map((stage) => [stage, []]));
  (items || []).forEach((item) => {
    const stage = stages.includes(item.stage) ? item.stage : "backlog";
    byStage[stage].push(item);
  });

  stages.forEach((stage) => {
    const stageItems = byStage[stage]
      .slice()
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    const offsets = offsetsForCount(stageItems.length);
    stageItems.forEach((item, idx) => {
      const xCenter = (anchors[stage] || margin) + (offsets[idx] || 0);
      const xLeft = Math.max(0, Math.min(width - pkgSize, Math.round(xCenter - pkgSize / 2)));

      const node = document.createElement("div");
      node.className = "factory-package";
      node.dataset.itemId = item.id;
      node.style.left = `${xLeft}px`;
      if (item.blocked) {
        node.style.borderColor = "rgba(239, 68, 68, 0.45)";
        node.style.background = "rgba(239, 68, 68, 0.22)";
      }
      factoryBeltItems.appendChild(node);
    });
  });
}

function renderFactoryBuildAgents() {
  if (!factoryBuildAgents) return;
  factoryBuildAgents.innerHTML = "";
  const buildRoster = ["codex", "henry"];
  buildRoster.forEach((agentId) => {
    const wrap = document.createElement("div");
    wrap.className = "fx-px-agent";
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    drawPixelPerson(canvas, agentId);
    const label = document.createElement("div");
    label.className = "fx-px-agent-name";
    label.textContent = mcCanonicalName(agentId) || agentId;
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    factoryBuildAgents.appendChild(wrap);
  });
}

function renderFactoryCompletedRuns(runs) {
  if (!factoryCompletedList) return;
  if (!runs.length) {
    factoryCompletedList.innerHTML = `<p class="factory-completed-empty">No completed packs yet. Approve a workflow run to generate one.</p>`;
    return;
  }

  factoryCompletedList.innerHTML = runs.map((run) => {
    const title = run.brief?.title || run.title || compactText(run.idea, 72) || "Workflow run";
    const lane = run.brief?.recommendedLane || run.category || "";
    const owner = mcCanonicalName(run.ownerAgentId) || "";
    const ts = formatRelativeTime(run.createdAt || run.createdTs) || "";
    const artifacts = run.artifacts || {};
    const hasDoc = artifacts.doc?.title;
    const hasMockup = artifacts.mockup?.title;
    const hasPrototype = artifacts.prototype?.title;
    const hasSmoke = artifacts.smoke?.summary;
    const packSummary = artifacts.smoke?.summary || artifacts.doc?.summary || run.brief?.summary || "";
    const artifactChips = [
      hasDoc ? `<span class="factory-pack-chip">Doc</span>` : "",
      hasMockup ? `<span class="factory-pack-chip">Mockup</span>` : "",
      hasPrototype ? `<span class="factory-pack-chip">Prototype</span>` : "",
      hasSmoke ? `<span class="factory-pack-chip">Smoke</span>` : ""
    ].filter(Boolean).join("");

    return `
      <article class="factory-pack-card" data-run-id="${escapeHtml(run.id)}">
        <div class="factory-pack-head">
          <div class="factory-pack-title">${escapeHtml(title)}</div>
          <div class="factory-pack-state">Completed</div>
        </div>
        <div class="factory-pack-meta">
          ${owner ? `<span>${escapeHtml(owner)}</span>` : ""}
          ${lane ? `<span>${escapeHtml(lane)}</span>` : ""}
          ${ts ? `<span>${escapeHtml(ts)}</span>` : ""}
        </div>
        ${artifactChips ? `<div class="factory-pack-chips">${artifactChips}</div>` : ""}
        ${packSummary ? `<div class="factory-pack-summary">${escapeHtml(packSummary.slice(0, 180))}</div>` : ""}
        <div class="factory-pack-actions">
          <button class="ops-action-btn" type="button"
            data-action="copy-pack" data-run-id="${escapeHtml(run.id)}">Copy pack</button>
          <button class="ops-action-btn ops-action-btn-secondary" type="button"
            data-action="select-project" data-project-id="${escapeHtml(run.links?.projectId || `workflow_${run.id}`)}" data-scroll-target="ledger">View in Projects</button>
        </div>
      </article>
    `;
  }).join("");
}

async function renderFactoryPage() {
  if (!factoryView) return;
  renderFactoryBuildAgents();
  const [items, runsData] = await Promise.all([
    loadFactoryItems(),
    apiRequest("/api/workflow/runs?limit=40").then((d) => (Array.isArray(d?.runs) ? d.runs : [])).catch(() => [])
  ]);
  const completedRuns = runsData.filter((r) => String(r?.state || "") === "completed");
  requestAnimationFrame(() => renderFactoryBelt(items));
  renderFactoryMetrics(items, completedRuns.length);
  renderFactoryCompletedRuns(completedRuns);
}

function mcBlockedWorkItem(item) {
  return Boolean(item?.data?.blocked) || String(item?.risk || "").toLowerCase() === "high";
}

function mcStatusTone(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "approved" || raw === "ok" || raw === "ship" || raw === "done") return "ok";
  if (raw === "pending" || raw === "review" || raw === "qa" || raw === "attention") return "warn";
  if (raw === "blocked" || raw === "rejected" || raw === "high") return "danger";
  if (raw === "build" || raw === "active" || raw === "working") return "info";
  return "muted";
}

function mcStageBadge(stage = "") {
  const raw = String(stage || "").trim();
  const lower = raw.toLowerCase();
  const isFactoryStage = ["backlog", "build", "qa", "review", "ship"].includes(lower);
  const label = isFactoryStage ? normalizeFactoryStage(raw).toUpperCase() : raw.toUpperCase();
  const tone = isFactoryStage ? mcStatusTone(lower) : mcStatusTone(raw);
  return `<span class="ops-badge" data-tone="${tone}">${escapeHtml(label || "STATUS")}</span>`;
}

function mcEmptyHtml(message) {
  return `<div class="ops-empty">${escapeHtml(message)}</div>`;
}

function mcOverviewContentFallback() {
  return { signals: [], topics: [], drafts: [] };
}

async function mcLoadOverview({ force = false, includeSpeech = true } = {}) {
  const lastLoadedAt = Number(missionControlState.overview.loadedAt || 0);
  const isFresh = !force && lastLoadedAt && Date.now() - lastLoadedAt < 5000;
  if (isFresh && missionControlState.overview.health) {
    return missionControlState.overview;
  }

  const speechPromise = includeSpeech
    ? apiRequest("/speech/sessions")
        .then((res) => (Array.isArray(res?.sessions) ? res.sessions : []))
        .catch(() => [])
    : Promise.resolve(missionControlState.overview.speechSessions || []);

  const [health, voiceRes, approvals, workItems, workflowRuns, contentRes, speechSessions] = await Promise.all([
    apiRequest("/health").catch(() => null),
    apiRequest("/voice/capabilities").catch(() => null),
    apiListApprovals({ limit: 120 }).catch(() => []),
    apiListWorkItems({ limit: 120 }).catch(() => []),
    apiListWorkflowRuns({ limit: 80 }).catch(() => []),
    apiRequest("/content/pipeline").catch(() => ({ ok: false, store: mcOverviewContentFallback() })),
    speechPromise
  ]);

  const content = contentRes?.store && typeof contentRes.store === "object" ? contentRes.store : mcOverviewContentFallback();
  missionControlState.overview = {
    loadedAt: Date.now(),
    health,
    voice: voiceRes?.capabilities || null,
    approvals: Array.isArray(approvals) ? approvals : [],
    workItems: Array.isArray(workItems) ? workItems : [],
    workflowRuns: Array.isArray(workflowRuns) ? workflowRuns : [],
    content,
    speechSessions: Array.isArray(speechSessions) ? speechSessions : []
  };

  if (content && typeof content === "object") {
    contentState.store = content;
  }

  return missionControlState.overview;
}

function mcInvalidateOverview() {
  missionControlState.overview.loadedAt = 0;
}

function mcWorkflowProjectFromRun(run) {
  if (!run || typeof run !== "object") return null;
  const workflowRunId = String(run.id || "").trim();
  if (!workflowRunId) return null;
  const brief = run.brief && typeof run.brief === "object" ? run.brief : {};
  const artifacts = run.artifacts && typeof run.artifacts === "object" ? run.artifacts : {};
  const links = run.links && typeof run.links === "object" ? run.links : {};
  const approvals = run.approvals && typeof run.approvals === "object" ? run.approvals : {};
  const risks = Array.isArray(run.risks) ? run.risks : [];
  const nextSteps = Array.isArray(artifacts.nextSteps) ? artifacts.nextSteps : [];

  const runState = String(run.state || run.phase || "planning").trim();
  const plan = run.plan && typeof run.plan === "object" ? run.plan : {};
  const intake = run.intake && typeof run.intake === "object" ? run.intake : {};
  const request = run.request && typeof run.request === "object" ? run.request : {};
  const requestNormalized = request.normalized && typeof request.normalized === "object" ? request.normalized : {};
  const rawAssumptions = Array.isArray(request.assumptions) ? request.assumptions : [];
  const approvalBrief = approvals.brief && typeof approvals.brief === "object" ? approvals.brief : {};
  const stateHistory = Array.isArray(run.stateHistory) ? run.stateHistory : [];

  return {
    id: String(links.projectId || `workflow_${workflowRunId}`).trim(),
    name: String(brief.title || run.title || compactText(run.idea, 72) || "Workflow Run").trim(),
    ownerAgentId: String(links.ownerAgentId || brief.routing?.ownerAgentId || "henry").trim() || "henry",
    summary: String(brief.summary || `ATEAM workflow run — ${runState.replaceAll("_", " ")}.`).trim(),
    outcome: String(
      artifacts?.prototype?.summary ||
        brief.primaryGoal ||
        brief.scope ||
        "Generated workflow pack ready for operator review."
    ).trim(),
    linkedWorkItemIds: Array.isArray(links.workItemIds) ? links.workItemIds : [],
    docIds: [],
    workflowRunId,
    workflow: {
      state: runState,
      phase: String(run.phase || "analysis").trim(),
      recommendedLane: String(run.recommendedLane || brief.recommendedLane || "").trim(),
      risks,
      nextSteps,
      mockupTitle: String(artifacts?.mockup?.title || "").trim(),
      prototypeTitle: String(artifacts?.prototype?.title || "").trim(),
      smokeSummary: String(artifacts?.smoke?.summary || "").trim(),
      handoffStatus: String(run?.handoff?.status || "").trim(),
      audience: String(brief.audience || requestNormalized.audience || "").trim(),
      constraints: Array.isArray(brief.constraints) ? brief.constraints : [],
      successCriteria: Array.isArray(brief.successCriteria) ? brief.successCriteria : [],
      approvals,
      approvalStatus: String(approvalBrief.status || "pending").trim(),
      approvalId: String(approvalBrief.approvalId || "").trim(),
      briefSummary: String(brief.summary || "").trim(),
      briefDirection: String(brief.recommendedDirection || "").trim(),
      phasedPlan: Array.isArray(brief.phasedPlan) ? brief.phasedPlan : [],
      assumptions: rawAssumptions.slice(0, 4),
      goal: String(intake.goal || requestNormalized.goal || run.idea || "").trim(),
      stateHistory: stateHistory.slice(-5)
    }
  };
}

function mcProjectPortfolio() {
  const workflowRuns = Array.isArray(missionControlState.overview.workflowRuns)
    ? missionControlState.overview.workflowRuns
    : [];
  const workflowProjects = workflowRuns
    .map((run) => mcWorkflowProjectFromRun(run))
    .filter(Boolean);
  return [...workflowProjects, ...PROJECT_PORTFOLIO];
}

function mcProjectById(projectId) {
  const portfolio = mcProjectPortfolio();
  return portfolio.find((project) => project.id === projectId) || portfolio[0] || null;
}

function mcProjectItems(project, workItems = []) {
  if (!project) return [];
  const linkedIds = new Set(project.linkedWorkItemIds || []);
  return (Array.isArray(workItems) ? workItems : []).filter((item) => {
    const projectId = String(item?.data?.projectId || "").trim();
    return linkedIds.has(String(item?.id || "").trim()) || projectId === project.id;
  });
}

function mcProjectStatus(items = []) {
  if (!items.length) return { label: "Queued", tone: "muted" };
  if (items.some((item) => mcBlockedWorkItem(item))) return { label: "Needs Attention", tone: "danger" };
  if (items.some((item) => normalizeFactoryStage(item.stage) === "review")) return { label: "Awaiting Review", tone: "warn" };
  if (items.some((item) => normalizeFactoryStage(item.stage) === "ship")) return { label: "Shipping", tone: "ok" };
  if (items.some((item) => ["build", "qa"].includes(normalizeFactoryStage(item.stage)))) return { label: "In Motion", tone: "info" };
  return { label: "Backlog", tone: "muted" };
}

function mcDocTitle(docId) {
  const match = (missionControlState.docs.items || []).find((doc) => String(doc?.id || "") === String(docId || ""));
  return match?.title || String(docId || "").replaceAll("_", " ");
}

function mcScrollIntoView(node) {
  if (!node || typeof node.scrollIntoView !== "function") return;
  requestAnimationFrame(() => {
    node.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  });
}

async function mcFocusProject(projectId, { scrollTarget = "" } = {}) {
  const project = mcProjectById(projectId);
  if (!project) return;
  missionControlState.projects.selectedId = project.id;
  if (state.view !== "projects") setView("projects");
  await renderProjectsPage();
  if (scrollTarget === "detail") mcScrollIntoView(projectsDetail);
  if (scrollTarget === "ledger") mcScrollIntoView(projectsLedger);
}

function mcOpenDoc(docId, projectId = "") {
  const safeDocId = String(docId || "").trim();
  if (!safeDocId) return;
  if (projectId) {
    const project = mcProjectById(projectId);
    if (project) missionControlState.projects.selectedId = project.id;
  }
  missionControlState.docs.selectedId = safeDocId;
  setView("docs");
}

function renderCouncilPageJournal() {
  const memory = loadMemoryStore();
  const entries = (memory.entries || [])
    .slice()
    .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")))
    .slice(0, 3);
  if (!councilJournalList) return;
  if (!entries.length) {
    councilJournalList.innerHTML = mcEmptyHtml("No journal entries yet.");
    return;
  }
  councilJournalList.innerHTML = entries
    .map((entry) => {
      const excerpt = compactText(String(entry.body || "").replace(/[#>*`-]/g, " "), 160);
      return `
        <article class="ops-card">
          <div class="ops-card-head">
            <div class="ops-card-title">${escapeHtml(entry.date || "Journal")}</div>
            <div class="ops-card-meta">${escapeHtml(formatRelativeTime(entry.modifiedAt) || "Recently updated")}</div>
          </div>
          <div class="ops-card-copy">${escapeHtml(excerpt || "No preview available.")}</div>
        </article>
      `;
    })
    .join("");
}

async function renderCouncilPage({ force = false } = {}) {
  if (!councilView || councilView.classList.contains("hidden")) return;
  const overview = await mcLoadOverview({ force, includeSpeech: false });
  const approvals = (overview.approvals || []).filter((item) => String(item?.status || "").toLowerCase() === "pending");
  const workItems = overview.workItems || [];
  const activeItems = workItems.filter((item) => ["build", "qa", "review"].includes(normalizeFactoryStage(item.stage)));
  const blockedItems = workItems.filter((item) => mcBlockedWorkItem(item));
  const signals = overview.content?.signals || [];
  const topics = overview.content?.topics || [];
  const drafts = overview.content?.drafts || [];

  if (councilMetricPending) councilMetricPending.textContent = String(approvals.length);
  if (councilMetricBlocked) councilMetricBlocked.textContent = String(blockedItems.length);
  if (councilMetricActive) councilMetricActive.textContent = String(activeItems.length);
  if (councilMetricSignals) councilMetricSignals.textContent = String(signals.length);

  if (councilSummary) {
    councilSummary.textContent =
      approvals.length || blockedItems.length || activeItems.length || signals.length
        ? `ATEAM is carrying ${approvals.length} pending decisions, ${activeItems.length} active delivery items, and ${signals.length} live signals.`
        : "ATEAM is quiet right now. No urgent decisions or visible delivery pressure.";
  }

  if (councilSeats) {
    const seatCards = [
      {
        seat: `Chief of Staff / ${mcDisplayName("henry")}`,
        focus: approvals.length ? `Clear ${approvals.length} pending decision${approvals.length === 1 ? "" : "s"}.` : "Keep delivery lanes aligned.",
        note: activeItems.length ? `${activeItems.length} job${activeItems.length === 1 ? "" : "s"} moving right now.` : "No active delivery pressure."
      },
      {
        seat: `Research Analyst / ${mcDisplayName("violet")}`,
        focus: signals.length ? `Signals are stacking. ${signals.length} intake item${signals.length === 1 ? "" : "s"} need framing.` : "No new external signal pressure.",
        note: topics.length ? `${topics.length} topic${topics.length === 1 ? "" : "s"} already promoted into direction.` : "Signals has room to widen coverage."
      },
      {
        seat: `QA Lead / ${mcDisplayName("ralph")}`,
        focus: blockedItems.length ? `${blockedItems.length} item${blockedItems.length === 1 ? "" : "s"} need unblock or explicit rejection.` : "Quality gate is clear enough to keep flow moving.",
        note: drafts.filter((draft) => draft.status === "pending_approval").length
          ? `${drafts.filter((draft) => draft.status === "pending_approval").length} content draft decision${drafts.filter((draft) => draft.status === "pending_approval").length === 1 ? "" : "s"} are waiting.`
          : "No content decisions are bottlenecking review."
      }
    ];
    councilSeats.innerHTML = seatCards
      .map(
        (seat) => `
          <article class="ops-card">
            <div class="ops-card-head">
              <div class="ops-card-title">${escapeHtml(seat.seat)}</div>
            </div>
            <div class="ops-card-copy">${escapeHtml(seat.focus)}</div>
            <div class="ops-card-meta">${escapeHtml(seat.note)}</div>
          </article>
        `
      )
      .join("");
  }

  if (councilDecisionList) {
    councilDecisionList.innerHTML = approvals.length
      ? approvals
          .slice(0, 8)
          .map(
            (approval) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(approval.summary || "Pending approval")}</div>
                  <div class="ops-card-meta">${escapeHtml(approval.policy || "policy")}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(formatRelativeTime(approval.createdTs) || "Just created")}</div>
                <div class="ops-action-row">
                  <button class="ops-action-btn" type="button" data-action="approve-approval" data-approval-id="${escapeHtml(approval.id)}">Approve</button>
                  <button class="ops-action-btn" type="button" data-action="reject-approval" data-approval-id="${escapeHtml(approval.id)}">Reject</button>
                </div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No decisions are waiting right now.");
  }

  if (councilLanePressure) {
    const cards = [
      {
        title: "Signals",
        value: `${signals.length} live`,
        note: topics.length ? `${topics.length} already promoted` : "Signals can sift these next"
      },
      {
        title: "Delivery",
        value: `${activeItems.length} active`,
        note: blockedItems.length ? `${blockedItems.length} blocked / high-risk` : "No visible blockers"
      },
      {
        title: "Approvals",
        value: `${approvals.length} pending`,
        note: approvals.length ? "Human decision is the bottleneck." : "Decision lane is clear"
      },
      {
        title: "Publishing",
        value: `${drafts.filter((draft) => ["approved", "scheduled"].includes(draft.status)).length} ready`,
        note: drafts.filter((draft) => draft.status === "pending_approval").length ? "Content review still active" : "No content queue pressure"
      }
    ];
    councilLanePressure.innerHTML = cards
      .map(
        (card) => `
          <article class="ops-card">
            <div class="ops-card-head">
              <div class="ops-card-title">${escapeHtml(card.title)}</div>
              <div class="ops-card-meta">${escapeHtml(card.value)}</div>
            </div>
            <div class="ops-card-copy">${escapeHtml(card.note)}</div>
          </article>
        `
      )
      .join("");
  }

  renderCouncilPageJournal();
}

function mcDecisionPackText(run) {
  if (!run) return "";
  const brief = run.brief || {};
  const request = run.request || {};
  const normalized = request.normalized || {};
  const routing = request.routing || {};
  const assumptions = Array.isArray(request.assumptions) ? request.assumptions : [];
  const risks = Array.isArray(run.risks) ? run.risks : [];
  const intake = run.intake || {};
  const artifacts = run.artifacts || {};
  const doc = artifacts.doc || {};
  const smoke = artifacts.smoke || {};
  const mockup = artifacts.mockup || {};
  const prototype = artifacts.prototype || {};
  const approvals = run.approvals || {};
  const history = Array.isArray(run.stateHistory) ? run.stateHistory : [];
  const constraints = Array.isArray(brief.constraints) ? brief.constraints : [];
  const goals = Array.isArray(brief.goals) ? brief.goals : [];
  const phasedPlan = Array.isArray(brief.phasedPlan) ? brief.phasedPlan : [];
  const successCriteria = Array.isArray(brief.successCriteria) ? brief.successCriteria : [];

  const lines = [
    `# Decision Pack — ${brief.title || run.title || "ATEAM Workflow Run"}`,
    `State: ${mcRunStateLabel(run.state)}`,
    `Run ID: ${run.id || ""}`,
    `Created: ${run.createdAt || run.createdTs || ""}`,
    "",
    "## Request Summary",
    intake.goal || normalized.goal || run.idea || "",
    normalized.scopeSummary ? `\nScope: ${normalized.scopeSummary}` : "",
    "",
    "## What ATEAM Understood",
    brief.quickVerdict || "",
    brief.decisionNote ? `\n${brief.decisionNote}` : "",
    "",
    "## Audience / Context",
    brief.audience || normalized.audience || "",
    intake.context ? `\nContext: ${intake.context}` : "",
    "",
    assumptions.length ? "## Assumptions\n" + assumptions.map(a => `- ${a}`).join("\n") : "",
    "",
    phasedPlan.length ? "## Proposed Plan\n" + phasedPlan.map((step, i) => `${i + 1}. ${step}`).join("\n") : "",
    "",
    risks.length ? "## Blockers / Risks\n" + risks.map(r => `- ${r}`).join("\n") : "",
    constraints.length ? "\nConstraints:\n" + constraints.map(c => `- ${c}`).join("\n") : "",
    "",
    "## Recommended Next Move",
    brief.recommendedDirection || routing.reason || "",
    goals.length ? "\nGoals:\n" + goals.map(g => `- ${g}`).join("\n") : "",
    "",
    "## Execution Direction",
    brief.recommendedLane ? `Lane: ${brief.recommendedLane}` : "",
    mockup.title ? `Mockup: ${mockup.title} — ${mockup.summary || ""}` : "",
    prototype.title ? `Prototype: ${prototype.title} — ${prototype.summary || ""}` : "",
    doc.title ? `Pack document: ${doc.title}` : "",
    "",
    "## Output Summary",
    smoke.summary || "",
    successCriteria.length ? "\nSuccess criteria:\n" + successCriteria.map(c => `- ${c}`).join("\n") : "",
    "",
    "## Approval Trail",
    approvals.brief?.status ? `Brief: ${approvals.brief.status}${approvals.brief.decidedBy ? " by " + approvals.brief.decidedBy : ""}${approvals.brief.decidedAt ? " at " + approvals.brief.decidedAt : ""}` : "",
    approvals.pack?.status ? `Pack: ${approvals.pack.status}${approvals.pack.decidedBy ? " by " + approvals.pack.decidedBy : ""}${approvals.pack.decidedAt ? " at " + approvals.pack.decidedAt : ""}` : "",
    history.length ? "\nState history:\n" + history.map(e => `  ${mcRunStateLabel(e.state)} — ${e.reason || ""} (${e.actor || ""})`).join("\n") : ""
  ];

  return lines.filter(l => l !== null && l !== undefined).join("\n").trim();
}

function mcRenderDecisionPack(run) {
  if (!run) return "";
  const brief = run.brief || {};
  const request = run.request || {};
  const normalized = request.normalized || {};
  const routing = request.routing || {};
  const assumptions = Array.isArray(request.assumptions) ? request.assumptions : [];
  const risks = Array.isArray(run.risks) ? run.risks : [];
  const intake = run.intake || {};
  const artifacts = run.artifacts || {};
  const doc = artifacts.doc || {};
  const smoke = artifacts.smoke || {};
  const mockup = artifacts.mockup || {};
  const prototype = artifacts.prototype || {};
  const handoff = run.handoff || {};
  const approvals = run.approvals || {};
  const history = Array.isArray(run.stateHistory) ? run.stateHistory : [];
  const constraints = Array.isArray(brief.constraints) ? brief.constraints : [];
  const goals = Array.isArray(brief.goals) ? brief.goals : [];
  const phasedPlan = Array.isArray(brief.phasedPlan) ? brief.phasedPlan : [];
  const successCriteria = Array.isArray(brief.successCriteria) ? brief.successCriteria : [];
  const smokeChecks = Array.isArray(smoke.checks) ? smoke.checks : [];
  const docSections = Array.isArray(doc.sections) ? doc.sections : [];
  const runState = mcRunStateLabel(run.state);
  const isCompleted = run.state === "completed";

  const section = (title, content) =>
    content ? `<div class="dp-section"><div class="dp-section-title">${escapeHtml(title)}</div><div class="dp-section-body">${content}</div></div>` : "";

  const chips = (items) =>
    items.length ? `<div class="dp-chips">${items.map(i => `<span class="dp-chip">${escapeHtml(i)}</span>`).join("")}</div>` : "";

  const list = (items) =>
    items.length ? `<ul class="dp-list">${items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : "";

  const ol = (items) =>
    items.length ? `<ol class="dp-list">${items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ol>` : "";

  const requestSummary = [
    intake.goal || normalized.goal || run.idea || "",
    normalized.scopeSummary ? `<div class="dp-meta-line">${escapeHtml(normalized.scopeSummary)}</div>` : ""
  ].filter(Boolean).join("");

  const understoodContent = [
    brief.quickVerdict ? `<p>${escapeHtml(brief.quickVerdict)}</p>` : "",
    brief.decisionNote ? `<p class="dp-sub">${escapeHtml(brief.decisionNote)}</p>` : ""
  ].filter(Boolean).join("");

  const audienceContent = [
    brief.audience || normalized.audience ? `<strong>${escapeHtml(brief.audience || normalized.audience)}</strong>` : "",
    intake.context ? `<p class="dp-sub">${escapeHtml(intake.context)}</p>` : "",
    brief.likelyUserValue ? `<p class="dp-sub">${escapeHtml(brief.likelyUserValue)}</p>` : ""
  ].filter(Boolean).join("");

  const planContent = phasedPlan.length ? ol(phasedPlan) : "";

  const blockersContent = [
    risks.length ? `<div class="dp-sub-title">Risks</div>${list(risks)}` : "",
    constraints.length ? `<div class="dp-sub-title">Constraints</div>${list(constraints)}` : "",
    intake.nonGoals ? `<div class="dp-sub-title">Non-goals</div><p class="dp-sub">${escapeHtml(intake.nonGoals)}</p>` : ""
  ].filter(Boolean).join("");

  const nextMoveContent = [
    brief.recommendedDirection ? `<p>${escapeHtml(brief.recommendedDirection)}</p>` : "",
    routing.reason ? `<p class="dp-sub">${escapeHtml(routing.reason)}</p>` : "",
    goals.length ? `<div class="dp-sub-title">Goals</div>${list(goals)}` : ""
  ].filter(Boolean).join("");

  const executionContent = [
    brief.recommendedLane ? `<div class="dp-kv"><span>Lane</span><strong>${escapeHtml(brief.recommendedLane)}</strong></div>` : "",
    mockup.title ? `<div class="dp-kv"><span>Mockup</span><strong>${escapeHtml(mockup.title)}</strong>${mockup.summary ? `<span class="dp-sub">${escapeHtml(mockup.summary)}</span>` : ""}</div>` : "",
    prototype.title ? `<div class="dp-kv"><span>Prototype</span><strong>${escapeHtml(prototype.title)}</strong>${prototype.summary ? `<span class="dp-sub">${escapeHtml(prototype.summary)}</span>` : ""}</div>` : "",
    doc.title ? `<div class="dp-kv"><span>Pack doc</span><strong>${escapeHtml(doc.title)}</strong></div>` : "",
    docSections.length ? docSections.map(s => `<div class="dp-sub-title">${escapeHtml(s.title)}</div>${list(Array.isArray(s.items) ? s.items : [])}`).join("") : ""
  ].filter(Boolean).join("");

  const outputContent = [
    smoke.summary ? `<p>${escapeHtml(smoke.summary)}</p>` : "",
    smokeChecks.length ? `<div class="dp-checks">${smokeChecks.map(c => `<div class="dp-check dp-check-${escapeHtml(c.result || "watch")}"><span>${escapeHtml(c.label)}</span><strong>${escapeHtml(c.result)}</strong>${c.note ? `<span class="dp-sub">${escapeHtml(c.note)}</span>` : ""}</div>`).join("")}</div>` : "",
    successCriteria.length ? `<div class="dp-sub-title">Success criteria</div>${list(successCriteria)}` : ""
  ].filter(Boolean).join("");

  const approvalBriefLine = approvals.brief?.status ? `Brief — ${escapeHtml(approvals.brief.status)}${approvals.brief.decidedBy ? ` by ${escapeHtml(approvals.brief.decidedBy)}` : ""}${approvals.brief.decidedAt ? ` · ${escapeHtml(String(approvals.brief.decidedAt).slice(0, 10))}` : ""}` : "";
  const approvalPackLine = approvals.pack?.status ? `Pack — ${escapeHtml(approvals.pack.status)}${approvals.pack.decidedBy ? ` by ${escapeHtml(approvals.pack.decidedBy)}` : ""}${approvals.pack.decidedAt ? ` · ${escapeHtml(String(approvals.pack.decidedAt).slice(0, 10))}` : ""}` : "";
  const trailItems = [approvalBriefLine, approvalPackLine, ...history.slice(-4).map(e => `${escapeHtml(mcRunStateLabel(e.state))} — ${escapeHtml(e.reason || "")} (${escapeHtml(e.actor || "")})`).filter(Boolean)];
  const trailContent = trailItems.length ? `<ul class="dp-trail">${trailItems.map(t => `<li>${t}</li>`).join("")}</ul>` : "";

  return `
    <div class="decision-pack" id="dp-${escapeHtml(run.id || "")}">
      <div class="dp-header">
        <div class="dp-title">${escapeHtml(brief.title || run.title || "Decision Pack")}</div>
        <div class="dp-meta">
          <span class="dp-state dp-state-${escapeHtml(run.state || "")}">${escapeHtml(runState)}</span>
          ${isCompleted ? `<span class="dp-complete-badge">Complete</span>` : ""}
          <button class="dp-copy-btn ops-action-btn ops-action-btn-secondary" type="button" data-action="copy-pack" data-run-id="${escapeHtml(run.id || "")}">Copy pack</button>
        </div>
      </div>
      <div class="dp-body">
        ${section("Request Summary", requestSummary)}
        ${section("What ATEAM Understood", understoodContent)}
        ${section("Audience / Context", audienceContent)}
        ${assumptions.length ? section("Assumptions", chips(assumptions)) : ""}
        ${planContent ? section("Proposed Plan", planContent) : ""}
        ${blockersContent ? section("Blockers / Risks", blockersContent) : ""}
        ${nextMoveContent ? section("Recommended Next Move", nextMoveContent) : ""}
        ${executionContent ? section("Execution Direction", executionContent) : ""}
        ${trailContent ? section("Approval Trail", trailContent) : ""}
        ${outputContent ? section("Output Summary", outputContent) : ""}
      </div>
    </div>`;
}

function renderProjectsFormOptions(selectedProjectId) {
  const portfolio = mcProjectPortfolio();
  if (projectsWorkProject) {
    projectsWorkProject.innerHTML = portfolio.map(
      (project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}${project.workflowRunId ? " [workflow]" : ""}</option>`
    ).join("");
    projectsWorkProject.value = selectedProjectId || portfolio[0]?.id || "";
  }

  if (projectsWorkOwner) {
    const locked = new Set(OFFICE2_LOCKED_AGENT_IDS);
    projectsWorkOwner.innerHTML = OFFICE2_AGENT_DIRECTORY.filter((a) => locked.has(a.id)).map(
      (agent) => `<option value="${escapeHtml(agent.id)}">${escapeHtml(agent.role || agent.id)} — ${escapeHtml(agent.displayName || agent.id)}</option>`
    ).join("");
  }
}

async function renderProjectsPage({ force = false } = {}) {
  if (!projectsView || projectsView.classList.contains("hidden")) return;
  const overview = await mcLoadOverview({ force, includeSpeech: false });
  const portfolio = mcProjectPortfolio();
  const workflowProjectCount = portfolio.filter((project) => Boolean(project.workflowRunId)).length;
  const selectedProject = mcProjectById(missionControlState.projects.selectedId) || portfolio[0] || null;
  if (selectedProject) missionControlState.projects.selectedId = selectedProject.id;
  renderProjectsFormOptions(missionControlState.projects.selectedId);
  if (projectsWorkOwner && selectedProject?.ownerAgentId) {
    projectsWorkOwner.value = selectedProject.ownerAgentId;
  }

  const workItems = overview.workItems || [];
  const portfolioRows = portfolio.map((project) => {
    const items = mcProjectItems(project, workItems);
    return { project, items, status: mcProjectStatus(items) };
  });
  const blockedCount = portfolioRows.reduce((sum, row) => sum + row.items.filter((item) => mcBlockedWorkItem(item)).length, 0);
  const shipCount = portfolioRows.reduce((sum, row) => sum + row.items.filter((item) => normalizeFactoryStage(item.stage) === "ship").length, 0);
  const linkedWorkCount = portfolioRows.reduce((sum, row) => sum + row.items.length, 0);
  const activeRow = portfolioRows.find((row) => row.project.id === missionControlState.projects.selectedId) || portfolioRows[0] || null;

  if (projectsSummary) {
    projectsSummary.textContent = linkedWorkCount
      ? `${linkedWorkCount} linked job${linkedWorkCount === 1 ? "" : "s"} are currently mapped across ${portfolioRows.length} initiatives${workflowProjectCount ? `, including ${workflowProjectCount} workflow-generated project${workflowProjectCount === 1 ? "" : "s"}` : ""}.`
      : workflowProjectCount
        ? `${workflowProjectCount} workflow-generated project${workflowProjectCount === 1 ? "" : "s"} are ready for operator review, but no linked jobs have been created yet.`
        : "No linked jobs yet. Create one to seed the project ledger.";
  }
  if (projectsMetricCount) projectsMetricCount.textContent = String(portfolioRows.length);
  if (projectsMetricWork) projectsMetricWork.textContent = String(linkedWorkCount);
  if (projectsMetricBlocked) projectsMetricBlocked.textContent = String(blockedCount);
  if (projectsMetricShip) projectsMetricShip.textContent = String(shipCount);

  if (projectsPortfolioList) {
    projectsPortfolioList.innerHTML = portfolioRows
      .map(({ project, items, status }) => {
        const linkedLabel = `${items.length} linked job${items.length === 1 ? "" : "s"}`;
        const linkedActionLabel = items.length ? `Open ${linkedLabel}` : "No linked jobs";
        const docCount = Array.isArray(project.docIds) ? project.docIds.length : 0;
        const firstDocId = docCount ? project.docIds[0] : "";
        return `
          <article
            class="ops-card ops-card-interactive ${project.id === missionControlState.projects.selectedId ? "ops-card-active" : ""}"
            data-project-id="${escapeHtml(project.id)}"
            tabindex="0">
            <div class="ops-card-head">
              <div class="ops-card-title">${escapeHtml(project.name)}</div>
              <div class="ops-card-meta">${mcStageBadge(status.label)}</div>
            </div>
            <div class="ops-card-copy">${escapeHtml(project.summary)}</div>
            <div class="ops-inline-meta">
              <span>${escapeHtml(mcCanonicalName(project.ownerAgentId) || project.ownerAgentId)}</span>
              <span>${escapeHtml(linkedLabel)}</span>
              ${project.workflowRunId ? `<span>${escapeHtml(mcRunStateLabel(project?.workflow?.state || project?.workflow?.phase || "planning"))}</span>` : ""}
              ${project.workflowRunId && project?.workflow?.approvalStatus === "pending" ? `<span class="ops-badge-pending">Awaiting decision</span>` : ""}
            </div>
            <div class="ops-action-row ops-action-row-compact">
              <button class="ops-action-btn ops-action-btn-secondary" type="button" data-action="select-project" data-project-id="${escapeHtml(project.id)}" data-scroll-target="detail">Open overview</button>
              <button class="ops-action-btn ops-action-btn-secondary" type="button" data-action="open-project-ledger" data-project-id="${escapeHtml(project.id)}"${items.length ? "" : " disabled"}>${escapeHtml(linkedActionLabel)}</button>
              ${firstDocId
                ? `<button class="ops-action-btn ops-action-btn-secondary" type="button" data-action="open-doc" data-doc-id="${escapeHtml(firstDocId)}" data-project-id="${escapeHtml(project.id)}">Open ${escapeHtml(String(docCount))} doc${docCount === 1 ? "" : "s"}</button>`
                : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (projectsDetail) {
    if (!activeRow) {
      projectsDetail.innerHTML = mcEmptyHtml("No initiative selected.");
    } else {
      const project = activeRow.project;
      const docs = (project.docIds || []).map((docId) => ({ id: docId, title: mcDocTitle(docId) }));
      const stageSummary = ["backlog", "build", "qa", "review", "ship"]
        .map((stage) => {
          const count = activeRow.items.filter((item) => normalizeFactoryStage(item.stage) === stage).length;
          return count ? `${stage.toUpperCase()}: ${count}` : "";
        })
        .filter(Boolean)
        .join(" | ");
      const docChips = docs.length
        ? docs
            .map(
              (doc) =>
                `<button class="ops-chip-btn" type="button" data-action="open-doc" data-doc-id="${escapeHtml(doc.id)}" data-project-id="${escapeHtml(project.id)}">${escapeHtml(doc.title)}</button>`
            )
            .join("")
        : `<span class="ops-inline-empty">None</span>`;
      const wf = project.workflow || {};
      const wfState = mcRunStateLabel(wf.state || wf.phase || "planning");
      const wfApprovalPending = wf.approvalStatus === "pending";
      const wfAssumptions = Array.isArray(wf.assumptions) ? wf.assumptions : [];
      const wfPlan = Array.isArray(wf.phasedPlan) ? wf.phasedPlan : [];
      const wfHistory = Array.isArray(wf.stateHistory) ? wf.stateHistory : [];
      const wfHasOutput = wf.prototypeTitle || wf.mockupTitle || wf.smokeSummary;

      const workflowDetails = project.workflowRunId
        ? `
            <div class="ops-key-value-row"><span>State</span><strong>${escapeHtml(wfState)}</strong>${wfApprovalPending ? ' <span class="ops-badge-pending">Decision needed</span>' : ""}</div>
            <div class="ops-key-value-row"><span>Lane</span><strong>${escapeHtml(wf.recommendedLane || "Not assigned")}</strong></div>
            ${wf.goal ? `<div class="ops-key-value-row"><span>Goal</span><strong>${escapeHtml(wf.goal.slice(0, 120))}</strong></div>` : ""}
            ${wf.briefSummary ? `<div class="ops-key-value-row ops-key-value-row-stack"><span>Brief</span><div class="ops-copy-block">${escapeHtml(wf.briefSummary)}</div></div>` : ""}
            ${wf.audience ? `<div class="ops-key-value-row"><span>Audience</span><strong>${escapeHtml(wf.audience)}</strong></div>` : ""}
            ${wfAssumptions.length ? `
              <div class="ops-key-value-row ops-key-value-row-stack">
                <span>Assumptions</span>
                <div class="ops-chip-row">${wfAssumptions.map((a) => `<span class="ops-chip-btn">${escapeHtml(a)}</span>`).join("")}</div>
              </div>` : ""}
            ${wfPlan.length ? `
              <div class="ops-key-value-row ops-key-value-row-stack">
                <span>Plan</span>
                <ol class="ops-ordered-list">${wfPlan.slice(0, 4).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
              </div>` : ""}
            ${wfApprovalPending && wf.approvalId ? `
              <div class="ops-key-value-row">
                <span>Approval gate</span>
                <button class="ops-action-btn" type="button" data-action="approve-approval" data-approval-id="${escapeHtml(wf.approvalId)}">Approve brief</button>
                <button class="ops-action-btn ops-action-btn-secondary" type="button" data-action="reject-approval" data-approval-id="${escapeHtml(wf.approvalId)}">Reject</button>
              </div>` : ""}
            ${wfHasOutput ? `
              <div class="ops-key-value-row"><span>Pack output</span><strong>${escapeHtml(wf.prototypeTitle || wf.mockupTitle || "Generated")}</strong></div>
              ${wf.smokeSummary ? `<div class="ops-key-value-row ops-key-value-row-stack"><span>Pack summary</span><div class="ops-copy-block">${escapeHtml(wf.smokeSummary)}</div></div>` : ""}
            ` : ""}
            ${wfHistory.length ? `
              <div class="ops-key-value-row ops-key-value-row-stack">
                <span>History</span>
                <div class="ops-history-list">${wfHistory.map((entry) => `
                  <div class="ops-history-entry">
                    <span class="ops-history-state">${escapeHtml(mcRunStateLabel(entry.state))}</span>
                    ${entry.reason ? `<span class="ops-history-reason">${escapeHtml(entry.reason)}</span>` : ""}
                    ${entry.actor ? `<span class="ops-history-actor">${escapeHtml(entry.actor)}</span>` : ""}
                  </div>`).join("")}
                </div>
              </div>` : ""}
          `
        : "";
      projectsDetail.innerHTML = `
        <article class="ops-card">
          <div class="ops-card-head">
            <div class="ops-card-title">${escapeHtml(project.name)}</div>
            <div class="ops-card-meta">${mcStageBadge(activeRow.status.label)}</div>
          </div>
          <div class="ops-card-copy">${escapeHtml(project.outcome)}</div>
          <div class="ops-key-value-list">
            <div class="ops-key-value-row"><span>Owner</span><strong>${escapeHtml(mcCanonicalName(project.ownerAgentId) || project.ownerAgentId)}</strong></div>
            <div class="ops-key-value-row ops-key-value-row-stack">
              <span>Linked Docs</span>
              <div class="ops-chip-row">${docChips}</div>
            </div>
            <div class="ops-key-value-row"><span>Stage Mix</span><strong>${escapeHtml(stageSummary || "No linked jobs yet")}</strong></div>
            ${workflowDetails}
          </div>
          <div class="ops-action-row ops-action-row-compact">
            <button class="ops-action-btn ops-action-btn-secondary" type="button" data-action="open-project-ledger" data-project-id="${escapeHtml(project.id)}">View linked jobs</button>
          </div>
        </article>
      `;
    }
  }

  if (projectsLedger) {
    if (!activeRow || (!activeRow.items.length && !activeRow.project?.workflowRunId)) {
      projectsLedger.innerHTML = mcEmptyHtml("No jobs linked to this initiative yet.");
    } else {
      // Look up full run for Decision Pack rendering
      const activeRunForPack = activeRow.project?.workflowRunId
        ? (missionControlState.overview.workflowRuns || []).find(r => r.id === activeRow.project.workflowRunId) || null
        : null;
      const hasArtifacts = activeRunForPack?.artifacts && (
        activeRunForPack.artifacts.mockup?.title ||
        activeRunForPack.artifacts.prototype?.title ||
        activeRunForPack.artifacts.smoke?.summary
      );
      const workflowCard = activeRow.project?.workflowRunId
        ? (hasArtifacts
            ? mcRenderDecisionPack(activeRunForPack)
            : `<div class="ops-card dp-pending-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">Decision Pack</div>
                  <div class="ops-card-meta">${escapeHtml(mcRunStateLabel(activeRow.project?.workflow?.state || "planning").toUpperCase())}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(activeRow.project?.workflow?.smokeSummary || "Pack not generated yet. Approve the brief to generate it.")}</div>
              </div>`)
        : "";
      const itemCards = activeRow.items
        .slice()
        .sort((a, b) => String(b?.createdTs || "").localeCompare(String(a?.createdTs || "")))
        .map(
          (item) => {
            const latestTimeline = Array.isArray(item?.timeline) && item.timeline.length
              ? item.timeline[item.timeline.length - 1]
              : null;
            return `
            <article class="ops-card">
              <div class="ops-card-head">
                <div class="ops-card-title">${escapeHtml(item.title || item.id)}</div>
                <div class="ops-card-meta">${mcStageBadge(item.stage)}</div>
              </div>
              <div class="ops-card-copy">${escapeHtml(item.objective || "No objective captured yet.")}</div>
              <div class="ops-inline-meta">
                <span>${escapeHtml(formatRelativeTime(item.createdTs) || "New")}</span>
                <span>${escapeHtml(item.ownerAgentId ? mcDisplayName(item.ownerAgentId) : "Unassigned")}</span>
                <span>${escapeHtml(item.blockerReason || item.waitingReason || item.jobStatus || "")}</span>
              </div>
              ${latestTimeline ? `<div class="ops-card-copy">${escapeHtml(latestTimeline.message || "Recent job activity")}</div>` : ""}
              <div class="ops-action-row">
                <button class="ops-action-btn" type="button" data-action="advance-work-item" data-item-id="${escapeHtml(item.id)}">Advance</button>
              </div>
            </article>
          `;
          }
        )
        .join("");
      projectsLedger.innerHTML = `${workflowCard}${itemCards}`;
    }
  }
}

async function mcLoadDocs({ force = false } = {}) {
  const hasDocs = Array.isArray(missionControlState.docs.items) && missionControlState.docs.items.length;
  if (hasDocs && !force) return missionControlState.docs.items;
  const res = await apiRequest("/api/docs");
  const docs = Array.isArray(res?.docs) ? res.docs : [];
  missionControlState.docs.items = docs;
  if (!missionControlState.docs.selectedId && docs[0]?.id) {
    missionControlState.docs.selectedId = docs[0].id;
  }
  return docs;
}

function mcInvalidateDocs() {
  missionControlState.docs.items = [];
  missionControlState.docs.detailById = {};
}

async function mcLoadDocDetail(docId, { force = false } = {}) {
  const safeId = String(docId || "").trim();
  if (!safeId) return null;
  if (!force && missionControlState.docs.detailById?.[safeId]) {
    return missionControlState.docs.detailById[safeId];
  }
  const res = await apiRequest(`/api/docs/${encodeURIComponent(safeId)}`);
  const doc = res?.doc || null;
  if (doc) missionControlState.docs.detailById[safeId] = doc;
  return doc;
}

function renderDocsList(filteredDocs) {
  if (!docsList) return;
  docsList.innerHTML = filteredDocs.length
    ? filteredDocs
        .map(
          (doc) => `
            <article
              class="ops-card ops-card-interactive ${doc.id === missionControlState.docs.selectedId ? "ops-card-active" : ""}"
              data-doc-id="${escapeHtml(doc.id)}"
              role="button"
              tabindex="0"
              aria-pressed="${doc.id === missionControlState.docs.selectedId ? "true" : "false"}">
              <div class="ops-card-head">
                <div class="ops-card-title">${escapeHtml(doc.title)}</div>
                <div class="ops-card-meta">${escapeHtml(doc.category)}</div>
              </div>
              <div class="ops-card-copy">${escapeHtml(doc.summary || doc.excerpt || "")}</div>
              <div class="ops-inline-meta">
                <span>${escapeHtml(doc.relativePath || "")}</span>
                <span>${escapeHtml(formatRelativeTime(doc.updatedTs) || "")}</span>
              </div>
            </article>
          `
        )
        .join("")
    : mcEmptyHtml("No docs match that search.");
}

function renderDocsDetail(doc) {
  if (docsDetailTitle) docsDetailTitle.textContent = doc?.title || "Select a document";
  if (docsDetailMeta) {
    docsDetailMeta.textContent = doc
      ? `${doc.relativePath || ""} | ${formatRelativeTime(doc.updatedTs) || "updated"}`
      : "Preview will appear here.";
  }
  if (docsDetailBody) {
    docsDetailBody.innerHTML = doc
      ? renderMiniMarkdown(String(doc.body || "").slice(0, 24000))
      : mcEmptyHtml("Choose a document from the library.");
  }
}

async function renderDocsPage({ force = false } = {}) {
  if (!docsView || docsView.classList.contains("hidden")) return;
  let docs = [];
  try {
    docs = await mcLoadDocs({ force });
  } catch {
    if (docsSummary) docsSummary.textContent = "Docs could not be loaded from the active runtime.";
    if (docsList) docsList.innerHTML = mcEmptyHtml("Docs are unavailable right now.");
    renderDocsDetail(null);
    return;
  }
  const filter = String(missionControlState.docs.filter || "").trim().toLowerCase();
  if (docsSearchInput && docsSearchInput.value !== missionControlState.docs.filter) {
    docsSearchInput.value = missionControlState.docs.filter;
  }
  const filteredDocs = docs.filter((doc) => {
    if (!filter) return true;
    const haystack = `${doc.title} ${doc.category} ${doc.summary} ${doc.relativePath} ${doc.excerpt}`.toLowerCase();
    return haystack.includes(filter);
  });

  if (!filteredDocs.some((doc) => doc.id === missionControlState.docs.selectedId)) {
    missionControlState.docs.selectedId = filteredDocs[0]?.id || "";
  }

  if (docsSummary) {
    docsSummary.textContent = `${docs.length} curated document${docs.length === 1 ? "" : "s"} are indexed for the operating core of ATEAM.`;
  }
  if (docsMetricCount) docsMetricCount.textContent = String(docs.length);
  if (docsMetricArchitecture) docsMetricArchitecture.textContent = String(docs.filter((doc) => doc.category === "architecture").length);
  if (docsMetricPlatform) docsMetricPlatform.textContent = String(docs.filter((doc) => doc.category === "platform").length);
  if (docsMetricOperations) docsMetricOperations.textContent = String(docs.filter((doc) => doc.category === "operations" || doc.category === "handover" || doc.category === "integrations").length);

  renderDocsList(filteredDocs);
  if (!missionControlState.docs.selectedId) {
    renderDocsDetail(null);
    return;
  }
  const detail = await mcLoadDocDetail(missionControlState.docs.selectedId, { force });
  renderDocsDetail(detail);
}

function buildPeopleContacts(events = []) {
  const lastSeenBySpeaker = {};
  for (const event of events) {
    const type = String(event?.type || "");
    if (type !== "talk_turn_committed") continue;
    const speakerId = getEffectiveSpeakerId(event);
    lastSeenBySpeaker[speakerId] = String(event?.timestamp || "");
  }

  const analyticsRows = Array.isArray(speakerAnalyticsState.rows) ? speakerAnalyticsState.rows : [];
  const rows = analyticsRows.length
    ? analyticsRows
    : SPEAKER_OPTIONS.filter((option) => option.id !== "ai_podcast").map((option) => ({
        speakerId: option.id,
        speakerLabel: speakerLabelById(option.id),
        turns: 0,
        measuredTalkMs: 0,
        rapidSwitchCount: 0
      }));

  return rows
    .filter((row) => row.speakerId !== "ai_podcast")
    .map((row) => ({
      speakerId: row.speakerId,
      speakerLabel: row.speakerLabel,
      turns: Number(row.turns || 0),
      measuredTalkMs: Number(row.measuredTalkMs || 0),
      rapidSwitchCount: Number(row.rapidSwitchCount || 0),
      lastSeen: lastSeenBySpeaker[row.speakerId] || ""
    }))
    .sort((a, b) => b.turns - a.turns || String(b.lastSeen || "").localeCompare(String(a.lastSeen || "")));
}

function buildPeopleHandoffs(contacts = []) {
  return contacts
    .filter((contact) => contact.turns > 0 || contact.speakerId === "unknown")
    .slice(0, 5)
    .map((contact) => {
      let ownerAgentId = "henry";
      let note = "Chief of Staff should keep context tight and route the next action.";
      if (contact.speakerId === "unknown") {
        ownerAgentId = "scout";
        note = "Identity or intent is still fuzzy. Scout should clarify before build starts.";
      } else if (contact.turns >= 3) {
        ownerAgentId = "quill";
        note = "There is enough conversational signal to turn into a clearer brief or summary.";
      }
      return {
        speakerLabel: contact.speakerLabel,
        ownerAgentId,
        note,
        turns: contact.turns
      };
    });
}

function renderPeoplePage() {
  if (!peopleView || peopleView.classList.contains("hidden")) return;
  const contacts = buildPeopleContacts(timelineState.events || []);
  const locked = new Set(OFFICE2_LOCKED_AGENT_IDS);
  const operators = OFFICE2_AGENT_DIRECTORY.filter((agent) => locked.has(agent.id));
  const activeContacts = contacts.filter((contact) => contact.turns > 0);
  const handoffs = buildPeopleHandoffs(contacts);
  const derived = missionControlState.office2?.derivedStatus || {};

  if (peopleSummary) {
    peopleSummary.textContent = activeContacts.length
      ? `${activeContacts.length} speaker${activeContacts.length === 1 ? "" : "s"} have recent talk activity, and ${handoffs.length} useful handoff${handoffs.length === 1 ? "" : "s"} can be made from that context.`
      : "No conversation pressure detected yet. The team is ready when the next speaker shows up.";
  }
  if (peopleMetricContacts) peopleMetricContacts.textContent = String(contacts.length);
  if (peopleMetricOperators) peopleMetricOperators.textContent = String(operators.length);
  if (peopleMetricActive) peopleMetricActive.textContent = String(activeContacts.length);
  if (peopleMetricHandoffs) peopleMetricHandoffs.textContent = String(handoffs.length);

  if (peopleContactsList) {
    peopleContactsList.innerHTML = contacts.length
      ? contacts
          .map(
            (contact) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(contact.speakerLabel)}</div>
                  <div class="ops-card-meta">${escapeHtml(`${contact.turns} turn${contact.turns === 1 ? "" : "s"}`)}</div>
                </div>
                <div class="ops-inline-meta">
                  <span>${escapeHtml(contact.lastSeen ? formatRelativeTime(contact.lastSeen) : "No recent turn")}</span>
                  <span>${escapeHtml(contact.rapidSwitchCount ? `${contact.rapidSwitchCount} rapid switch${contact.rapidSwitchCount === 1 ? "" : "es"}` : "Stable pace")}</span>
                </div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No conversation contacts yet.");
  }

  if (peopleOperatorsList) {
    peopleOperatorsList.innerHTML = operators
      .map((agent) => {
        const status = String(derived?.[agent.id]?.status || "idle");
        return `
          <article class="ops-card">
            <div class="ops-card-head">
              <div class="ops-card-title">${escapeHtml(agent.role || agent.id)}</div>
              <div class="ops-card-meta">${mcStageBadge(status)}</div>
            </div>
            <div class="ops-card-copy">${escapeHtml(agent.displayName || "")}</div>
            <div class="ops-inline-meta">
              <span>${escapeHtml(agent.lane || "")}</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (peopleHandoffList) {
    peopleHandoffList.innerHTML = handoffs.length
      ? handoffs
          .map(
            (handoff) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(handoff.speakerLabel)}</div>
                  <div class="ops-card-meta">${escapeHtml(mcDisplayName(handoff.ownerAgentId) || handoff.ownerAgentId)}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(handoff.note)}</div>
                <div class="ops-inline-meta">
                  <span>${escapeHtml(`${handoff.turns} turn${handoff.turns === 1 ? "" : "s"}`)}</span>
                  <span>${escapeHtml(mcCanonicalName(handoff.ownerAgentId) || handoff.ownerAgentId)}</span>
                </div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No handoffs recommended yet.");
  }
}

async function renderSystemPage({ force = false } = {}) {
  if (!systemView || systemView.classList.contains("hidden")) return;
  const overview = await mcLoadOverview({ force, includeSpeech: true });
  const health = overview.health || {};
  const config = health.config || {};
  const tools = Array.isArray(health.tools) ? health.tools : [];
  const approvals = overview.approvals || [];
  const workItems = overview.workItems || [];
  const content = overview.content || mcOverviewContentFallback();
  const alerts = [];

  if (!config?.voice?.ttsConfigured) alerts.push("Voice synthesis is not configured, so browser fallback is the active path.");
  if ((approvals || []).some((item) => String(item?.status || "").toLowerCase() === "pending")) alerts.push("There are pending approvals waiting on a human decision.");
  if ((workItems || []).some((item) => mcBlockedWorkItem(item))) alerts.push("At least one delivery item is blocked or marked high risk.");
  if (!tools.length) alerts.push("No tools were reported by /health.");
  if (!alerts.length) alerts.push("No urgent system alerts detected.");

  if (systemSummary) {
    systemSummary.textContent = health?.ok
      ? `Local server is responding. Talk model: ${config?.llm?.talkPrimary || "unknown"} | Dashboard model: ${config?.llm?.dashboardPrimary || "unknown"}.`
      : "Health data could not be loaded from the active runtime.";
  }
  if (systemMetricMode) systemMetricMode.textContent = String(health.mode || "unknown");
  if (systemMetricStorage) systemMetricStorage.textContent = String(config?.storage?.backend || "unknown");
  if (systemMetricVoice) systemMetricVoice.textContent = config?.voice?.ttsConfigured ? "Ready" : "Fallback";
  if (systemMetricTools) systemMetricTools.textContent = String(tools.length);

  if (systemRuntimeCards) {
    systemRuntimeCards.innerHTML = [
      {
        title: "LLM Routing",
        copy: `Talk: ${config?.llm?.talkPrimary || "n/a"} -> ${config?.llm?.talkFallback || "n/a"} | Dashboard: ${config?.llm?.dashboardPrimary || "n/a"} -> ${config?.llm?.dashboardFallback || "n/a"}`
      },
      {
        title: "Voice",
        copy: `${config?.voice?.provider || "unknown"} | profiles: ${(config?.voice?.availableProfiles || []).join(", ") || "none"}`
      },
      {
        title: "Scope",
        copy: `Auth: ${config?.auth?.mode || "unknown"} | Storage: ${config?.storage?.backend || "unknown"}`
      }
    ]
      .map(
        (card) => `
          <article class="ops-card">
            <div class="ops-card-head"><div class="ops-card-title">${escapeHtml(card.title)}</div></div>
            <div class="ops-card-copy">${escapeHtml(card.copy)}</div>
          </article>
        `
      )
      .join("");
  }

  if (systemCountsList) {
    const counts = [
      { label: "Approvals", value: approvals.length },
      { label: "Jobs", value: workItems.length },
      { label: "Signals", value: (content.signals || []).length },
      { label: "Topics", value: (content.topics || []).length },
      { label: "Drafts", value: (content.drafts || []).length },
      { label: "Speech Sessions", value: (overview.speechSessions || []).length },
      { label: "Memory Entries", value: (loadMemoryStore().entries || []).length }
    ];
    systemCountsList.innerHTML = counts
      .map(
        (row) => `
          <article class="ops-card">
            <div class="ops-card-head">
              <div class="ops-card-title">${escapeHtml(row.label)}</div>
              <div class="ops-card-meta">${escapeHtml(String(row.value))}</div>
            </div>
          </article>
        `
      )
      .join("");
  }

  if (systemToolsList) {
    systemToolsList.innerHTML = tools.length
      ? tools
          .map(
            (tool) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(tool.name || "tool")}</div>
                  <div class="ops-card-meta">${escapeHtml(tool.category || "capability")}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(tool.description || "No description available.")}</div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No tools reported.");
  }

  if (systemAlertsList) {
    systemAlertsList.innerHTML = alerts
      .map(
        (alert) => `
          <article class="ops-card">
            <div class="ops-card-copy">${escapeHtml(alert)}</div>
          </article>
        `
      )
      .join("");
  }
}

async function renderRadarPage({ force = false } = {}) {
  if (!radarView || radarView.classList.contains("hidden")) return;
  const overview = await mcLoadOverview({ force, includeSpeech: false });
  const content = overview.content || mcOverviewContentFallback();
  const signals = content.signals || [];
  const topics = content.topics || [];
  const drafts = content.drafts || [];
  const pendingDrafts = drafts.filter((draft) => draft.status === "pending_approval");
  const bySource = {};
  signals.forEach((signal) => {
    const source = String(signal.source || "Unsorted").trim() || "Unsorted";
    bySource[source] = (bySource[source] || 0) + 1;
  });
  const clusters = Object.entries(bySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

  if (radarSummary) {
    radarSummary.textContent = signals.length
      ? `${signals.length} signal${signals.length === 1 ? "" : "s"} are live. ${topics.length} topic${topics.length === 1 ? "" : "s"} have already been promoted.`
      : "No live signals yet. Use the Content page to start feeding the radar.";
  }
  if (radarMetricSignals) radarMetricSignals.textContent = String(signals.length);
  if (radarMetricTopics) radarMetricTopics.textContent = String(topics.length);
  if (radarMetricDrafts) radarMetricDrafts.textContent = String(drafts.length);
  if (radarMetricPending) radarMetricPending.textContent = String(pendingDrafts.length);

  if (radarSignalsList) {
    radarSignalsList.innerHTML = signals.length
      ? signals
          .slice()
          .sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")))
          .slice(0, 10)
          .map(
            (signal) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(signal.title || "Signal")}</div>
                  <div class="ops-card-meta">${escapeHtml(signal.source || "source unknown")}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(signal.summary || "No summary added.")}</div>
                <div class="ops-action-row">
                  <button class="ops-action-btn" type="button" data-action="promote-signal" data-signal-id="${escapeHtml(signal.id)}">Promote</button>
                </div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No radar signals yet.");
  }

  if (radarTopicsList) {
    radarTopicsList.innerHTML = topics.length
      ? topics
          .slice()
          .sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")))
          .slice(0, 10)
          .map(
            (topic) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(topic.title || "Topic")}</div>
                  <div class="ops-card-meta">${escapeHtml(`${Array.isArray(topic.signalIds) ? topic.signalIds.length : 0} signal link${Array.isArray(topic.signalIds) && topic.signalIds.length === 1 ? "" : "s"}`)}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(topic.rationale || "No rationale added.")}</div>
                <div class="ops-action-row">
                  <button class="ops-action-btn" type="button" data-action="draft-topic" data-topic-id="${escapeHtml(topic.id)}">Create Draft</button>
                </div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No promoted topics yet.");
  }

  if (radarClusters) {
    radarClusters.innerHTML = clusters.length
      ? clusters
          .slice(0, 6)
          .map(
            (cluster) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(cluster.source)}</div>
                  <div class="ops-card-meta">${escapeHtml(`${cluster.count} signal${cluster.count === 1 ? "" : "s"}`)}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(cluster.count > 1 ? "This source is showing repeated activity." : "This source is still early but worth tracking.")}</div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No opportunity clusters yet.");
  }
}

async function renderPipelinePage({ force = false } = {}) {
  if (!pipelineView || pipelineView.classList.contains("hidden")) return;
  const overview = await mcLoadOverview({ force, includeSpeech: false });
  const content = overview.content || mcOverviewContentFallback();
  const signals = content.signals || [];
  const topics = content.topics || [];
  const drafts = content.drafts || [];
  const workflowRuns = overview.workflowRuns || [];
  const approvals = (overview.approvals || []).filter((item) => String(item?.status || "").toLowerCase() === "pending");
  const workItems = overview.workItems || [];

  if (pipelineSummary) {
    pipelineSummary.textContent = `Workflow ${workflowRuns.length} | Signal ${signals.length} -> Topic ${topics.length} -> Draft ${drafts.length} -> Approval ${approvals.length} -> Delivery ${workItems.length}.`;
  }
  if (pipelineMetricSignals) pipelineMetricSignals.textContent = String(signals.length);
  if (pipelineMetricDrafts) pipelineMetricDrafts.textContent = String(drafts.filter((draft) => ["draft", "pending_approval", "approved", "scheduled"].includes(draft.status)).length);
  if (pipelineMetricApprovals) pipelineMetricApprovals.textContent = String(approvals.length);
  if (pipelineMetricDelivery) pipelineMetricDelivery.textContent = String(workItems.length);

  if (pipelineBoard) {
    const columns = [
      {
        title: "Workflow Intake",
        items: workflowRuns.slice(0, 8).map((run) => ({
          title: run?.brief?.title || run?.title || compactText(run?.idea, 80) || "Workflow run",
          meta: mcRunStateLabel(run?.state || run?.phase || "planning"),
          body: run?.brief?.summary || run?.idea || "No workflow summary yet.",
          actions: `<button class="ops-action-btn" type="button" data-action="select-project" data-project-id="${escapeHtml(String(run?.links?.projectId || `workflow_${run?.id || ""}`))}" data-scroll-target="detail">Open project</button>`
        }))
      },
      {
        title: "Signal Intake",
        items: signals.slice(0, 8).map((signal) => ({
          title: signal.title || "Signal",
          meta: signal.source || "Unsorted",
          body: signal.summary || "No summary added.",
          actions: `<button class="ops-action-btn" type="button" data-action="promote-signal" data-signal-id="${escapeHtml(signal.id)}">Promote</button>`
        }))
      },
      {
        title: "Scout Direction",
        items: topics.slice(0, 8).map((topic) => ({
          title: topic.title || "Topic",
          meta: `${Array.isArray(topic.signalIds) ? topic.signalIds.length : 0} signal link${Array.isArray(topic.signalIds) && topic.signalIds.length === 1 ? "" : "s"}`,
          body: topic.rationale || "No rationale added.",
          actions: `<button class="ops-action-btn" type="button" data-action="draft-topic" data-topic-id="${escapeHtml(topic.id)}">Create Draft</button>`
        }))
      },
      {
        title: "Drafts",
        items: drafts
          .filter((draft) => ["draft", "pending_approval", "approved", "scheduled"].includes(draft.status))
          .slice(0, 8)
          .map((draft) => ({
            title: draft.topicTitle || draft.hook || "Draft",
            meta: CONTENT_STATUS_LABELS[normalizeContentStatus(draft.status)],
            body: draft.hook || draft.insight || "No preview yet.",
            actions:
              normalizeContentStatus(draft.status) === "draft"
                ? `<button class="ops-action-btn" type="button" data-action="request-draft" data-draft-id="${escapeHtml(draft.id)}">Request Approval</button>`
                : `<button class="ops-action-btn" type="button" data-action="open-content">Open Content</button>`
          }))
      },
      {
        title: "Decision Gate",
        items: approvals.slice(0, 8).map((approval) => ({
          title: approval.summary || "Approval",
          meta: approval.policy || "policy",
          body: formatRelativeTime(approval.createdTs) || "Pending",
          actions: `
            <div class="ops-action-row">
              <button class="ops-action-btn" type="button" data-action="approve-approval" data-approval-id="${escapeHtml(approval.id)}">Approve</button>
              <button class="ops-action-btn" type="button" data-action="reject-approval" data-approval-id="${escapeHtml(approval.id)}">Reject</button>
            </div>
          `
        }))
      },
      {
        title: "Delivery",
        items: workItems.slice(0, 8).map((item) => ({
          title: item.title || item.id,
          meta: normalizeFactoryStage(item.stage).toUpperCase(),
          body: item.objective || "No objective added.",
          actions: `<button class="ops-action-btn" type="button" data-action="advance-work-item" data-item-id="${escapeHtml(item.id)}">Advance</button>`
        }))
      }
    ];

    pipelineBoard.innerHTML = columns
      .map(
        (column) => `
          <section class="pipeline-column">
            <div class="pipeline-column-head">
              <div class="pipeline-column-title">${escapeHtml(column.title)}</div>
              <div class="pipeline-column-count">${escapeHtml(String(column.items.length))}</div>
            </div>
            <div class="pipeline-column-body">
              ${
                column.items.length
                  ? column.items
                      .map(
                        (item) => `
                          <article class="ops-card pipeline-card">
                            <div class="ops-card-head">
                              <div class="ops-card-title">${escapeHtml(item.title)}</div>
                              <div class="ops-card-meta">${escapeHtml(item.meta)}</div>
                            </div>
                            <div class="ops-card-copy">${escapeHtml(item.body)}</div>
                            ${item.actions || ""}
                          </article>
                        `
                      )
                      .join("")
                  : mcEmptyHtml("Nothing in this lane.")
              }
            </div>
          </section>
        `
      )
      .join("");
  }

  if (pipelineStalledList) {
    const stalled = [
      ...workItems.filter((item) => mcBlockedWorkItem(item)),
      ...approvals.filter((approval) => String(approval?.status || "").toLowerCase() === "pending")
    ];
    pipelineStalledList.innerHTML = stalled.length
      ? stalled
          .slice(0, 8)
          .map((item) => {
            const isApproval = String(item?.id || "").startsWith("apr_");
            return `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(isApproval ? item.summary || item.id : item.title || item.id)}</div>
                  <div class="ops-card-meta">${escapeHtml(isApproval ? "Approval" : normalizeFactoryStage(item.stage).toUpperCase())}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(isApproval ? item.policy || "Pending decision" : item.objective || item.blockerReason || "Blocked job")}</div>
              </article>
            `;
          })
          .join("")
      : mcEmptyHtml("No stalled items detected.");
  }
}

async function renderTasksPage({ force = false } = {}) {
  const runsList = document.getElementById("mc-runs-list");
  if (!runsList) return;
  const overview = await mcLoadOverview({ force, includeSpeech: false });
  const runs = (overview.workflowRuns || []).slice().sort((a, b) => {
    const at = Date.parse(String(a?.createdAt || a?.created_at || "")) || 0;
    const bt = Date.parse(String(b?.createdAt || b?.created_at || "")) || 0;
    return bt - at;
  });

  const pendingApprovals = (overview.approvals || []).filter(
    (ap) => String(ap?.status || "").toLowerCase() === "pending"
  );
  const pendingByRunId = new Map();
  for (const ap of pendingApprovals) {
    const rid = String(ap?.payload?.workflowRunId || "").trim();
    if (rid) pendingByRunId.set(rid, ap);
  }

  if (!runs.length) {
    runsList.innerHTML = `<p class="mc-runs-empty">No workflow runs yet. Submit an intent from the entry view to create one.</p>`;
    return;
  }

  runsList.innerHTML = runs.slice(0, 20).map((run) => {
    const runState = String(run.state || run.phase || "planning");
    const displayState = mcRunStateLabel(runState);
    const title = run.brief?.title || run.title || compactText(run.idea, 72) || "Workflow run";
    const lane = run.brief?.recommendedLane || run.recommendedLane || "";
    const summary = run.brief?.summary || run.idea || "";
    const ts = formatRelativeTime(run.createdAt || run.createdTs) || "";
    const projectId = run.links?.projectId || `workflow_${run.id}`;
    const pendingAp = pendingByRunId.get(run.id);
    const approvalStatus = run.approvals?.brief?.status || (pendingAp ? "pending" : "");
    const ownerRole = run.ownerAgentId ? mcCanonicalName(run.ownerAgentId) : "";
    const stateClass = ["completed", "failed"].includes(runState)
      ? runState
      : ["executing", "approved"].includes(runState)
      ? "active"
      : "pending";

    return `
      <article class="mc-run-card mc-run-state-${escapeHtml(stateClass)}" data-run-id="${escapeHtml(run.id)}">
        <div class="mc-run-head">
          <div class="mc-run-title">${escapeHtml(title)}</div>
          <div class="mc-run-state-badge">${escapeHtml(displayState)}</div>
        </div>
        ${summary ? `<div class="mc-run-summary">${escapeHtml(summary.slice(0, 160))}</div>` : ""}
        <div class="mc-run-meta">
          ${ownerRole ? `<span>${escapeHtml(ownerRole)}</span>` : ""}
          ${lane ? `<span>${escapeHtml(lane)}</span>` : ""}
          ${ts ? `<span>${escapeHtml(ts)}</span>` : ""}
          ${approvalStatus === "pending" ? `<span class="mc-run-pending-badge">Awaiting approval</span>` : ""}
        </div>
        <div class="mc-run-actions">
          <button class="ops-action-btn ops-action-btn-secondary" type="button"
            data-action="select-project" data-project-id="${escapeHtml(projectId)}" data-scroll-target="detail">
            Inspect run
          </button>
          ${pendingAp ? `
            <button class="ops-action-btn" type="button"
              data-action="approve-approval" data-approval-id="${escapeHtml(pendingAp.id)}">
              Approve brief
            </button>
            <button class="ops-action-btn ops-action-btn-secondary" type="button"
              data-action="reject-approval" data-approval-id="${escapeHtml(pendingAp.id)}">
              Reject
            </button>` : ""}
        </div>
      </article>`;
  }).join("");
}

async function renderAiLabPage({ force = false } = {}) {
  if (!aiLabView || aiLabView.classList.contains("hidden")) return;
  const overview = await mcLoadOverview({ force, includeSpeech: true });
  const talkTurns = (timelineState.events || []).filter((event) => String(event?.type || "") === "talk_turn_committed");
  const recentTurns = (timelineState.events || [])
    .filter((event) => ["talk_turn_committed", "assistant_response_completed"].includes(String(event?.type || "")))
    .slice(-8)
    .reverse();
  const speechSessions = overview.speechSessions || [];
  const availableProfiles = overview.voice?.synthesis?.availableProfiles || overview.health?.config?.voice?.availableProfiles || [];

  if (aiLabSummary) {
    aiLabSummary.textContent = `Intake turns: ${talkTurns.length}. Speech sessions: ${speechSessions.length}. Voice profiles: ${availableProfiles.length}.`;
  }
  if (aiLabMetricTurns) aiLabMetricTurns.textContent = String(talkTurns.length);
  if (aiLabMetricSessions) aiLabMetricSessions.textContent = String(speechSessions.length);
  if (aiLabMetricVoices) aiLabMetricVoices.textContent = String(availableProfiles.length);
  if (aiLabMetricRecognition) aiLabMetricRecognition.textContent = state.supportsRecognition ? "Ready" : "Fallback";

  if (aiLabModules) {
    const modules = [
      {
        title: "Simple Intake",
        copy: "Type the rough request or start voice intake first, then open session details only when needed.",
        action: `<button class="ops-action-btn" type="button" data-action="open-talk-focus">Open Focus</button>`
      },
      {
        title: "Speech Clarity",
        copy: "Record sessions, analyze transcript quality, and review reflections.",
        action: `<button class="ops-action-btn" type="button" data-action="open-speech">Open Speech</button>`
      },
      {
        title: "Voice Stack",
        copy: `${overview.health?.config?.voice?.provider || "unknown"} | ${(availableProfiles || []).join(", ") || "browser fallback"}`,
        action: ""
      },
      {
        title: "Vision + Context",
        copy: state.screenStream || state.cameraStream ? "Capture is active right now." : "Screen/camera capture is available from the intake route.",
        action: `<button class="ops-action-btn" type="button" data-action="open-talk">Open Intake</button>`
      }
    ];
    aiLabModules.innerHTML = modules
      .map(
        (module) => `
          <article class="ops-card">
            <div class="ops-card-head"><div class="ops-card-title">${escapeHtml(module.title)}</div></div>
            <div class="ops-card-copy">${escapeHtml(module.copy)}</div>
            ${module.action || ""}
          </article>
        `
      )
      .join("");
  }

  if (aiLabSessions) {
    aiLabSessions.innerHTML = speechSessions.length
      ? speechSessions
          .slice(0, 8)
          .map(
            (session) => `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(session.title || "Speech session")}</div>
                  <div class="ops-card-meta">${escapeHtml(session.mode || "session")}</div>
                </div>
                <div class="ops-inline-meta">
                  <span>${escapeHtml(formatRelativeTime(session.updatedAt || session.createdAt) || "Recently")}</span>
                  <span>${escapeHtml(session.status || "saved")}</span>
                </div>
              </article>
            `
          )
          .join("")
      : mcEmptyHtml("No speech sessions yet.");
  }

  if (aiLabTurns) {
    aiLabTurns.innerHTML = recentTurns.length
      ? recentTurns
          .map((event) => {
            const type = String(event?.type || "");
            const speakerId = getEffectiveSpeakerId(event);
            const label = type === "talk_turn_committed" ? speakerLabelById(speakerId) : event?.meta?.agent || "Assistant";
            const body = type === "talk_turn_committed" ? event?.meta?.text || event?.summary || "" : event?.meta?.agentReply || event?.summary || "";
            return `
              <article class="ops-card">
                <div class="ops-card-head">
                  <div class="ops-card-title">${escapeHtml(label)}</div>
                  <div class="ops-card-meta">${escapeHtml(formatRelativeTime(event?.timestamp) || "")}</div>
                </div>
                <div class="ops-card-copy">${escapeHtml(compactText(body, 180) || "No preview available.")}</div>
              </article>
            `;
          })
          .join("")
      : mcEmptyHtml("No recent conversation turns yet.");
  }

  if (aiLabCapabilities) {
    const capabilities = [
      `Speech recognition: ${state.supportsRecognition ? "browser-supported" : "not available in this browser"}`,
      `Browser TTS: ${state.supportsTTS ? "available" : "unavailable"}`,
      `Server voice: ${overview.health?.config?.voice?.ttsConfigured ? "configured" : "fallback only"}`,
      `Timeline review mode: ${state.reviewMode ? "on" : "off"}`,
      `Vision capture: ${navigator.mediaDevices ? "available" : "browser-limited"}`
    ];
    aiLabCapabilities.innerHTML = capabilities
      .map(
        (line) => `
          <article class="ops-card">
            <div class="ops-card-copy">${escapeHtml(line)}</div>
          </article>
        `
      )
      .join("");
  }
}

async function mcHandleApprovalDecision(approvalId, decision) {
  const safeId = String(approvalId || "").trim();
  const safeDecision = String(decision || "").trim().toLowerCase();
  if (!safeId || !safeDecision) return;

  // First update the approval record itself
  const approval = await apiDecideApproval(safeId, safeDecision, { sessionId: GLOBAL_PODCAST_ID, actor: "user" });

  // If this approval is linked to a workflow run, also advance the run state
  const runId = String(approval?.payload?.workflowRunId || "").trim();
  const gate = String(approval?.payload?.gate || "brief").trim();
  if (runId) {
    try {
      const mcDecision = safeDecision === "approved" ? "approved" : safeDecision === "rejected" ? "rejected" : safeDecision;
      await apiApproveWorkflowRun(runId, { gate, decision: mcDecision, actor: "operator" });
      // If brief was approved, generate the decision pack
      if (gate === "brief" && mcDecision === "approved") {
        await apiGenerateWorkflowPack(runId, { actor: "operator" });
        await apiApproveWorkflowRun(runId, { gate: "pack", decision: "approved", actor: "operator" });
      }
    } catch (err) {
      console.warn("Workflow run advance failed:", err?.message || err);
    }
  }

  mcInvalidateOverview();
  showToast(`Approval ${safeDecision}.`, safeDecision === "approved" ? "ok" : "error");
  if (state.view === "approvals") {
    void renderApprovalsPage({ preserveSelection: true });
    return;
  }
  renderMissionControlView(state.view);
}

async function mcHandleAdvanceWorkItem(itemId) {
  const safeId = String(itemId || "").trim();
  if (!safeId) return;
  await advanceFactoryItem(safeId);
  mcInvalidateOverview();
  renderMissionControlView(state.view);
}

async function mcHandleRequestDraft(draftId) {
  const safeId = String(draftId || "").trim();
  if (!safeId) return;
  contentState.selectedDraftId = safeId;
  await handleContentDraftStatusChange("pending_approval");
  mcInvalidateOverview();
  renderMissionControlView(state.view);
}

async function handleProjectsCreateItem() {
  const title = String(projectsWorkTitle?.value || "").trim();
  const objective = String(projectsWorkObjective?.value || "").trim();
  const projectId = String(projectsWorkProject?.value || missionControlState.projects.selectedId || "").trim();
  const stage = String(projectsWorkStage?.value || "BACKLOG").trim();
  const ownerAgentId = String(projectsWorkOwner?.value || "").trim();

  if (!title) {
    showToast("Work item title is required.", "error");
    return;
  }

  try {
    await apiCreateWorkItem({
      title,
      objective,
      stage,
      ownerAgentId,
      actor: "user",
      reason: "project_board_create",
      sessionId: GLOBAL_PODCAST_ID,
      data: { projectId }
    });
    if (projectsWorkTitle) projectsWorkTitle.value = "";
    if (projectsWorkObjective) projectsWorkObjective.value = "";
    mcInvalidateOverview();
    showToast("Work item created.", "ok");
    void renderProjectsPage({ force: true });
  } catch {
    showToast("Failed to create job.", "error");
  }
}

async function handleMissionAction(action, dataset = {}) {
  const safeAction = String(action || "").trim();
  if (!safeAction) return;
  if (safeAction === "select-project") {
    await mcFocusProject(dataset.projectId, { scrollTarget: String(dataset.scrollTarget || "detail") });
    return;
  }
  if (safeAction === "open-project-ledger") {
    await mcFocusProject(dataset.projectId, { scrollTarget: "ledger" });
    return;
  }
  if (safeAction === "open-doc") {
    mcOpenDoc(dataset.docId, dataset.projectId);
    return;
  }
  if (safeAction === "approve-approval") {
    await mcHandleApprovalDecision(dataset.approvalId, "approved");
    return;
  }
  if (safeAction === "reject-approval") {
    await mcHandleApprovalDecision(dataset.approvalId, "rejected");
    return;
  }
  if (safeAction === "copy-pack") {
    const runId = String(dataset.runId || "").trim();
    const run = runId
      ? (missionControlState.overview.workflowRuns || []).find(r => r.id === runId) || null
      : null;
    if (run) {
      const text = mcDecisionPackText(run);
      try {
        await navigator.clipboard.writeText(text);
        showToast("Decision pack copied to clipboard.", "ok");
      } catch {
        showToast("Copy failed — check clipboard permissions.", "error");
      }
    }
    return;
  }
  if (safeAction === "advance-work-item") {
    await mcHandleAdvanceWorkItem(dataset.itemId);
    return;
  }
  if (safeAction === "promote-signal") {
    await promoteSignalToTopic(dataset.signalId);
    mcInvalidateOverview();
    renderMissionControlView(state.view);
    return;
  }
  if (safeAction === "draft-topic") {
    await createDraftFromTopic(dataset.topicId);
    mcInvalidateOverview();
    renderMissionControlView(state.view);
    return;
  }
  if (safeAction === "request-draft") {
    await mcHandleRequestDraft(dataset.draftId);
    return;
  }
  if (safeAction === "open-content") {
    setView("content");
    return;
  }
  if (safeAction === "open-talk") {
    setView("talk");
    return;
  }
  if (safeAction === "open-talk-focus") {
    setView("talk", { query: "?focus=1" });
    return;
  }
  if (safeAction === "open-speech") {
    setView("speech");
  }
}

function updateSelectionUi() {
  const hasActiveTask = Boolean(state.activeTaskId);
  const taskLabel = hasActiveTask ? (state.activeTaskTitle || state.activeTaskId) : "no run selected";
  const agentLabel = hasActiveTask ? mcPublicAgentRole(state.activeAgent) || "Unassigned" : "no agent selected";
  if (chipTask) chipTask.textContent = `Task: ${taskLabel}`;
  if (chipAgent) chipAgent.textContent = `Agent: ${agentLabel}`;
  if (talkTaskLabel) talkTaskLabel.textContent = `Session Thread: ${GLOBAL_PODCAST_ID}`;
  updateDashboardConsoleState();
}

function updateDashboardConsoleState() {
  const hasActiveTask = Boolean(state.activeTaskId);
  if (dashboardInput) {
    dashboardInput.disabled = !hasActiveTask;
    dashboardInput.placeholder = hasActiveTask
      ? "Send a command for the selected workflow run"
      : "Select a workflow run to send a command";
  }
  if (dashboardSend) {
    dashboardSend.disabled = !hasActiveTask;
    dashboardSend.setAttribute("aria-disabled", String(!hasActiveTask));
  }
  decisionButtons.forEach((button) => {
    button.disabled = !hasActiveTask;
    button.setAttribute("aria-disabled", String(!hasActiveTask));
    button.title = hasActiveTask ? "" : "Select a workflow run first";
  });
  if (!dashboardThread) return;
  if (!hasActiveTask) {
    dashboardThread.innerHTML = `
      <div class="mc-placeholder dashboard-empty-note">
        No workflow run selected. Start from the entry view or choose a run from the list first.
      </div>
    `;
    return;
  }
  if (!dashboardThread.childElementCount) {
    dashboardThread.innerHTML = `
      <div class="mc-placeholder dashboard-empty-note">
        No messages yet for this workflow run.
      </div>
    `;
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  try {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return msgDate.toLocaleDateString();
  } catch {
    return "";
  }
}

function getTimeGroup(timestamp) {
  if (!timestamp) return "Unknown";
  try {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now - msgDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "now";
    if (diffHours < 24) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return "week";
    if (diffDays < 30) return "month";
    return "older";
  } catch {
    return "unknown";
  }
}

function renderDashboardThread(thread) {
  if (!dashboardThread) return;
  dashboardThread.innerHTML = "";

  if (!thread || !thread.length) {
    updateDashboardConsoleState();
    return;
  }

  // Group messages by time period
  const groups = {};
  (thread || []).forEach((msg) => {
    const group = getTimeGroup(msg.ts);
    if (!groups[group]) groups[group] = [];
    groups[group].push(msg);
  });

  // Render in reverse chronological order with timeline separators
  const timelineOrder = ["now", "today", "yesterday", "week", "month", "older"];

  for (const groupKey of timelineOrder) {
    const msgs = groups[groupKey];
    if (!msgs || !msgs.length) continue;

    // Add timeline separator
    const separator = document.createElement("div");
    separator.className = "timeline-separator";
    let label = "Now";
    if (groupKey === "today") label = "Today";
    else if (groupKey === "yesterday") label = "Yesterday";
    else if (groupKey === "week") label = "This Week";
    else if (groupKey === "month") label = "This Month";
    else if (groupKey === "older") label = "Older";
    separator.textContent = label;
    dashboardThread.appendChild(separator);

    // Add messages in this group
    msgs.forEach((msg) => {
      const row = document.createElement("div");
      row.className = `thread-line ${msg.role || "assistant"}`;

      const label = document.createElement("div");
      label.className = "line-label";
      const relTime = formatRelativeTime(msg.ts);
      label.textContent = `${String(msg.role || "assistant").toUpperCase()}${msg.agent ? ` / ${msg.agent}` : ""}${relTime ? ` • ${relTime}` : ""}`;

      const body = document.createElement("div");
      body.textContent = msg.content || "";

      row.appendChild(label);
      row.appendChild(body);
      dashboardThread.appendChild(row);
    });
  }
  updateDashboardConsoleState();
}

function renderTalkTranscript(thread) {
  if (!talkTranscript) return;
  talkTranscript.innerHTML = "";

  if (!thread || !thread.length) {
    const empty = document.createElement("div");
    empty.className = "talk-empty";
    empty.textContent = "No transcript yet.";
    talkTranscript.appendChild(empty);
    return;
  }

  const focusEnabled = Boolean(talkView && talkView.classList.contains("talk-focus"));
  const maxLines = focusEnabled ? 60 : thread.length;
  const visible = focusEnabled && thread.length > maxLines ? thread.slice(-maxLines) : thread;

  visible.forEach((msg) => {
    const role = String(msg.role || "assistant").toLowerCase();
    const kind = role === "user" ? "you" : role === "system" ? "system" : "agent";
    const agentName = msg.agent ? String(msg.agent).trim() : null;
    const row = document.createElement("div");
    row.className = `talk-line ${kind}`;

    let label;
    if (kind === "you") {
      label = "You";
    } else if (kind === "system") {
      label = "System";
    } else {
      label = agentName ? `Agent (${agentName})` : "Agent";
    }

    const rawContent = msg.content || "";
    const content = kind === "agent" ? normalizeAssistantReplyText(rawContent) : rawContent;
    row.textContent = `${label}: ${content}`;
    row.dataset.agent = agentName || "";
    talkTranscript.appendChild(row);
  });

  talkTranscript.scrollTop = talkTranscript.scrollHeight;
}

function labelForKind(kind, agentName = null) {
  if (kind === "you") return agentName ? `You (${agentName})` : "You";
  if (kind === "system") return "System";
  return agentName ? `Agent (${agentName})` : "Agent";
}

function appendTranscriptLine(kind, text, agentName = null) {
  if (!talkTranscript) return;
  const empty = talkTranscript.querySelector(".talk-empty");
  if (empty) empty.remove();

  const rawContent = String(text || "");
  const content = kind === "agent" ? normalizeAssistantReplyText(rawContent) : rawContent;
  const label = labelForKind(kind, agentName);
  const row = document.createElement("div");
  row.className = `talk-line ${kind}`;
  row.textContent = `${label}: ${content}`;
  row.dataset.agent = agentName || "";
  talkTranscript.appendChild(row);
  talkTranscript.scrollTop = talkTranscript.scrollHeight;
}

function appendTranscriptAttachment(kind, label, imageUrl) {
  if (!talkTranscript) return;
  const empty = talkTranscript.querySelector(".talk-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = "talk-line system talk-attachment";
  const title = document.createElement("div");
  title.textContent = `${String(kind || "Vision")}: ${String(label || "Frame captured")}`;
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = label || "Vision frame";
  row.appendChild(title);
  row.appendChild(img);
  talkTranscript.appendChild(row);
  talkTranscript.scrollTop = talkTranscript.scrollHeight;
}

function handleTalkComposerSend() {
  if (!talkChatInput) return;
  const text = String(talkChatInput.value || "").trim();
  if (!text) return;
  talkChatInput.value = "";
  try {
    talkChatInput.style.height = "40px";
  } catch {}
  void processTalkMessage(text, { speakerId: state.currentSpeakerId });
}

async function loadThread(taskId) {
  try {
    const data = await apiRequest(`/task/thread/${encodeURIComponent(taskId)}`);
    setApiOnline(true);
    const thread = Array.isArray(data.thread) ? data.thread : [];
    if (taskId === GLOBAL_PODCAST_ID && (!thread || thread.length === 0)) {
      const local = loadLocalThread();
      if (local && local.length) return local;
    }
    return thread;
  } catch {
    setApiOnline(false);
    if (taskId === GLOBAL_PODCAST_ID) return loadLocalThread();
    throw new Error("thread_load_failed");
  }
}

async function loadTalkSession() {
  state.currentThread = await loadThread(GLOBAL_PODCAST_ID);
  renderTalkTranscript(state.currentThread);
}

function timelinePollIntervalMs() {
  return state.sessionActive ? 2500 : 5000;
}

function truncateTimelineSummary(text, maxLen = 120) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
}

function formatTimelineTime(timestamp) {
  const dt = new Date(timestamp || "");
  if (Number.isNaN(dt.getTime())) return "--:--:--";
  return dt.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getEventTimestampMs(event) {
  const raw = event?.timestamp || event?.createdAt || "";
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDurationMs(durationMs) {
  const totalSec = Math.max(0, Math.floor((Number(durationMs) || 0) / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function chapterTitleForReason(reason, index) {
  const n = Math.max(1, Number(index) || 1);
  if (reason === "highlight") return `Highlight ${n}`;
  if (reason === "long_silence") return `Chapter ${n} - Silence`;
  return `Chapter ${n}`;
}

function applyTimelineFilterUi() {
  if (!timelineFilters) return;
  const buttons = timelineFilters.querySelectorAll(".timeline-filter-btn");
  buttons.forEach((btn) => {
    const value = String(btn?.dataset?.filter || "").toLowerCase();
    btn.classList.toggle("active", value === timelineState.filter);
  });
}

function updateTimelineControlUi() {
  const paused = Boolean(timelineState.pollingPaused);
  if (timelinePauseBtn) {
    timelinePauseBtn.classList.toggle("disabled", paused);
    timelinePauseBtn.disabled = paused;
  }
  if (timelineResumeBtn) {
    timelineResumeBtn.classList.toggle("disabled", !paused);
    timelineResumeBtn.disabled = !paused;
  }
}

function updateTtsToggleUi() {
  if (!ttsToggleBtn) return;
  const disabled = Boolean(runtimeState.ttsDisabled);
  ttsToggleBtn.textContent = disabled ? "TTS: Off" : "TTS: On";
  ttsToggleBtn.classList.toggle("tts-off", disabled);
}

function updateStopVoiceBtnUi() {
  if (!ttsStopBtn) return;
  const speaking = state.talkState === "speaking" || state.speaking || state.assistantSpeaking;
  const thinking = state.talkState === "thinking" || state.assistantThinking || Boolean(state.pendingRequestController);
  const canInterrupt = speaking || thinking;

  ttsStopBtn.textContent = "Interrupt";
  ttsStopBtn.disabled = !canInterrupt;
  ttsStopBtn.classList.toggle("disabled", !canInterrupt);
  ttsStopBtn.classList.toggle("stop-voice-active", canInterrupt);
  ttsStopBtn.classList.toggle("hidden", !canInterrupt);
}

function updateReviewModeUi() {
  const reviewOn = Boolean(state.reviewMode);
  if (reviewModeBtn) {
    reviewModeBtn.textContent = reviewOn ? "Review: On" : "Review: Off";
    reviewModeBtn.classList.toggle("review-on", reviewOn);
  }
  if (talkView) {
    talkView.classList.toggle("review-mode", reviewOn);
  }
  if (talkOrbButton) {
    talkOrbButton.classList.toggle("review-locked", reviewOn && !state.sessionActive);
    talkOrbButton.setAttribute("aria-disabled", reviewOn && !state.sessionActive ? "true" : "false");
  }
  if (timelineReviewControls) {
    timelineReviewControls.classList.toggle("hidden", !reviewOn);
  }
  if (!reviewOn) {
    setReviewAutoplay(false);
  }
  if (reviewOn && !state.sessionActive) {
    setTalkState("idle");
    if (talkHint) talkHint.textContent = "Review mode active. Disable review mode to talk.";
  }
  applyReviewPlaybackUi();
}

async function setReviewMode(enabled) {
  const next = Boolean(enabled);
  if (state.reviewMode === next) return;
  if (next && state.sessionActive) {
    await endSession();
  }
  state.reviewMode = next;
  localStorage.setItem("ATEAM_REVIEW_MODE", next ? "1" : "0");
  closeFallbackComposer();
  updateReviewModeUi();
  await emitEvent(
    "review_mode_toggled",
    "user",
    "talk",
    next ? "Review mode enabled" : "Review mode disabled",
    { enabled: next, sessionId: GLOBAL_PODCAST_ID }
  );
  showToast(next ? "Review mode enabled." : "Review mode disabled.", "ok");
}

function getTimelineWindowedEvents(events) {
  const windowMeta = timelineState.chapterWindow;
  if (!windowMeta || !Number.isFinite(windowMeta.startAtMs) || !Number.isFinite(windowMeta.endAtMs)) {
    return events;
  }
  const startAtMs = Number(windowMeta.startAtMs);
  const endAtMs = Number(windowMeta.endAtMs);
  return events.filter((event) => {
    const ts = getEventTimestampMs(event);
    return ts >= startAtMs && ts <= endAtMs;
  });
}

function getLatestSessionStartMs(events = []) {
  let latestStartMs = 0;
  for (const event of Array.isArray(events) ? events : []) {
    if (String(event?.type || "") !== "segment_started") continue;
    const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
    if (String(meta?.reason || "").trim() !== "session_start") continue;
    const candidate = Number(meta?.startAtMs) || getEventTimestampMs(event);
    if (candidate > latestStartMs) latestStartMs = candidate;
  }
  return Math.max(0, latestStartMs);
}

function collectTurnIdsWithin(startAtMs, endAtMs) {
  const ids = new Set();
  const start = Number(startAtMs) || 0;
  const end = Number(endAtMs) || 0;
  for (const event of timelineState.events || []) {
    const ts = getEventTimestampMs(event);
    if (ts < start || ts > end) continue;
    const turnId = normalizeTurnId(event?.turnId || event?.meta?.turnId || "");
    if (turnId) ids.add(turnId);
  }
  return Array.from(ids);
}

function chapterSummaryForRange(reason, startAtMs, endAtMs) {
  const start = Number(startAtMs) || 0;
  const end = Number(endAtMs) || 0;
  const scoped = (timelineState.events || []).filter((event) => {
    const ts = getEventTimestampMs(event);
    return ts >= start && ts <= end;
  });
  const lastTalk = [...scoped]
    .reverse()
    .find((event) => String(event?.type || "") === "talk_turn_committed" || String(event?.type || "") === "assistant_response_completed");
  if (lastTalk?.summary) return truncateTimelineSummary(lastTalk.summary, 120);
  if (reason === "highlight") return "Manual highlight marker";
  if (reason === "long_silence") return `Long silence segment (${formatDurationMs(end - start)})`;
  return "Auto chapter segment";
}

function getChapterStartAtMs(endAtMs) {
  const end = Math.max(0, Number(endAtMs) || Date.now());
  if (chapterState.chapters.length) {
    const last = chapterState.chapters[chapterState.chapters.length - 1];
    const fromLast = Math.max(0, Number(last?.endAtMs) || Number(last?.startAtMs) || 0);
    if (fromLast > 0 && fromLast <= end) return fromLast;
  }
  const firstEvent = Array.isArray(timelineState.events) && timelineState.events.length ? timelineState.events[0] : null;
  const fromEvents = getEventTimestampMs(firstEvent);
  if (fromEvents > 0 && fromEvents <= end) return fromEvents;
  return Math.max(0, end - CHAPTER_SILENCE_THRESHOLD_MS);
}

async function createChapter(reason, options = {}) {
  const endAtMs = Math.max(0, Number(options?.endAtMs) || Date.now());
  let startAtMs = Math.max(0, Number(options?.startAtMs) || getChapterStartAtMs(endAtMs));
  if (startAtMs > endAtMs) startAtMs = endAtMs;
  const chapterIndex = chapterState.chapters.length + 1;
  const chapterId = String(options?.chapterId || `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const reasonKey = String(reason || "auto");
  const turnIds = Array.isArray(options?.turnIds) && options.turnIds.length
    ? options.turnIds.map((id) => normalizeTurnId(id)).filter(Boolean)
    : collectTurnIdsWithin(startAtMs, endAtMs);
  const title = String(options?.title || chapterTitleForReason(reasonKey, chapterIndex));
  const summary = String(options?.summary || chapterSummaryForRange(reasonKey, startAtMs, endAtMs));
  const meta = {
    chapterId,
    startAtMs,
    endAtMs,
    reason: reasonKey,
    title,
    summary,
    turnIds
  };
  const ok = await emitEvent("chapter_created", "system", "talk", summary, meta);
  if (!ok) return null;
  await refreshTimelineNow();
  return meta;
}

function upsertChapterFromEvent(chapterMap, event) {
  const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
  const chapterId = String(meta?.chapterId || event?.id || "");
  if (!chapterId) return;
  const eventTs = getEventTimestampMs(event);
  const startAtMs = Math.max(0, Number(meta?.startAtMs) || eventTs);
  const endAtMs = Math.max(startAtMs, Number(meta?.endAtMs) || startAtMs);
  const existing = chapterMap.get(chapterId) || {};
  chapterMap.set(chapterId, {
    chapterId,
    startAtMs,
    endAtMs,
    reason: String(meta?.reason || existing?.reason || "auto"),
    title: String(meta?.title || existing?.title || ""),
    summary: String(meta?.summary || event?.summary || existing?.summary || ""),
    turnIds: Array.isArray(meta?.turnIds) ? meta.turnIds.map((id) => normalizeTurnId(id)).filter(Boolean) : existing?.turnIds || [],
    timestamp: event?.timestamp || existing?.timestamp || ""
  });
}

function applyChapterUpdateFromEvent(chapterMap, event) {
  const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
  const chapterId = String(meta?.chapterId || "");
  if (!chapterId) return;
  const existing = chapterMap.get(chapterId);
  if (!existing) return;
  chapterMap.set(chapterId, {
    ...existing,
    title: String(meta?.title || existing.title || ""),
    summary: String(meta?.summary || existing.summary || "")
  });
}

function refreshChapterStateFromEvents(events = []) {
  const chapterMap = new Map();
  for (const event of events) {
    const type = String(event?.type || "");
    if (type === "chapter_created") upsertChapterFromEvent(chapterMap, event);
    if (type === "chapter_updated") applyChapterUpdateFromEvent(chapterMap, event);
  }
  const chapters = Array.from(chapterMap.values()).sort((a, b) => a.startAtMs - b.startAtMs);
  chapters.forEach((chapter, idx) => {
    if (!chapter.title) chapter.title = chapterTitleForReason(chapter.reason, idx + 1);
    if (!chapter.summary) chapter.summary = chapterSummaryForRange(chapter.reason, chapter.startAtMs, chapter.endAtMs);
  });
  chapterState.chapters = chapters;
  const hasActive = chapters.some((chapter) => chapter.chapterId === chapterState.activeChapterId);
  if (!hasActive) {
    chapterState.activeChapterId = "";
    timelineState.chapterWindow = null;
  }
  renderChapters();
}

function clearTimelineChapterFocus() {
  chapterState.activeChapterId = "";
  timelineState.chapterWindow = null;
  timelineState.lastRenderedKey = "";
  chapterState.lastRenderedKey = "";
  renderTimeline();
  renderChapters();
}

function focusTimelineOnChapter(chapterId) {
  const target = chapterState.chapters.find((chapter) => chapter.chapterId === chapterId);
  if (!target) return;
  if (chapterState.activeChapterId === chapterId) {
    clearTimelineChapterFocus();
    return;
  }
  chapterState.activeChapterId = chapterId;
  timelineState.chapterWindow = {
    chapterId: target.chapterId,
    startAtMs: target.startAtMs,
    endAtMs: target.endAtMs
  };
  timelineState.lastRenderedKey = "";
  chapterState.lastRenderedKey = "";
  renderTimeline();
  renderChapters();
}

function renderChapters() {
  if (!talkChapters) return;
  const chapters = chapterState.chapters.slice(-20);
  const renderKey = `${chapterState.activeChapterId}|${chapters
    .map((chapter) => `${chapter.chapterId}:${chapter.startAtMs}:${chapter.endAtMs}:${chapter.summary}`)
    .join("|")}`;
  if (renderKey === chapterState.lastRenderedKey) return;
  chapterState.lastRenderedKey = renderKey;

  if (chapterClearFocusBtn) chapterClearFocusBtn.disabled = !chapterState.activeChapterId;
  talkChapters.innerHTML = "";
  if (!chapters.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No chapters yet.";
    talkChapters.appendChild(empty);
    return;
  }

  for (const chapter of chapters) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `chapter-card ${chapter.chapterId === chapterState.activeChapterId ? "active" : ""}`;
    card.dataset.chapterId = chapter.chapterId;

    const top = document.createElement("div");
    top.className = "chapter-card-top";
    const title = document.createElement("span");
    title.className = "chapter-card-title";
    title.textContent = chapter.title;
    const duration = document.createElement("span");
    duration.className = "chapter-card-duration";
    duration.textContent = formatDurationMs(Math.max(0, chapter.endAtMs - chapter.startAtMs));
    top.appendChild(title);
    top.appendChild(duration);

    card.appendChild(top);
    const summaryText = truncateTimelineSummary(chapter.summary || "", 120).trim();
    if (summaryText) {
      const summary = document.createElement("div");
      summary.className = "chapter-card-summary";
      summary.textContent = summaryText;
      card.appendChild(summary);
    }
    talkChapters.appendChild(card);
  }
}

function normalizeAnalyticsMs(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function parseMeasuredTurnDurationMs(meta) {
  const startMs = Number(meta?.audioStartMs);
  const endMs = Number(meta?.audioEndMs);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.round(endMs - startMs);
}

function hashStringFNV1a(input) {
  let hash = 2166136261;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toStableJsonValue(value) {
  if (Array.isArray(value)) return value.map((item) => toStableJsonValue(item));
  if (value && typeof value === "object") {
    const sortedKeys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    const out = {};
    for (const key of sortedKeys) {
      out[key] = toStableJsonValue(value[key]);
    }
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(toStableJsonValue(value));
}

function formatDurationMaybe(durationMs) {
  const normalized = normalizeAnalyticsMs(durationMs);
  if (normalized === null) return "n/a";
  return formatDurationMs(normalized);
}

function sortSpeakerAnalyticsRows(rows = [], sortBy = "turns") {
  const list = Array.isArray(rows) ? [...rows] : [];
  if (sortBy === "talk_time") {
    return list.sort((a, b) => b.measuredTalkMs - a.measuredTalkMs || b.turns - a.turns || a.speakerId.localeCompare(b.speakerId));
  }
  if (sortBy === "longest_gap") {
    return list.sort((a, b) => b.longestGapMs - a.longestGapMs || b.turns - a.turns || a.speakerId.localeCompare(b.speakerId));
  }
  return list.sort((a, b) => b.turns - a.turns || b.measuredTalkMs - a.measuredTalkMs || a.speakerId.localeCompare(b.speakerId));
}

function createSpeakerAnalyticsSnapshot(events = []) {
  const committedTurns = (Array.isArray(events) ? events : [])
    .filter((event) => String(event?.type || "") === "talk_turn_committed")
    .map((event) => {
      const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
      const speakerId = getEffectiveSpeakerId(event);
      const measuredDurationMs = parseMeasuredTurnDurationMs(meta);
      const confidenceRaw = Number(meta?.confidence);
      return {
        speakerId,
        speakerLabel: speakerLabelById(speakerId),
        timestampMs: Math.max(0, getEventTimestampMs(event)),
        measuredDurationMs,
        confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : null
      };
    })
    .sort((a, b) => a.timestampMs - b.timestampMs);

  const statsBySpeaker = new Map();
  const ensureStats = (speakerId) => {
    const id = normalizeSpeakerId(speakerId);
    if (!statsBySpeaker.has(id)) {
      statsBySpeaker.set(id, {
        speakerId: id,
        speakerLabel: speakerLabelById(id),
        turns: 0,
        measuredTurns: 0,
        unmeasuredTurns: 0,
        measuredTalkMs: 0,
        maxTurnMsMeasured: null,
        longestGapMs: 0,
        rapidSwitchCount: 0,
        confidenceTotal: 0,
        confidenceSamples: 0
      });
    }
    return statsBySpeaker.get(id);
  };

  let measuredTurns = 0;
  let unmeasuredTurns = 0;
  let measuredTalkMs = 0;

  for (let i = 0; i < committedTurns.length; i += 1) {
    const current = committedTurns[i];
    const stats = ensureStats(current.speakerId);
    stats.turns += 1;

    if (current.measuredDurationMs === null) {
      stats.unmeasuredTurns += 1;
      unmeasuredTurns += 1;
    } else {
      stats.measuredTurns += 1;
      stats.measuredTalkMs += current.measuredDurationMs;
      measuredTurns += 1;
      measuredTalkMs += current.measuredDurationMs;
      if (stats.maxTurnMsMeasured === null || current.measuredDurationMs > stats.maxTurnMsMeasured) {
        stats.maxTurnMsMeasured = current.measuredDurationMs;
      }
    }

    if (current.confidence !== null) {
      stats.confidenceTotal += current.confidence;
      stats.confidenceSamples += 1;
    }

    const next = committedTurns[i + 1];
    if (!next) continue;
    const gapMs = Math.max(0, next.timestampMs - current.timestampMs);
    if (gapMs > stats.longestGapMs) stats.longestGapMs = gapMs;
    if (next.speakerId !== current.speakerId && gapMs <= RAPID_SWITCH_THRESHOLD_MS) {
      stats.rapidSwitchCount += 1;
    }
  }

  const rows = Array.from(statsBySpeaker.values()).map((stats) => {
    const avgTurnMsMeasured = stats.measuredTurns ? Math.round(stats.measuredTalkMs / stats.measuredTurns) : null;
    const avgConfidence = stats.confidenceSamples ? Number((stats.confidenceTotal / stats.confidenceSamples).toFixed(3)) : null;
    return {
      speakerId: stats.speakerId,
      speakerLabel: stats.speakerLabel,
      turns: stats.turns,
      measuredTurns: stats.measuredTurns,
      unmeasuredTurns: stats.unmeasuredTurns,
      measuredTalkMs: normalizeAnalyticsMs(stats.measuredTalkMs) || 0,
      avgTurnMsMeasured: normalizeAnalyticsMs(avgTurnMsMeasured),
      maxTurnMsMeasured: normalizeAnalyticsMs(stats.maxTurnMsMeasured),
      longestGapMs: normalizeAnalyticsMs(stats.longestGapMs) || 0,
      rapidSwitchCount: Math.max(0, Math.round(stats.rapidSwitchCount || 0)),
      avgConfidence: avgConfidence === null ? null : Number(avgConfidence)
    };
  });

  const canonicalRows = [...rows]
    .sort((a, b) => a.speakerId.localeCompare(b.speakerId))
    .map((row) => ({
      speakerId: row.speakerId,
      speakerLabel: row.speakerLabel,
      turns: row.turns,
      measuredTalkMs: row.measuredTalkMs,
      avgTurnMsMeasured: row.avgTurnMsMeasured ?? null,
      maxTurnMsMeasured: row.maxTurnMsMeasured ?? null,
      longestGapMs: row.longestGapMs,
      rapidSwitchCount: row.rapidSwitchCount,
      avgConfidence: row.avgConfidence ?? null
    }));

  const timing = {
    measuredTurns: Math.max(0, Math.round(measuredTurns)),
    unmeasuredTurns: Math.max(0, Math.round(unmeasuredTurns)),
    measuredTalkMs: normalizeAnalyticsMs(measuredTalkMs) || 0
  };

  const canonicalPayload = {
    sessionId: GLOBAL_PODCAST_ID,
    timing,
    bySpeaker: canonicalRows
  };
  const analyticsKey = `analytics_${hashStringFNV1a(JSON.stringify(canonicalPayload))}`;

  return {
    rows,
    canonicalRows,
    timing,
    analyticsKey
  };
}

async function emitSpeakerAnalyticsGenerated(source = "refresh") {
  const analyticsKey = String(speakerAnalyticsState.analyticsKey || "").trim();
  if (!analyticsKey) return;
  if (!Array.isArray(speakerAnalyticsState.canonicalRows) || speakerAnalyticsState.canonicalRows.length === 0) return;
  if (source === "refresh" && analyticsKey === speakerAnalyticsState.lastRefreshEmittedKey) return;
  const meta = {
    sessionId: GLOBAL_PODCAST_ID,
    dedupeKey: analyticsKey,
    analyticsKey,
    source: String(source || "refresh"),
    generatedAtMs: Date.now(),
    timing: {
      measuredTurns: speakerAnalyticsState.timing.measuredTurns,
      unmeasuredTurns: speakerAnalyticsState.timing.unmeasuredTurns,
      measuredTalkMs: speakerAnalyticsState.timing.measuredTalkMs
    },
    bySpeaker: speakerAnalyticsState.canonicalRows
  };
  const summary = `Speaker analytics: ${meta.bySpeaker.length} speakers, measured ${formatDurationMs(meta.timing.measuredTalkMs)}`;
  const ok = await emitEvent("speaker_analytics_generated", "system", "talk", summary, meta);
  if (ok && source === "refresh") {
    speakerAnalyticsState.lastRefreshEmittedKey = analyticsKey;
  }
}

function renderSpeakerAnalytics() {
  if (!talkSpeakerAnalytics) return;
  const rows = sortSpeakerAnalyticsRows(speakerAnalyticsState.rows, speakerAnalyticsState.sortBy).slice(0, 8);
  const renderKey = `${speakerAnalyticsState.sortBy}|${speakerAnalyticsState.timing.measuredTurns}|${speakerAnalyticsState.timing.unmeasuredTurns}|${speakerAnalyticsState.timing.measuredTalkMs}|${rows
    .map(
      (row) =>
        `${row.speakerId}:${row.turns}:${row.measuredTurns}:${row.unmeasuredTurns}:${row.measuredTalkMs}:${row.avgTurnMsMeasured}:${row.maxTurnMsMeasured}:${row.longestGapMs}:${row.rapidSwitchCount}:${row.avgConfidence}`
    )
    .join("|")}`;
  if (renderKey === speakerAnalyticsState.lastRenderedKey) return;
  speakerAnalyticsState.lastRenderedKey = renderKey;

  talkSpeakerAnalytics.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No speaker data yet.";
    talkSpeakerAnalytics.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const card = document.createElement("div");
    card.className = "speaker-analytics-card";

    const top = document.createElement("div");
    top.className = "speaker-analytics-top";
    const speaker = document.createElement("span");
    speaker.className = "speaker-analytics-name";
    speaker.textContent = row.speakerLabel;
    const turns = document.createElement("span");
    turns.className = "speaker-analytics-turns";
    turns.textContent = `${row.turns} turn${row.turns === 1 ? "" : "s"}`;
    top.appendChild(speaker);
    top.appendChild(turns);

    const detailA = document.createElement("div");
    detailA.className = "speaker-analytics-detail";
    detailA.textContent = `Talk ${formatDurationMs(row.measuredTalkMs)} | Avg ${formatDurationMaybe(row.avgTurnMsMeasured)} | Max ${formatDurationMaybe(
      row.maxTurnMsMeasured
    )}`;

    const detailB = document.createElement("div");
    detailB.className = "speaker-analytics-detail";
    detailB.title = `Rapid switches threshold: ${RAPID_SWITCH_THRESHOLD_MS}ms`;
    const confidenceText = row.avgConfidence === null ? "n/a" : row.avgConfidence;
    detailB.textContent = `Longest gap ${formatDurationMs(row.longestGapMs)} | Rapid Switches ${row.rapidSwitchCount} | Conf ${confidenceText}`;

    const detailC = document.createElement("div");
    detailC.className = "speaker-analytics-detail";
    detailC.textContent =
      row.unmeasuredTurns > 0 ? `Timing: mixed (${row.unmeasuredTurns} unmeasured)` : "Timing: measured";

    card.appendChild(top);
    card.appendChild(detailA);
    card.appendChild(detailB);
    card.appendChild(detailC);
    talkSpeakerAnalytics.appendChild(card);
  }
}

async function refreshSpeakerAnalyticsFromEvents(events = [], options = {}) {
  const previousKey = speakerAnalyticsState.analyticsKey;
  const snapshot = createSpeakerAnalyticsSnapshot(events);
  speakerAnalyticsState.rows = snapshot.rows;
  speakerAnalyticsState.canonicalRows = snapshot.canonicalRows;
  speakerAnalyticsState.timing = snapshot.timing;
  speakerAnalyticsState.analyticsKey = snapshot.analyticsKey;
  if (previousKey !== snapshot.analyticsKey) speakerAnalyticsState.lastRenderedKey = "";
  renderSpeakerAnalytics();

  const emitSource = String(options?.emitSource || "").trim();
  if (!emitSource) return;
  if (emitSource === "refresh" && previousKey === snapshot.analyticsKey) return;
  await emitSpeakerAnalyticsGenerated(emitSource);
}

function getTimelineFilteredEvents() {
  const all = Array.isArray(timelineState.events) ? timelineState.events : [];
  let filtered = all;
  if (timelineState.filter === "highlights") {
    filtered = all.filter((event) => String(event?.type || "") === "highlight_marked" || String(event?.type || "") === "chapter_created");
  } else if (timelineState.filter === "status") {
    filtered = all.filter((event) => String(event?.type || "") === "agent_status_updated");
  } else if (timelineState.filter === "errors") {
    filtered = all.filter((event) => String(event?.type || "") === "error");
    const currentSessionStartMs = Number(timelineState.currentSessionStartMs) || 0;
    if (currentSessionStartMs > 0) {
      const currentSessionErrors = filtered.filter((event) => getEventTimestampMs(event) >= currentSessionStartMs);
      if (currentSessionErrors.length) filtered = currentSessionErrors;
    }
  } else if (timelineState.filter === "talk") {
    const talkEventTypes = new Set(["talk_turn_committed", "assistant_response_started", "assistant_response_completed"]);
    filtered = all.filter((event) => talkEventTypes.has(String(event?.type || "")) || String(event?.lane || "") === "talk");
  }
  if (timelineState.speakerFilter && timelineState.speakerFilter !== "all") {
    filtered = filtered.filter((event) => getEffectiveSpeakerId(event) === timelineState.speakerFilter);
  }
  return getTimelineWindowedEvents(filtered);
}

function getTimelineEventKey(event) {
  const id = String(event?.id || "").trim();
  if (id) return `id:${id}`;
  const ts = String(event?.timestamp || "").trim();
  const type = String(event?.type || "").trim();
  const summary = String(event?.summary || "").trim();
  return `fallback:${ts}|${type}|${summary}`;
}

function getTimelineReviewEvents() {
  return getTimelineFilteredEvents().slice(-20);
}

function setReviewFocusedEvent(eventKey, options = {}) {
  const key = String(eventKey || "").trim();
  reviewPlaybackState.focusedEventKey = key;
  timelineState.lastRenderedKey = "";
  renderTimeline();
  const shouldScroll = options?.scroll !== false;
  if (shouldScroll && key) {
    requestAnimationFrame(() => {
      const rows = talkTimeline ? Array.from(talkTimeline.querySelectorAll(".timeline-event")) : [];
      const row = rows.find((node) => String(node?.dataset?.eventKey || "") === key);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function moveReviewFocus(delta = 1) {
  const sequence = getTimelineReviewEvents();
  if (!sequence.length) {
    reviewPlaybackState.focusedEventKey = "";
    applyReviewPlaybackUi();
    return false;
  }
  const focusedKey = String(reviewPlaybackState.focusedEventKey || "").trim();
  const currentIdx = sequence.findIndex((event) => getTimelineEventKey(event) === focusedKey);
  const baseIdx = currentIdx >= 0 ? currentIdx : sequence.length - 1;
  const nextIdx = Math.max(0, Math.min(sequence.length - 1, baseIdx + Number(delta || 0)));
  const nextKey = getTimelineEventKey(sequence[nextIdx]);
  setReviewFocusedEvent(nextKey, { scroll: true });
  return nextIdx !== baseIdx;
}

function jumpReviewFocusToLatest() {
  const sequence = getTimelineReviewEvents();
  if (!sequence.length) {
    reviewPlaybackState.focusedEventKey = "";
    applyReviewPlaybackUi();
    return;
  }
  const latestKey = getTimelineEventKey(sequence[sequence.length - 1]);
  setReviewFocusedEvent(latestKey, { scroll: true });
}

function stopReviewAutoplayTimer() {
  if (reviewPlaybackState.timer) {
    clearTimeout(reviewPlaybackState.timer);
    reviewPlaybackState.timer = null;
  }
}

function reviewAutoplayTick() {
  stopReviewAutoplayTimer();
  if (!reviewPlaybackState.autoPlay || !state.reviewMode) return;
  const moved = moveReviewFocus(1);
  if (!moved) {
    setReviewAutoplay(false);
    return;
  }
  reviewPlaybackState.timer = setTimeout(reviewAutoplayTick, reviewPlaybackState.intervalMs);
}

function setReviewAutoplay(enabled) {
  const next = Boolean(enabled);
  const changed = reviewPlaybackState.autoPlay !== next;
  reviewPlaybackState.autoPlay = next;
  stopReviewAutoplayTimer();
  if (next) {
    if (!reviewPlaybackState.focusedEventKey) jumpReviewFocusToLatest();
    reviewPlaybackState.timer = setTimeout(reviewAutoplayTick, reviewPlaybackState.intervalMs);
  }
  if (changed) {
    void emitEvent(
      "review_playback_toggled",
      "user",
      "talk",
      next ? "Review autoplay enabled" : "Review autoplay disabled",
      {
        enabled: next,
        intervalMs: reviewPlaybackState.intervalMs,
        focusedEventKey: String(reviewPlaybackState.focusedEventKey || "") || null
      }
    );
  }
  applyReviewPlaybackUi();
}

function applyReviewPlaybackUi() {
  const sequence = getTimelineReviewEvents();
  const focusedKey = String(reviewPlaybackState.focusedEventKey || "").trim();
  const focused = sequence.find((event) => getTimelineEventKey(event) === focusedKey) || null;
  const hasEvents = sequence.length > 0;
  const inReviewMode = Boolean(state.reviewMode);
  if (timelineReviewPrevBtn) timelineReviewPrevBtn.disabled = !inReviewMode || !hasEvents;
  if (timelineReviewNextBtn) timelineReviewNextBtn.disabled = !inReviewMode || !hasEvents;
  if (timelineReviewLatestBtn) timelineReviewLatestBtn.disabled = !inReviewMode || !hasEvents;
  if (timelineReviewAutoplayBtn) {
    timelineReviewAutoplayBtn.disabled = !inReviewMode || !hasEvents;
    timelineReviewAutoplayBtn.textContent = reviewPlaybackState.autoPlay ? "Auto: On" : "Auto: Off";
    timelineReviewAutoplayBtn.classList.toggle("review-autoplay-on", reviewPlaybackState.autoPlay);
  }
  if (timelineReviewStatus) {
    if (!inReviewMode) timelineReviewStatus.textContent = "Review cursor: disabled";
    else if (!hasEvents) timelineReviewStatus.textContent = "Review cursor: none";
    else if (!focused) timelineReviewStatus.textContent = `Review cursor: ${sequence.length} events`;
    else timelineReviewStatus.textContent = `Review cursor: ${formatTimelineTime(focused?.timestamp)} ${String(focused?.type || "event")}`;
  }
}

function renderTimeline() {
  if (!talkTimeline) return;
  const filtered = getTimelineFilteredEvents();
  const reviewSequence = filtered.slice(-20);
  if (state.reviewMode) {
    const focusedKey = String(reviewPlaybackState.focusedEventKey || "").trim();
    const hasFocused = focusedKey && reviewSequence.some((event) => getTimelineEventKey(event) === focusedKey);
    if (!hasFocused) {
      reviewPlaybackState.focusedEventKey = reviewSequence.length ? getTimelineEventKey(reviewSequence[reviewSequence.length - 1]) : "";
    }
  }
  const events = filtered.slice(-20).reverse();
  const currentSessionStartMs = Number(timelineState.currentSessionStartMs) || 0;
  const chapterWindowKey = timelineState.chapterWindow
    ? `${timelineState.chapterWindow.chapterId}:${timelineState.chapterWindow.startAtMs}:${timelineState.chapterWindow.endAtMs}`
    : "all";
  const renderKey = `${timelineState.filter}|${timelineState.speakerFilter}|${currentSessionStartMs}|${chapterWindowKey}|${
    reviewPlaybackState.focusedEventKey
  }|${events
    .map((e) => e?.id || e?.timestamp || "")
    .join("|")}`;
  if (renderKey === timelineState.lastRenderedKey) return;
  timelineState.lastRenderedKey = renderKey;

  talkTimeline.innerHTML = "";
  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = timelineState.chapterWindow ? "No events in this chapter window." : "No events for this filter yet.";
    talkTimeline.appendChild(empty);
    return;
  }

  for (const event of events) {
    const row = document.createElement("div");
    const eventType = String(event?.type || "");
    const eventTs = getEventTimestampMs(event);
    const isError = eventType === "error";
    const isHistoricalError = isError && currentSessionStartMs > 0 && eventTs < currentSessionStartMs;
    const eventKey = getTimelineEventKey(event);
    const isFocused = state.reviewMode && eventKey === String(reviewPlaybackState.focusedEventKey || "").trim();
    row.className = `timeline-event${isError ? " error" : ""}${isHistoricalError ? " historical" : ""}${isFocused ? " focused" : ""}`;
    row.dataset.eventKey = eventKey;

    const top = document.createElement("div");
    top.className = "timeline-event-top";
    const time = document.createElement("span");
    time.className = "timeline-time";
    time.textContent = formatTimelineTime(event?.timestamp);
    const type = document.createElement("span");
    type.className = "timeline-type";
    type.textContent = String(event?.type || "unknown");
    top.appendChild(time);
    top.appendChild(type);

    const meta = document.createElement("div");
    meta.className = "timeline-meta";
    const speakerId = getEffectiveSpeakerId(event);
    const speakerText = speakerId && speakerId !== "unknown" ? ` • ${speakerLabelById(speakerId)}` : "";
    const historicalText = isHistoricalError ? " • historical" : "";
    meta.textContent = `${String(event?.actor || "system")} • ${String(event?.lane || "system")}${speakerText}${historicalText}`;

    const summary = document.createElement("div");
    summary.className = "timeline-summary";
    summary.textContent = truncateTimelineSummary(event?.summary || "");

    row.appendChild(top);
    row.appendChild(meta);
    row.appendChild(summary);
    if (String(event?.type || "") === "talk_turn_committed") {
      const turnId = normalizeTurnId(event?.turnId || event?.meta?.turnId || "");
      if (turnId) {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "timeline-speaker-edit";
        editBtn.dataset.turnId = turnId;
        editBtn.dataset.currentSpeakerId = speakerId;
        editBtn.textContent = `Speaker: ${speakerLabelById(speakerId)}`;
        row.appendChild(editBtn);
      }
    }
    talkTimeline.appendChild(row);
  }
  applyReviewPlaybackUi();
}

async function fetchTimelineEvents(sessionId, force = false) {
  const sid = String(sessionId || GLOBAL_PODCAST_ID).trim() || GLOBAL_PODCAST_ID;
  let events = [];
  let fetchedFromApi = false;
  try {
    const limit = 420;
    const data = await apiRequest(`/events/${encodeURIComponent(sid)}?limit=${limit}`);
    events = Array.isArray(data?.events) ? data.events : [];
    fetchedFromApi = true;
    setApiOnline(true);
  } catch {
    setApiOnline(false);
    events = loadLocalEvents();
    if (!events.length && sid === GLOBAL_PODCAST_ID) {
      ensureTalkDemoSeeded();
      events = loadLocalEvents();
    }
  }

  if (fetchedFromApi && (!events || events.length === 0) && sid === GLOBAL_PODCAST_ID) {
    const local = loadLocalEvents();
    if (local && local.length) events = local;
  }

  const count = events.length;
  const lastEvent = count ? events[count - 1] : null;
  const lastId = String(lastEvent?.id || "");
  timelineState.lastFetchedAt = Date.now();

  const unchanged = !force && count === timelineState.lastCount && lastId === timelineState.lastEventId;
  timelineState.events = events;
  timelineState.turnSpeakerMap = buildTurnSpeakerMap(events);
  timelineState.currentSessionStartMs = getLatestSessionStartMs(events);
  hydrateSegmentStateFromEvents(events);
  timelineState.lastCount = count;
  timelineState.lastEventId = lastId;
  refreshChapterStateFromEvents(events);
  await refreshSpeakerAnalyticsFromEvents(events, { emitSource: "refresh" });
  if (!unchanged) {
    timelineState.lastRenderedKey = "";
    renderTimeline();
  }
  return !unchanged;
}

function stopTimelinePolling() {
  if (timelinePollTimer) {
    clearTimeout(timelinePollTimer);
    timelinePollTimer = null;
  }
}

function scheduleTimelinePoll(delayMs = timelinePollIntervalMs()) {
  if (timelineState.pollingPaused) {
    stopTimelinePolling();
    return;
  }
  stopTimelinePolling();
  timelinePollTimer = setTimeout(() => {
    void timelinePollTick(false);
  }, Math.max(100, Number(delayMs) || timelinePollIntervalMs()));
}

async function timelinePollTick(force = false) {
  if (timelineState.pollingPaused && !force) return;
  if (timelineFetchInFlight) {
    scheduleTimelinePoll(400);
    return;
  }
  timelineFetchInFlight = true;
  try {
    await fetchTimelineEvents(GLOBAL_PODCAST_ID, force);
  } catch (err) {
    console.error("[Timeline] fetch failed", err);
  } finally {
    timelineFetchInFlight = false;
    scheduleTimelinePoll(timelinePollIntervalMs());
  }
}

function startTimelinePolling() {
  stopTimelinePolling();
  updateTimelineControlUi();
  scheduleTimelinePoll(0);
}

async function refreshTimelineNow() {
  await timelinePollTick(true);
}

function setTimelinePollingPaused(paused) {
  timelineState.pollingPaused = Boolean(paused);
  updateTimelineControlUi();
  if (timelineState.pollingPaused) {
    stopTimelinePolling();
    return;
  }
  scheduleTimelinePoll(0);
}

function clearTimelineView() {
  setReviewAutoplay(false);
  reviewPlaybackState.focusedEventKey = "";
  timelineState.events = [];
  timelineState.turnSpeakerMap = {};
  timelineState.currentSessionStartMs = 0;
  timelineState.lastCount = -1;
  timelineState.lastEventId = "";
  timelineState.lastRenderedKey = "";
  timelineState.chapterWindow = null;
  chapterState.chapters = [];
  chapterState.activeChapterId = "";
  chapterState.lastRenderedKey = "";
  speakerAnalyticsState.rows = [];
  speakerAnalyticsState.canonicalRows = [];
  speakerAnalyticsState.timing = { measuredTurns: 0, unmeasuredTurns: 0, measuredTalkMs: 0 };
  speakerAnalyticsState.analyticsKey = "";
  speakerAnalyticsState.lastRefreshEmittedKey = "";
  speakerAnalyticsState.lastRenderedKey = "";
  renderTimeline();
  renderChapters();
  renderSpeakerAnalytics();
}

async function exportTimelineJson() {
  try {
    let data = null;
    try {
      data = await apiRequest(`/events/${encodeURIComponent(GLOBAL_PODCAST_ID)}`);
    } catch {
      // Fall back to local/demo events if the API is unavailable.
      data = { sessionId: GLOBAL_PODCAST_ID, events: loadLocalEvents() };
      if (!Array.isArray(data.events) || data.events.length === 0) {
        data.events = Array.isArray(timelineState.events) ? timelineState.events : [];
      }
    }

    const payload = JSON.stringify(data || { sessionId: GLOBAL_PODCAST_ID, events: [] }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `${GLOBAL_PODCAST_ID}_events_${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Session exported.", "ok");
  } catch (err) {
    console.error("[Timeline] export failed", err);
    showToast("Export failed.", "error");
  }
}

async function exportSessionPackJson() {
  try {
    let data = null;
    try {
      data = await apiRequest(`/events/${encodeURIComponent(GLOBAL_PODCAST_ID)}`);
    } catch {
      // Fall back to local/demo events if the API is unavailable.
      data = { sessionId: GLOBAL_PODCAST_ID, events: loadLocalEvents() };
      if (!Array.isArray(data.events) || data.events.length === 0) {
        data.events = Array.isArray(timelineState.events) ? timelineState.events : [];
      }
    }

    const events = Array.isArray(data?.events) ? data.events : [];
    const typeCountsRaw = events.reduce((acc, event) => {
      const key = String(event?.type || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const typeCounts = Object.fromEntries(Object.entries(typeCountsRaw).sort((a, b) => a[0].localeCompare(b[0])));

    refreshChapterStateFromEvents(events);
    await refreshSpeakerAnalyticsFromEvents(events, { emitSource: "" });
    const summary = buildSessionSummaryPayload(events);
    const sessionId = String(data?.sessionId || GLOBAL_PODCAST_ID);
    const analyticsKey = speakerAnalyticsState.analyticsKey || null;
    const speakerRows = Array.isArray(speakerAnalyticsState.canonicalRows) ? speakerAnalyticsState.canonicalRows : [];
    const chapters = [...(Array.isArray(chapterState.chapters) ? chapterState.chapters : [])].sort((a, b) => {
      const aStart = Number(a?.startAtMs) || 0;
      const bStart = Number(b?.startAtMs) || 0;
      if (aStart !== bStart) return aStart - bStart;
      return String(a?.chapterId || "").localeCompare(String(b?.chapterId || ""));
    });

    const highlights = events
      .filter((event) => String(event?.type || "") === "highlight_marked")
      .map((event) => ({
        timestamp: event?.timestamp || "",
        summary: event?.summary || "",
        turnId: normalizeTurnId(event?.turnId || event?.meta?.turnId || "") || null,
        chapterId: String(event?.meta?.chapterId || "").trim() || null
      }))
      .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));

    const exportHashSource = {
      exportSchemaVersion: EXPORT_PACK_SCHEMA_VERSION,
      sessionId,
      summary,
      typeCounts,
      chapters,
      highlights,
      speakerAnalytics: {
        analyticsKey,
        timing: speakerAnalyticsState.timing,
        bySpeaker: speakerRows
      },
      // Keep hash stable across repeated exports by excluding previous export audit rows.
      events: events.filter((event) => String(event?.type || "") !== "export_pack_generated")
    };
    const exportHash = `pack_${hashStringFNV1a(stableStringify(exportHashSource))}`;

    const pack = {
      ok: true,
      phase: EXPORT_PACK_SCHEMA_VERSION,
      exportSchemaVersion: EXPORT_PACK_SCHEMA_VERSION,
      exportHash,
      sessionId,
      exportedAt: new Date().toISOString(),
      reviewMode: Boolean(state.reviewMode),
      summary,
      typeCounts,
      chapters,
      highlights,
      speakerAnalytics: {
        analyticsKey,
        timing: speakerAnalyticsState.timing,
        bySpeaker: speakerRows
      },
      events
    };

    const payload = JSON.stringify(pack, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const fileSizeBytes = blob.size;
    const auditOk = await emitEvent(
      "export_pack_generated",
      "user",
      "talk",
      `Export pack generated (${events.length} events, ${chapters.length} chapters)`,
      {
        sessionId,
        dedupeKey: exportHash,
        eventCount: events.length,
        speakerCount: speakerRows.length,
        chapterCount: chapters.length,
        analyticsKey,
        exportSchemaVersion: EXPORT_PACK_SCHEMA_VERSION,
        fileSizeBytes,
        exportHash
      }
    );
    if (!auditOk) {
      console.warn("[Export Pack] audit event emit failed");
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `${GLOBAL_PODCAST_ID}_review_pack_${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    await refreshTimelineNow();
    showToast(auditOk ? "Review pack exported." : "Review pack exported (audit emit failed).", auditOk ? "ok" : "error");
  } catch (err) {
    console.error("[Timeline] export pack failed", err);
    showToast("Export pack failed.", "error");
  }
}

async function markTimelineHighlight() {
  const turnId = normalizeTurnId(runtimeState.lastTurnId) || null;
  const chapterId = `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const meta = {
    turnId,
    chapterId,
    reason: "highlight",
    note: "",
    timestampLocal: new Date().toLocaleString()
  };
  const highlightOk = await emitEvent("highlight_marked", "user", "talk", "Highlight marked", meta);
  if (!highlightOk) {
    showToast("Could not mark highlight.", "error");
    return;
  }
  const created = await createChapter("highlight", {
    chapterId,
    endAtMs: Date.now(),
    turnIds: turnId ? [turnId] : [],
    summary: "Highlight marked segment"
  });
  if (!created) {
    showToast("Highlight saved, chapter creation failed.", "error");
    await refreshTimelineNow();
    return;
  }
  showToast("Highlight marked.", "ok");
}

function setTimelineFilter(filter) {
  const next = String(filter || "all").toLowerCase();
  if (!["all", "talk", "highlights", "status", "errors"].includes(next)) return;
  if (timelineState.filter === next) return;
  timelineState.filter = next;
  timelineState.lastRenderedKey = "";
  applyTimelineFilterUi();
  renderTimeline();
}

function setTimelineSpeakerFilter(speakerId) {
  const next = String(speakerId || "all").toLowerCase();
  const normalized = next === "all" ? "all" : normalizeSpeakerId(next);
  timelineState.speakerFilter = normalized;
  if (timelineSpeakerFilter && timelineSpeakerFilter.value !== normalized) {
    timelineSpeakerFilter.value = normalized;
  }
  timelineState.lastRenderedKey = "";
  renderTimeline();
}

function setSpeakerAnalyticsSort(sortBy) {
  const next = String(sortBy || "turns").toLowerCase();
  if (!["turns", "talk_time", "longest_gap"].includes(next)) return;
  if (speakerAnalyticsState.sortBy === next) return;
  speakerAnalyticsState.sortBy = next;
  if (talkSpeakerAnalyticsControls) {
    const buttons = talkSpeakerAnalyticsControls.querySelectorAll(".speaker-analytics-sort-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", String(btn.dataset.sort || "") === next);
    });
  }
  speakerAnalyticsState.lastRenderedKey = "";
  renderSpeakerAnalytics();
}

async function relabelTurnSpeaker(turnId, newSpeakerId, previousSpeakerId = "unknown") {
  const normalizedTurnId = normalizeTurnId(turnId);
  if (!normalizedTurnId) return false;
  const nextSpeakerId = normalizeSpeakerId(newSpeakerId);
  const nextSpeakerLabel = speakerLabelById(nextSpeakerId);
  const prevSpeakerId = normalizeSpeakerId(previousSpeakerId);
  const prevSpeakerLabel = speakerLabelById(prevSpeakerId);
  if (nextSpeakerId === prevSpeakerId) return true;
  const ok = await emitEvent("speaker_label_edited", "user", "talk", `Speaker set to ${nextSpeakerLabel}`, {
    turnId: normalizedTurnId,
    previousSpeakerId: prevSpeakerId,
    previousSpeakerLabel: prevSpeakerLabel,
    newSpeakerId: nextSpeakerId,
    newSpeakerLabel: nextSpeakerLabel
  });
  if (!ok) return false;
  await refreshTimelineNow();
  return true;
}

async function appendMessageFallback(taskId, role, content, agent = "") {
  const msg = {
    role,
    content,
    agent,
    ts: new Date().toISOString()
  };
  state.currentThread.push(msg);
  saveLocalThread(state.currentThread);

  try {
    await apiRequest("/task/thread", {
      method: "POST",
      body: { taskId, role, content, agent }
    });
    setApiOnline(true);
  } catch {
    setApiOnline(false);
  }
}

function pickPreferredVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length) return null;

  const byLangPrefix = (prefix) => list.find((v) => String(v.lang || "").toLowerCase().startsWith(prefix));
  const byNameContains = (needle) =>
    list.find((v) => String(v.name || "").toLowerCase().includes(needle));

  return (
    byLangPrefix("en-ng") ||
    byNameContains("nigeria") ||
    byLangPrefix("en-gb") ||
    byLangPrefix("en-us") ||
    byLangPrefix("en") ||
    list[0]
  );
}

function getVoiceStyleConfig(style) {
  // Simplified to use only male_assistant voice
  return {
    rate: TTS_CONFIG.rate,
    pitch: TTS_CONFIG.pitch,
    volume: TTS_CONFIG.volume,
    matchers: ["microsoft", "natural", "online", "male", "david", "en-gb", "en-us", "en"]
  };
}

function includesAny(haystack, needles) {
  const value = String(haystack || "").toLowerCase();
  return needles.some((n) => value.includes(String(n).toLowerCase()));
}

function scoreVoiceForStyle(voice, style) {
  const name = String(voice?.name || "").toLowerCase();
  const lang = String(voice?.lang || "").toLowerCase();
  const local = Boolean(voice?.localService);

  let score = 0;
  if (local) score += 5;
  if (lang.startsWith("en")) score += 6;
  if (name.includes("microsoft")) score += 42;
  if (name.includes("natural")) score += 28;
  if (name.includes("online")) score += 14;
  if (name.includes("desktop")) score -= 3;

  // Simplified: always use male voice scoring
  if (includesAny(name, ["male", "david", "mark", "daniel", "george", "james"])) score += 35;
  if (lang.startsWith("en-gb") || lang.startsWith("en-us")) score += 8;
  if (includesAny(name, ["female", "zira", "susan", "samantha", "hazel", "aria"])) score -= 10;

  return score;
}

function sanitizeTextForSpeech(text) {
  let clean = String(text || "");
  if (!clean) return "";

  clean = clean
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\[[^\]]*]/g, " ")
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .replace(/([!?.,])\1{1,}/g, "$1")
    .replace(/[|_~]/g, " ")
    .trim();

  clean = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  return clean;
}

function pickVoiceForStyle(voices, style) {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const voice of list) {
    const score = scoreVoiceForStyle(voice, style);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best || pickPreferredVoice(list);
}

function maybeAnnounceVoiceSelection(voice) {
  if (!voice) return;
  const name = String(voice.name || "").trim();
  if (!name) return;
  if (state.lastPickedVoiceName === name) return;
  state.lastPickedVoiceName = name;
  if (state.voiceInfoShown) return;
  state.voiceInfoShown = true;
  showToast(`Voice selected: ${name}`, "ok");
}

function setVoiceStyle(style) {
  const next = style || "male_assistant";
  state.voiceStyle = next;
  localStorage.setItem("ATEAM_VOICE_STYLE", next);
  refreshVoices();
}

function refreshVoices() {
  if (!state.supportsTTS) return;
  state.availableVoices = window.speechSynthesis.getVoices() || [];
  const selected = pickVoiceForStyle(state.availableVoices, state.voiceStyle);
  if (selected) {
    state.preferredVoiceURI = selected.voiceURI;
    localStorage.setItem("ATEAM_VOICE_URI", selected.voiceURI);
    maybeAnnounceVoiceSelection(selected);
  }
}

function mapVoiceStyleToServerProfile(style) {
  // Simplified to use only male profile
  return "male";
}

function clearServerAudioPlayback() {
  const audio = state.ttsAudioElement;
  const url = state.ttsAudioUrl;
  if (audio) {
    try {
      audio.pause();
    } catch {}
    try {
      audio.removeAttribute("src");
      audio.load();
    } catch {}
  }
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  state.ttsAudioElement = null;
  state.ttsAudioUrl = "";
}

async function speakViaServerTts(cleanText, profile, sessionId) {
  const controller = new AbortController();
  state.activeTtsController = controller;
  let res;
  try {
    res = await fetch(apiUrl("/voice/speak"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText,
        profile
      }),
      signal: controller.signal
    });
  } catch (err) {
    if (controller.signal.aborted || err?.name === "AbortError") {
      throw new Error("server_tts_aborted");
    }
    throw err;
  } finally {
    if (state.activeTtsController === controller) {
      state.activeTtsController = null;
    }
  }

  if (!res.ok) {
    let details = "";
    let serverError = "";
    try {
      const body = await res.json();
      details = body?.details || body?.error || "";
      serverError = body?.error || "";
    } catch {
      try {
        details = await res.text();
      } catch {}
    }
    const err = new Error(`server_tts_failed_${res.status}${details ? `: ${details}` : ""}`);
    err.status = res.status;
    err.details = details;
    err.serverError = serverError;
    throw err;
  }

  const contentType = String(res.headers.get("content-type") || "");
  if (!contentType.includes("audio/")) {
    throw new Error("server_tts_invalid_content_type");
  }

  const blob = await res.blob();
  if (!blob || blob.size <= 0) {
    throw new Error("server_tts_empty_audio");
  }

  if (sessionId !== state.speechSession) {
    return;
  }

  clearServerAudioPlayback();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  state.ttsAudioElement = audio;
  state.ttsAudioUrl = url;

  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok, error) => {
      if (settled) return;
      settled = true;
      if (state.ttsAudioElement === audio) state.ttsAudioElement = null;
      if (state.ttsAudioUrl === url) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        state.ttsAudioUrl = "";
      }
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      if (ok) resolve();
      else reject(error || new Error("server_tts_playback_error"));
    };

    audio.onplay = () => {
      if (sessionId !== state.speechSession) {
        finish(true);
        return;
      }
      state.speaking = true;
      setTalkState("speaking");
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false, new Error("server_tts_playback_error"));
    audio.play().catch((err) => finish(false, err));
  });
}

function speakViaBrowserTts(clean, sessionId, resolve) {
  if (!state.supportsTTS) {
    if (!state.ttsWarningShown) {
      showToast("Speech output not supported in this browser.", "error");
      state.ttsWarningShown = true;
    }
    state.speaking = true;
    const chunks = chunkText(clean, 14);
    const ms = Math.max(1600, chunks.length * 620);
    setTimeout(() => {
      finalizeTtsSession(sessionId, state.ttsResolve);
      if (state.ttsResolve === resolve) state.ttsResolve = null;
      // Restart recognition after simulated speech
      if (state.sessionActive && sessionId === state.speechSession) {
        setTimeout(() => startRecognition(), 150);
      }
    }, ms);
    return;
  }

  ensureTtsReady();
  const styleConfig = getVoiceStyleConfig(state.voiceStyle);
  const selectedVoice =
    state.availableVoices.find((v) => v.voiceURI === state.preferredVoiceURI) ||
    pickVoiceForStyle(state.availableVoices, state.voiceStyle);

  let started = false;
  let retried = false;
  let startGuard = null;

  const clearStartGuard = () => {
    if (startGuard) {
      clearTimeout(startGuard);
      startGuard = null;
    }
  };

  const buildUtterance = (voiceOverride = null) => {
    const utter = new SpeechSynthesisUtterance(clean.slice(0, 1800));
    const voiceToUse = voiceOverride === undefined ? null : voiceOverride || selectedVoice;
    if (voiceToUse) utter.voice = voiceToUse;
    utter.rate = Math.max(0.82, Math.min(1.14, styleConfig.rate || TTS_CONFIG.rate));
    utter.pitch = Math.max(0.75, Math.min(1.25, styleConfig.pitch || TTS_CONFIG.pitch));
    utter.volume = styleConfig.volume || TTS_CONFIG.volume;
    return utter;
  };

  const finalize = () => {
    clearStartGuard();
    finalizeTtsSession(sessionId, state.ttsResolve);
    if (state.ttsResolve === resolve) state.ttsResolve = null;
    // Restart recognition after browser TTS finishes
    if (state.sessionActive && sessionId === state.speechSession) {
      setTimeout(() => startRecognition(), 150);
    }
  };

  const speakUtterance = (voiceOverride = null) => {
    const utter = buildUtterance(voiceOverride);

    utter.onstart = () => {
      if (sessionId !== state.speechSession) return;
      started = true;
      clearStartGuard();
      state.speaking = true;
      setTalkState("speaking");
    };

    utter.onend = () => {
      finalize();
    };

    utter.onerror = () => {
      if (!retried && sessionId === state.speechSession) {
        retried = true;
        clearStartGuard();
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.resume();
        } catch {}
        // Silent retry - don't show toast to avoid confusing user with multiple errors
        speakUtterance(undefined);
        return;
      }
      // If retry failed or was skipped, give up and finalize
      if (!state.ttsWarningShown) {
        showToast("Voice playback failed. I will keep text replies active.", "error");
        state.ttsWarningShown = true;
      }
      // Disable TTS after a hard failure to prevent repeated console noise / user confusion.
      runtimeState.ttsDisabled = true;
      updateTtsToggleUi();
      console.warn("tts_error", { style: state.voiceStyle, voice: selectedVoice?.name || "default" });
      finalize();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  startGuard = setTimeout(() => {
    if (started || retried || sessionId !== state.speechSession) return;
    retried = true;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}
    // Silent retry if speech synthesis is slow to start
    speakUtterance(undefined);
  }, 1200);

  speakUtterance(selectedVoice || null);
}

function finalizeTtsSession(sessionId, resolveFn) {
  if (sessionId !== state.speechSession) return;
  state.speaking = false;
  state.assistantSpeaking = false;
  state.activeAssistantTurnId = "";
  setRuntimeStateIdle(runtimeState.lastTurnId);
  stopSubtitleChunker();
  if (typeof resolveFn === "function") resolveFn();
}

function ttsStop() {
  if (state.activeTtsController) {
    try {
      state.activeTtsController.abort();
    } catch {}
    state.activeTtsController = null;
  }
  state.speechSession += 1;
  stopSubtitleChunker();
  clearServerAudioPlayback();
  if (state.supportsTTS) {
    window.speechSynthesis.cancel();
  }
  state.speaking = false;
  state.assistantSpeaking = false;
  state.activeAssistantTurnId = "";
  setRuntimeStateIdle(runtimeState.lastTurnId);
  hideSubtitleNode(subtitleAgent);
  if (state.ttsResolve) {
    const done = state.ttsResolve;
    state.ttsResolve = null;
    done();
  }
  updateStopVoiceBtnUi();
}

async function interruptActiveAssistant(reason = "user_interrupt", options = {}) {
  const resumeListening = options?.resumeListening !== false;
  const resetListening = options?.resetListening !== false;
  const speaking = state.talkState === "speaking" || state.speaking || state.assistantSpeaking;
  const thinking = state.talkState === "thinking" || state.assistantThinking || Boolean(state.pendingRequestController);
  if (!speaking && !thinking) return false;

  const activeTurnId = normalizeTurnId(state.pendingRequestTurnId || runtimeState.lastTurnId);
  state.lastInterruptTs = Date.now();
  if (activeTurnId) markTurnAborted(activeTurnId);

  cancelPendingThinking();
  if (speaking) ttsStop();
  stopSubtitleChunker("agent");
  hideSubtitleNode(subtitleAgent);
  clearSubtitleFadeTimer();
  setRuntimeStateIdle(activeTurnId || runtimeState.lastTurnId);
  setTalkState("idle");
  state.assistantThinking = false;
  state.assistantSpeaking = false;
  state.activeAssistantTurnId = "";
  setOrbSubtitle("");
  updateStopVoiceBtnUi();

  await emitEvent("assistant_interrupt_requested", "user", "talk", "Assistant interrupt requested", {
    activeTurnId: activeTurnId || undefined,
    reason
  });
  await emitEvent("assistant_interrupt_applied", "system", "talk", "Assistant interrupt applied", {
    previousTurnId: activeTurnId || undefined,
    aborted: true,
    reason
  });

  if (state.sessionActive && resumeListening) {
    await enterListeningState(resetListening);
  }
  return true;
}

async function handleStopVoiceTap() {
  const interrupted = await interruptActiveAssistant("user_interrupt", {
    resumeListening: true,
    resetListening: true
  });
  if (!interrupted) {
    showToast("Nothing to interrupt.", "ok");
    return;
  }
  showToast("Interrupted. Listening...", "ok");
}

function ensureTtsReady() {
  if (!state.supportsTTS) return;
  try {
    refreshVoices();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  } catch {}
}

function ttsSpeak(text) {
  const spoken = sanitizeTextForSpeech(text);
  const clean = spoken || String(text || "").trim();
  if (!clean) return Promise.resolve();
  if (runtimeState.ttsDisabled) return Promise.resolve();

  const sessionId = state.speechSession + 1;
  state.speechSession = sessionId;
  setRuntimeStateForAssistantSpeaking(runtimeState.lastTurnId);
  setTalkState("speaking");
  runSubtitleChunks("agent", clean, 460);

  return new Promise((resolve) => {
    state.ttsResolve = resolve;
    (async () => {
      // Stop recognition while agent speaks to prevent feedback loop
      await stopRecognition();

      let serverTtsAttempted = false;
      try {
        if (!state.serverTtsConfigured) {
          // Free fallback: browser TTS. (ElevenLabs subscription not required.)
          speakViaBrowserTts(clean, sessionId, resolve);
          return;
        }
        const profile = mapVoiceStyleToServerProfile(state.voiceStyle);
        serverTtsAttempted = true;
        await speakViaServerTts(clean, profile, sessionId);
        state.ttsServerWarningShown = false;
        if (sessionId === state.speechSession) {
          finalizeTtsSession(sessionId, state.ttsResolve);
          if (state.ttsResolve === resolve) state.ttsResolve = null;
          // Restart recognition after agent finishes speaking
          if (state.sessionActive) {
            setTimeout(() => startRecognition(), 150);
          }
        }
        return;
      } catch (err) {
        if (String(err?.message || "").includes("server_tts_aborted")) {
          return;
        }
        setRuntimeStateIdle(runtimeState.lastTurnId);
        console.warn("[TTS Error]", {
          status: err?.status,
          error: err?.error,
          details: err?.details,
          message: err?.message
        });
        if (!state.ttsServerWarningShown) {
          const detail = String(err?.details || err?.message || "").toLowerCase();
          if (detail.includes("quota")) {
            runtimeState.ttsDisabled = true;
            updateTtsToggleUi();
            showToast("Voice quota exhausted - text responses active.", "error");
          } else if (detail.includes("voice id") || detail.includes("set elevenlabs_voice")) {
            showToast("Set ELEVENLABS_VOICE in .env, then restart server.", "error");
          } else if (String(err?.status || "") === "503") {
            showToast("Voice service unavailable - text responses active.", "error");
          } else {
            showToast("Voice unavailable - text responses active.", "error");
          }
          state.ttsServerWarningShown = true;
        }
      }

      // Free fallback: if server TTS fails, switch to browser TTS and remember it.
      if (serverTtsAttempted && sessionId === state.speechSession) {
        state.serverTtsConfigured = false;
        speakViaBrowserTts(clean, sessionId, resolve);
      }
    })();
  });
}

function getVoiceConfirmThreshold() {
  try {
    const raw = Number(localStorage.getItem(VOICE_CONFIRM_THRESHOLD_KEY));
    if (Number.isFinite(raw) && raw >= 0 && raw <= 1) return raw;
  } catch {}
  return VOICE_CONFIRM_THRESHOLD_DEFAULT;
}

function normalizeTranscriptForDelta(text = "") {
  return normalizedSpace(text).toLowerCase();
}

function tokenizeTranscriptForDelta(text = "") {
  const normalized = normalizeTranscriptForDelta(text);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function classifyTranscriptDelta(originalText = "", finalText = "") {
  const originalNormalized = normalizeTranscriptForDelta(originalText);
  const finalNormalized = normalizeTranscriptForDelta(finalText);
  if (originalNormalized === finalNormalized) return "none";

  const originalTokens = tokenizeTranscriptForDelta(originalNormalized);
  const finalTokens = tokenizeTranscriptForDelta(finalNormalized);
  const minLen = Math.min(originalTokens.length, finalTokens.length);
  const tokenCountDelta = Math.abs(originalTokens.length - finalTokens.length);
  let tokenMismatchCount = tokenCountDelta;
  for (let i = 0; i < minLen; i += 1) {
    if (originalTokens[i] !== finalTokens[i]) tokenMismatchCount += 1;
  }

  if (originalTokens.length === finalTokens.length) {
    let mismatchCount = 0;
    for (let i = 0; i < originalTokens.length; i += 1) {
      if (originalTokens[i] !== finalTokens[i]) mismatchCount += 1;
      if (mismatchCount > 1) break;
    }
    if (mismatchCount === 1) return "substitution";
  }

  const longerLen = Math.max(originalNormalized.length, finalNormalized.length);
  const lengthDelta = Math.abs(originalNormalized.length - finalNormalized.length);
  const longerTokenLen = Math.max(originalTokens.length, finalTokens.length);
  const isSmallTextDelta = longerLen > 0 && lengthDelta / longerLen <= 0.2;
  const maxMinorTokenDelta = Math.max(2, Math.ceil(longerTokenLen * 0.2));
  if (isSmallTextDelta && tokenMismatchCount <= maxMinorTokenDelta) return "minor_edit";
  return "rewrite";
}

function extractSubstitutionPair(originalText = "", finalText = "") {
  const originalTokens = tokenizeTranscriptForDelta(originalText);
  const finalTokens = tokenizeTranscriptForDelta(finalText);
  if (!originalTokens.length || originalTokens.length !== finalTokens.length) return null;
  let mismatchIndex = -1;
  for (let i = 0; i < originalTokens.length; i += 1) {
    if (originalTokens[i] === finalTokens[i]) continue;
    if (mismatchIndex >= 0) return null;
    mismatchIndex = i;
  }
  if (mismatchIndex < 0) return null;
  const heard = String(originalTokens[mismatchIndex] || "").trim();
  const corrected = String(finalTokens[mismatchIndex] || "").trim();
  if (!heard || !corrected || heard === corrected) return null;
  return { heard, corrected };
}

function loadConfusionMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFUSION_MAP_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveConfusionMap(map) {
  const safeMap = map && typeof map === "object" && !Array.isArray(map) ? map : {};
  try {
    const rows = Object.entries(safeMap).map(([key, value]) => {
      const entry = value && typeof value === "object" ? value : {};
      return {
        key,
        heard: String(entry.heard || "").trim(),
        corrected: String(entry.corrected || "").trim(),
        count: Math.max(1, Math.round(Number(entry.count) || 1)),
        lastSeenAt: Math.max(0, Number(entry.lastSeenAt) || Date.now())
      };
    });
    rows.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    const trimmed = rows.slice(0, CONFUSION_MAP_MAX_ITEMS);
    const compact = {};
    for (const row of trimmed) {
      if (!row.heard || !row.corrected) continue;
      compact[row.key] = {
        heard: row.heard,
        corrected: row.corrected,
        count: row.count,
        lastSeenAt: row.lastSeenAt
      };
    }
    localStorage.setItem(CONFUSION_MAP_KEY, JSON.stringify(compact));
  } catch {}
}

function recordConfusionPair(heard = "", corrected = "") {
  const heardToken = normalizeTranscriptForDelta(heard);
  const correctedToken = normalizeTranscriptForDelta(corrected);
  if (!heardToken || !correctedToken || heardToken === correctedToken) return;
  const key = `${heardToken}|${correctedToken}`;
  const map = loadConfusionMap();
  const prev = map[key] && typeof map[key] === "object" ? map[key] : {};
  map[key] = {
    heard: heardToken,
    corrected: correctedToken,
    count: Math.max(0, Number(prev.count) || 0) + 1,
    lastSeenAt: Date.now()
  };
  saveConfusionMap(map);
}

const TRANSCRIPT_SUGGESTION_TERMS = [
  "basketball",
  "banff",
  "tesla",
  "codex",
  "claude",
  "ateam",
  "peacepad",
  "warri",
  "podcast",
  "mark",
  "mike",
  "manchi"
];

function buildTranscriptSuggestions(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const suggestions = [];
  const lower = raw.toLowerCase();
  for (const term of TRANSCRIPT_SUGGESTION_TERMS) {
    if (suggestions.length >= 3) break;
    if (lower.includes(term)) continue;
    const normalizedTerm = term === "ateam" ? "ATEAM" : term.charAt(0).toUpperCase() + term.slice(1);
    if (term === "basketball") {
      suggestions.push(raw.replace(/\bfurniture\b/gi, "basketball").replace(/\bsoccer\b/gi, "basketball"));
      continue;
    }
    if (term === "podcast") {
      suggestions.push(raw.replace(/\bpost ?cast\b/gi, "podcast"));
      continue;
    }
    if (term === "warri") {
      suggestions.push(raw.replace(/\bworry\b/gi, "Warri"));
      continue;
    }
    if (/\b(mark|mike|manchi)\b/.test(term)) {
      suggestions.push(raw.replace(/\bmark\b|\bmike\b|\bmanchi\b/gi, normalizedTerm));
      continue;
    }
    suggestions.push(`${raw} ${normalizedTerm}`.trim());
  }
  const seen = new Set();
  return suggestions
    .map((s) => String(s || "").trim())
    .filter((s) => s && s.toLowerCase() !== lower && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

function renderFallbackSuggestions(suggestions = []) {
  if (!fallbackSuggestions) return;
  const rows = Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
  fallbackSuggestions.innerHTML = "";
  if (!rows.length) {
    fallbackSuggestions.classList.add("hidden");
    return;
  }
  fallbackSuggestions.classList.remove("hidden");
  for (const suggestion of rows) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "fallback-suggestion-chip";
    chip.textContent = suggestion;
    chip.dataset.suggestion = suggestion;
    fallbackSuggestions.appendChild(chip);
  }
}

function openFallbackComposer(seedText = "", options = {}) {
  if (!fallbackComposer || !fallbackInput) return;
  const text = String(seedText || "").trim();
  const includeSuggestions = options?.includeSuggestions !== false;
  fallbackComposer.classList.remove("hidden");
  state.fallbackOpen = true;
  fallbackInput.value = text;
  state.pendingVoiceDraftOriginalText = text;
  state.pendingVoiceDraftSuggestions = includeSuggestions ? buildTranscriptSuggestions(text) : [];
  renderFallbackSuggestions(state.pendingVoiceDraftSuggestions);
  fallbackInput.focus();
}

function closeFallbackComposer() {
  if (!fallbackComposer || !fallbackInput) return;
  fallbackComposer.classList.add("hidden");
  fallbackInput.value = "";
  state.fallbackOpen = false;
  state.pendingVoiceDraft = null;
  state.pendingVoiceDraftSuggestions = [];
  state.pendingVoiceDraftOriginalText = "";
  renderFallbackSuggestions([]);
}

async function submitFallbackComposer() {
  if (!fallbackInput) return;
  const finalText = String(fallbackInput.value || "").trim();
  if (!finalText) return;
  if (state.reviewMode && !state.sessionActive) {
    showToast("Review mode is active. Disable it to send new turns.", "error");
    return;
  }
  const draftMeta =
    state.pendingVoiceDraft && typeof state.pendingVoiceDraft === "object" ? { ...state.pendingVoiceDraft } : null;
  const originalDraftText = String(draftMeta?.originalDraftText || state.pendingVoiceDraftOriginalText || "").trim();
  const originalText = originalDraftText;
  const edited = normalizeTranscriptForDelta(originalText) !== normalizeTranscriptForDelta(finalText);
  const deltaType = classifyTranscriptDelta(originalText, finalText);
  const confidenceValue = Number.isFinite(Number(draftMeta?.confidence)) ? Number(draftMeta.confidence) : null;
  const speakerId = normalizeSpeakerId(draftMeta?.speakerId || state.currentSpeakerId);
  const voiceConfirmThreshold = getVoiceConfirmThreshold();
  const source = String(draftMeta?.source || "").trim().toLowerCase();
  if (source === "voice") {
    await emitEvent("voice_transcript_confirmation_submitted", "user", "talk", "Voice transcript confirmed", {
      originalDraftText: originalDraftText.slice(0, 220),
      originalText: originalText.slice(0, 220),
      finalText: finalText.slice(0, 220),
      edited,
      deltaType,
      confidence: confidenceValue,
      speakerId,
      turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
    });
    if (confidenceValue !== null && confidenceValue < voiceConfirmThreshold && deltaType === "substitution") {
      const substitution = extractSubstitutionPair(originalText, finalText);
      if (substitution) {
        recordConfusionPair(substitution.heard, substitution.corrected);
      }
    }
  }
  closeFallbackComposer();
  const sendMeta = draftMeta
    ? {
        audioStartMs: Number(draftMeta.audioStartMs) || undefined,
        audioEndMs: Number(draftMeta.audioEndMs) || undefined,
        confidence: Number.isFinite(Number(draftMeta.confidence)) ? Number(draftMeta.confidence) : undefined,
        speakerId: draftMeta.speakerId || state.currentSpeakerId
      }
    : {};
  await processTalkMessage(finalText, sendMeta);
}

async function retryFallbackComposer() {
  const draftMeta =
    state.pendingVoiceDraft && typeof state.pendingVoiceDraft === "object" ? { ...state.pendingVoiceDraft } : null;
  const source = String(draftMeta?.source || "").trim().toLowerCase();
  if (source === "voice") {
    await emitEvent("voice_transcript_confirmation_retried", "user", "talk", "Voice transcript retry requested", {
      draftText: String(draftMeta?.originalDraftText || "").slice(0, 220),
      confidence: Number.isFinite(Number(draftMeta?.confidence)) ? Number(draftMeta.confidence) : null,
      speakerId: normalizeSpeakerId(draftMeta?.speakerId || state.currentSpeakerId),
      turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
    });
  }
  closeFallbackComposer();
  if (state.sessionActive) {
    await enterListeningState(true);
    showToast("Listening again. Speak your turn.", "ok");
  }
}

async function cancelFallbackComposer() {
  const draftMeta =
    state.pendingVoiceDraft && typeof state.pendingVoiceDraft === "object" ? { ...state.pendingVoiceDraft } : null;
  const source = String(draftMeta?.source || "").trim().toLowerCase();
  if (source === "voice") {
    await emitEvent("voice_transcript_confirmation_cancelled", "user", "talk", "Voice transcript confirmation cancelled", {
      draftText: String(draftMeta?.originalDraftText || "").slice(0, 220),
      confidence: Number.isFinite(Number(draftMeta?.confidence)) ? Number(draftMeta.confidence) : null,
      speakerId: normalizeSpeakerId(draftMeta?.speakerId || state.currentSpeakerId),
      turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
    });
  }
  closeFallbackComposer();
  if (state.sessionActive) {
    await enterListeningState(false);
  } else {
    setTalkState("idle");
    setOrbSubtitle("");
  }
}

function buildTalkContextPack(userMessage, turnMeta = {}) {
  const allEvents = Array.isArray(timelineState.events) ? timelineState.events : [];
  const normalizedConversation = allEvents
    .filter((event) => {
      const type = String(event?.type || "");
      return type === "talk_turn_committed" || type === "assistant_response_completed";
    }).map((event) => {
      const type = String(event?.type || "");
      const meta = event?.meta && typeof event.meta === "object" ? event.meta : {};
      if (type === "talk_turn_committed") {
        const speakerId = getEffectiveSpeakerId(event);
        return {
          role: "user",
          content: String(meta?.text || event?.summary || "").trim(),
          turnId: normalizeTurnId(event?.turnId || meta?.turnId || "") || null,
          speakerId,
          speakerLabel: speakerLabelById(speakerId),
          timestamp: event?.timestamp || null
        };
      }
      const assistantText = String(meta?.agentReply || event?.summary || "").trim();
      return {
        role: "assistant",
        content: assistantText,
        turnId: normalizeTurnId(event?.turnId || meta?.turnId || "") || null,
        speakerId: "ai_podcast",
        speakerLabel: "Manchi AI",
        timestamp: event?.timestamp || null
      };
    }).filter((entry) => String(entry?.content || "").trim());

  const dedupedConversation = [];
  for (const entry of normalizedConversation) {
    const prev = dedupedConversation[dedupedConversation.length - 1];
    const isDuplicateAssistantLine =
      prev &&
      entry?.role === "assistant" &&
      prev.role === "assistant" &&
      String(prev.content || "").trim() === String(entry.content || "").trim();
    if (isDuplicateAssistantLine) continue;
    dedupedConversation.push(entry);
  }

  const selectedIndexes = new Set();
  let remainingUsers = 6;
  let remainingAssistants = 6;
  for (let i = dedupedConversation.length - 1; i >= 0; i -= 1) {
    const entry = dedupedConversation[i];
    if (entry.role === "user" && remainingUsers > 0) {
      selectedIndexes.add(i);
      remainingUsers -= 1;
      continue;
    }
    if (entry.role === "assistant" && remainingAssistants > 0) {
      selectedIndexes.add(i);
      remainingAssistants -= 1;
    }
    if (remainingUsers <= 0 && remainingAssistants <= 0) break;
  }
  const recentConversation = dedupedConversation.filter((_, idx) => selectedIndexes.has(idx));

  const recentHighlights = allEvents
    .filter((event) => String(event?.type || "") === "highlight_marked")
    .slice(-3)
    .map((event) => ({
      timestamp: event?.timestamp || null,
      summary: String(event?.summary || "").trim(),
      turnId: normalizeTurnId(event?.turnId || event?.meta?.turnId || "") || null,
      chapterId: String(event?.meta?.chapterId || "").trim() || null
    }));

  const latestSummaryEvent = [...allEvents].reverse().find((event) => String(event?.type || "") === "session_summary_generated");
  const latestClarityEvent = [...allEvents].reverse().find((event) => String(event?.type || "") === "speech_clarity_report_generated");
  const lastChapter = chapterState.chapters.length ? chapterState.chapters[chapterState.chapters.length - 1] : null;
  const latestAnalyticsKey = String(speakerAnalyticsState.analyticsKey || "").trim() || null;
  const activeSpeakerId = normalizeSpeakerId(turnMeta?.speakerId || state.currentSpeakerId || "unknown");

  return {
    sessionId: GLOBAL_PODCAST_ID,
    mode: "talk",
    reviewMode: Boolean(state.reviewMode),
    activeSpeaker: {
      speakerId: activeSpeakerId,
      speakerLabel: speakerLabelById(activeSpeakerId)
    },
    currentTurn: {
      turnId: normalizeTurnId(turnMeta?.turnId || "") || null,
      segmentId: String(turnMeta?.segmentId || "").trim() || null,
      userMessage: String(userMessage || "").trim(),
      timestamp: new Date().toISOString()
    },
    recentConversation,
    recentHighlights,
    lastChapterTitle: lastChapter ? String(lastChapter.title || "").trim() : null,
    analyticsKey: latestAnalyticsKey,
    lastSessionSummary: latestSummaryEvent
      ? { timestamp: latestSummaryEvent.timestamp || null, summary: String(latestSummaryEvent.summary || "").trim() }
      : null,
    lastClaritySummary: latestClarityEvent
      ? { timestamp: latestClarityEvent.timestamp || null, summary: String(latestClarityEvent.summary || "").trim() }
      : null
  };
}

async function runAgentCommand(message, mode, signal, extra = {}) {
  const payload = {
    taskId: mode === "talk" ? GLOBAL_PODCAST_ID : state.activeTaskId || GLOBAL_TASK_ID,
    agent: mode === "talk" ? "podcast" : state.activeAgent,
    message,
    mode,
    voiceStyle: state.voiceStyle,
    contextPack: extra?.contextPack && typeof extra.contextPack === "object" ? extra.contextPack : undefined
  };

  try {
    const data = await apiRequest("/agent/command", { method: "POST", body: payload, signal });
    setApiOnline(true);
    return data;
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    if (isRequestInFlightError(err)) throw err;
    setApiOnline(false);
    return {
      ok: true,
      taskId: payload.taskId,
      agent: payload.agent,
      reply: `Let us keep this conversational and research-first. You said: ${message}`,
      updatedThread: null
    };
  }
}

async function runAgentCommandStream(message, signal, onPhrase, extra = {}) {
  const payload = {
    taskId: GLOBAL_PODCAST_ID,
    agent: "podcast",
    message,
    mode: "talk",
    voiceStyle: state.voiceStyle,
    contextPack: extra?.contextPack && typeof extra.contextPack === "object" ? extra.contextPack : undefined
  };

  const res = await fetch(apiUrl("/agent/command/stream"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });
  if (!res.ok || !res.body) {
    let details = "";
    let payloadObj = null;
    try {
      details = await res.text();
      payloadObj = details ? JSON.parse(details) : null;
    } catch {}
    const err = new Error(`stream_failed_${res.status}${details ? `: ${details}` : ""}`);
    err.status = res.status;
    err.payload = payloadObj;
    err.details = details;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let phraseBuffer = "";
  let fullText = "";
  let donePayload = null;
  let metaPayload = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = sseBuffer.indexOf("\n\n")) >= 0) {
      const block = sseBuffer.slice(0, idx);
      sseBuffer = sseBuffer.slice(idx + 2);
      const parsed = parseSseBlock(block);
      if (!parsed) continue;
      const eventName = parsed.eventName;
      const payloadObj = parsed.payload;

      if (eventName === "token") {
        const token =
          typeof payloadObj === "string"
            ? payloadObj
            : String(payloadObj?.token || payloadObj?.delta || payloadObj?.text || "");
        if (!token) continue;
        fullText += token;
        phraseBuffer += token;
        phraseBuffer = pushBufferedStreamPhrases(phraseBuffer, onPhrase);
      } else if (eventName === "done") {
        donePayload = payloadObj;
      } else if (eventName === "meta") {
        metaPayload = payloadObj;
      } else if (eventName === "error") {
        if (typeof payloadObj === "string") throw new Error(payloadObj || "stream_error");
        throw new Error(String(payloadObj?.message || payloadObj?.error || "stream_error"));
      }
    }
  }

  if (sseBuffer.trim()) {
    const parsed = parseSseBlock(sseBuffer);
    if (parsed) {
      if (parsed.eventName === "token") {
        const token =
          typeof parsed.payload === "string"
            ? parsed.payload
            : String(parsed.payload?.token || parsed.payload?.delta || parsed.payload?.text || "");
        if (token) {
          fullText += token;
          phraseBuffer += token;
        }
      } else if (parsed.eventName === "done") {
        donePayload = parsed.payload;
      } else if (parsed.eventName === "meta") {
        metaPayload = parsed.payload;
      }
    }
  }

  finalizeStreamPhraseBuffer(phraseBuffer, onPhrase);
  return resultFromStream(donePayload, fullText, metaPayload);
}

function parseTalkWorkItemPrefix(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^(factory|build|qa|review|ship)\s*:\s*(.*)$/i);
  if (!match) return null;
  const cmd = String(match[1] || "").trim().toLowerCase();
  const body = String(match[2] || "").trim();

  const stageMap = {
    factory: "BACKLOG",
    build: "BUILD",
    qa: "QA",
    review: "REVIEW",
    ship: "SHIP"
  };
  const stage = stageMap[cmd] || "BACKLOG";
  return { cmd, stage, body };
}

async function maybeCreateWorkItemFromTalk(text, { turnId, segmentId } = {}) {
  const parsed = parseTalkWorkItemPrefix(text);
  if (!parsed) return null;

  const title = parsed.body ? parsed.body.slice(0, 120) : `${parsed.cmd.toUpperCase()} item`;
  const objective = parsed.body || "";
  const payload = {
    title,
    objective,
    stage: parsed.stage,
    risk: "low",
    owner_agent_id: "",
    data: {
      createdFrom: "talk_prefix",
      command: parsed.cmd,
      rawText: String(text || ""),
      turnId: normalizeTurnId(turnId) || null,
      segmentId: String(segmentId || "").trim() || null
    },
    sessionId: GLOBAL_PODCAST_ID,
    actor: "user",
    reason: `talk_prefix:${parsed.cmd}`
  };

  try {
    const item = await apiCreateWorkItem(payload);
    if (!item) return null;

    await emitEvent("decision", "user", "talk", `Created job: ${item.title}`, {
      source: { kind: "talk" },
      targets: { page: "factory", workItemId: item.id },
      severity: "info",
      data: { stage: item.stage, command: parsed.cmd, turnId: normalizeTurnId(turnId) || null }
    });

    showToast(`Factory: ${item.title}`, "ok");
    return item;
  } catch (err) {
    console.error("[Talk->Factory] Failed to create job", err);
    showToast("Factory job failed to create.", "error");
    return null;
  }
}

async function processTalkMessage(message, opts = {}) {
  const text = String(message || "").trim();
  if (!text) return;
  if (state.pendingRequestController || state.talkState === "thinking") {
    showToast("Please wait - still processing previous turn.", "error");
    await emitEvent("assistant_request_skipped", "system", "talk", "Skipped overlapping request", {
      reason: "request_in_flight",
      userMessage: text,
      turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
    });
    return;
  }
  const nowMs = Date.now();
  const audioStartMs = Math.max(0, Number(opts?.audioStartMs) || Number(state.turnAudioStartMs) || nowMs);
  const audioEndMs = Math.max(audioStartMs, Number(opts?.audioEndMs) || Number(state.turnAudioEndMs) || Number(state.sttLastUpdateTs) || nowMs);
  const sampleCount = Number(state.turnConfidenceSamples) || 0;
  const avgConfidence = sampleCount > 0 ? (Number(state.turnConfidenceTotal) || 0) / sampleCount : null;
  const confidence = Number.isFinite(Number(opts?.confidence)) ? Number(opts.confidence) : avgConfidence;
  const speakerId = normalizeSpeakerId(opts?.speakerId || state.currentSpeakerId);
  const speakerLabel = speakerLabelById(speakerId);
  const segmentId = await ensureActiveSegment("turn_commit", audioStartMs);
  const turnId = createTurnId();
  setRuntimeStateForTurnCommitted(turnId);

  closeFallbackComposer();
  appendTranscriptLine("you", text, speakerLabelById(speakerId));
  queueUserSubtitle(text);
  setTalkState("thinking");
  setOrbSubtitle("");

  // Emit: talk turn committed
  await emitEvent("talk_turn_committed", "user", "talk", `User said: ${text.slice(0, 100)}`, {
    text,
    turnId,
    segmentId,
    speakerId,
    speakerLabel,
    audioStartMs,
    audioEndMs,
    confidence
  });
  await emitEvent("speaker_labeled", "user", "talk", `Speaker: ${speakerLabel}`, {
    turnId,
    segmentId,
    speakerId,
    speakerLabel
  });

  const createdWorkItem = await maybeCreateWorkItemFromTalk(text, { turnId, segmentId });
  const contextPack = buildTalkContextPack(text, { turnId, segmentId, speakerId });
  if (createdWorkItem) {
    contextPack.createdWorkItem = {
      id: createdWorkItem.id,
      stage: createdWorkItem.stage,
      title: createdWorkItem.title
    };
  }

  const requestToken = state.pendingRequestToken + 1;
  state.pendingRequestToken = requestToken;
  const controller = new AbortController();
  state.pendingRequestController = controller;
  state.pendingRequestTurnId = turnId;
  clearTurnAborted(turnId);
  updateStopVoiceBtnUi();

  let result;
  let streamStarted = false;
  let retriedAfterInterrupt = false;
  const retryAfterInterruptDelay = async () => {
    await new Promise((resolve) => setTimeout(resolve, INTERRUPT_RETRY_DELAY_MS));
  };
  const recentlyInterrupted = () => Date.now() - Number(state.lastInterruptTs || 0) <= INTERRUPT_RETRY_WINDOW_MS;
  const runAgentRequest = async () => {
    if (state.talkStreamEnabled) {
      return runAgentCommandStream(text, controller.signal, (phrase) => {
        if (state.pendingRequestToken !== requestToken) return;
        if (isTurnAborted(turnId)) return;
        if (normalizeTurnId(state.activeAssistantTurnId) !== turnId) return;
        if (!streamStarted) {
          streamStarted = true;
          setTalkState("thinking");
        }
        pushStreamPhraseToSubtitle(phrase);
      }, { contextPack });
    }
    return runAgentCommand(text, "talk", controller.signal, { contextPack });
  };
  const runAgentRequestWithInterruptRetry = async () => {
    try {
      return await runAgentRequest();
    } catch (err) {
      if (!isRequestInFlightError(err)) throw err;
      if (!recentlyInterrupted() || retriedAfterInterrupt) throw err;
      retriedAfterInterrupt = true;
      await retryAfterInterruptDelay();
      if (state.pendingRequestToken !== requestToken || isTurnAborted(turnId)) throw err;
      return runAgentRequest();
    }
  };
  try {
    // Emit: assistant response started
    state.activeAssistantTurnId = turnId;
    setRuntimeStateForAssistantStarted(turnId);
    await emitEvent("assistant_response_started", "podcast", "talk", "Agent processing...", { userMessage: text, turnId, segmentId });
    result = await runAgentRequestWithInterruptRetry();
  } catch (err) {
    if (err?.name === "AbortError") {
      markTurnAborted(turnId);
      if (normalizeTurnId(state.activeAssistantTurnId) === turnId) state.activeAssistantTurnId = "";
      setRuntimeStateIdle(turnId);
      state.assistantThinking = false;
      state.assistantSpeaking = false;
      setOrbSubtitle("");
      // If a stream is aborted (navigation, interruption), do not leave the UI stuck in "Thinking".
      if (state.sessionActive) {
        await enterListeningState(true);
      } else {
        setTalkState("idle");
      }
      return;
    }
    if (isRequestInFlightError(err)) {
      showToast("Processing previous turn", "ok");
      await emitEvent("assistant_request_skipped", "system", "talk", "Skipped overlapping request", {
        reason: "server_request_in_flight",
        userMessage: text,
        turnId
      });
      setRuntimeStateIdle(turnId);
      if (normalizeTurnId(state.activeAssistantTurnId) === turnId) state.activeAssistantTurnId = "";
      if (state.sessionActive) {
        await enterListeningState(true);
      } else {
        setTalkState("idle");
      }
      return;
    }
    // Emit: error event
    await emitEvent("error", "podcast", "talk", `Error processing message`, {
      error: err?.message,
      userMessage: text,
      turnId,
      segmentId
    });
    try {
      result = await runAgentCommand(text, "talk", controller.signal, { contextPack });
    } catch (fallbackErr) {
      if (isRequestInFlightError(fallbackErr)) {
        showToast("Processing previous turn", "ok");
        await emitEvent("assistant_request_skipped", "system", "talk", "Skipped overlapping request", {
          reason: "server_request_in_flight",
          userMessage: text,
          turnId
        });
        setRuntimeStateIdle(turnId);
        if (normalizeTurnId(state.activeAssistantTurnId) === turnId) state.activeAssistantTurnId = "";
        if (state.sessionActive) await enterListeningState(true);
        return;
      }
      throw fallbackErr;
    }
  } finally {
    if (state.pendingRequestToken === requestToken) {
      state.pendingRequestController = null;
      state.pendingRequestTurnId = "";
      updateStopVoiceBtnUi();
    }
  }

  if (
    state.pendingRequestToken !== requestToken ||
    state.talkState !== "thinking" ||
    isTurnAborted(turnId) ||
    normalizeTurnId(state.activeAssistantTurnId) !== turnId
  ) {
    return;
  }

  clearTurnAborted(turnId);
  const reply = normalizeAssistantReplyText(result?.reply || "No response returned.");
  setRuntimeStateForAssistantCompleted(turnId);

  // Emit: assistant response completed
  await emitEvent("assistant_response_completed", result?.agent || "podcast", "talk", `Agent said: ${reply.slice(0, 100)}`, {
    agentReply: reply,
    userMessage: text,
    turnId,
    segmentId
  });

  if (Array.isArray(result?.updatedThread) && result.updatedThread.length) {
    state.currentThread = result.updatedThread;
    saveLocalThread(state.currentThread);
    appendTranscriptLine("agent", reply, result?.agent || "podcast");
  } else if (result?.transport === "stream") {
    const nowIso = new Date().toISOString();
    state.currentThread.push({ role: "user", content: text, agent: "", ts: nowIso });
    state.currentThread.push({ role: "assistant", content: reply, agent: result?.agent || "podcast", ts: nowIso });
    saveLocalThread(state.currentThread);
    appendTranscriptLine("agent", reply, result?.agent || "podcast");
  } else {
    await appendMessageFallback(GLOBAL_PODCAST_ID, "user", text, "");
    await appendMessageFallback(GLOBAL_PODCAST_ID, "assistant", reply, result?.agent || "podcast");
    appendTranscriptLine("agent", reply, result?.agent || "podcast");
  }

  if (!streamStarted) {
    runSubtitleChunks("agent", reply, { append: false, minWords: 6, maxWords: 12 });
  }
  await ttsSpeak(reply);
  if (!state.speaking) state.activeAssistantTurnId = "";

  if (!state.sessionActive) {
    setTalkState("idle");
    setOrbSubtitle("");
    return;
  }
  await enterListeningState(true);
}

function resetTurnTracking() {
  state.speakingStartTs = 0;
  state.silenceStartTs = 0;
  state.silenceWindowStartTs = 0;
  state.silenceStartedEventSent = false;
  state.silenceEndedEventSent = false;
  state.silenceWindowLocked = false;
  state.silenceChapterCreated = false;
  state.turnAudioStartMs = 0;
  state.turnAudioEndMs = 0;
  state.turnConfidenceTotal = 0;
  state.turnConfidenceSamples = 0;
  state.sttLastUpdateTs = 0;
  state.turnHadSpeech = false;
  state.bargeStartTs = 0;
}

function resetSilenceWindowTracking() {
  state.silenceWindowStartTs = 0;
  state.silenceStartedEventSent = false;
  state.silenceEndedEventSent = false;
  state.silenceChapterCreated = false;
}

async function ensureSilenceStartedEvent(nowMs) {
  if (!state.silenceWindowStartTs) state.silenceWindowStartTs = nowMs;
  const durationMs = nowMs - state.silenceWindowStartTs;
  if (durationMs < SILENCE_EVENT_START_MS || state.silenceStartedEventSent) return durationMs;
  state.silenceStartedEventSent = true;
  await emitEvent("silence_started", "system", "talk", "Silence started", {
    atMs: state.silenceWindowStartTs,
    thresholdMs: SILENCE_EVENT_START_MS,
    turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
  });
  return durationMs;
}

async function closeSilenceWindow(endAtMs, opts = {}) {
  const rotateOnLongSilence = opts?.rotateSegment !== false;
  if (!state.silenceWindowStartTs) return 0;
  const durationMs = Math.max(0, endAtMs - state.silenceWindowStartTs);
  if (state.silenceStartedEventSent && !state.silenceEndedEventSent) {
    state.silenceEndedEventSent = true;
    await emitEvent("silence_ended", "system", "talk", `Silence ended (${formatDurationMs(durationMs)})`, {
      atMs: endAtMs,
      durationMs,
      turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
    });
  }
  if (!state.silenceChapterCreated && durationMs >= CHAPTER_SILENCE_THRESHOLD_MS) {
    state.silenceChapterCreated = true;
    if (rotateOnLongSilence) {
      await rotateSegment("long_silence", endAtMs);
    }
    await createChapter("long_silence", {
      endAtMs,
      summary: `Long silence break (${formatDurationMs(durationMs)})`
    });
    state.silenceWindowLocked = true;
  }
  resetSilenceWindowTracking();
  return durationMs;
}

function collectRecognizedTurn() {
  return `${state.listeningFinal} ${state.listeningInterim}`.trim();
}

async function finalizeTurnFromSilence() {
  if (!state.sessionActive || state.turnFinalizePending || state.talkState !== "listening") return;
  state.turnFinalizePending = true;
  await closeSilenceWindow(Date.now());
  const nowMs = Date.now();
  const audioStartMs = Math.max(0, Number(state.turnAudioStartMs) || Number(state.speakingStartTs) || nowMs);
  const audioEndMs = Math.max(audioStartMs, Number(state.turnAudioEndMs) || Number(state.sttLastUpdateTs) || nowMs);
  const confidence = state.turnConfidenceSamples > 0 ? state.turnConfidenceTotal / state.turnConfidenceSamples : null;
  const collected = collectRecognizedTurn();
  await stopRecognition();
  state.listeningFinal = "";
  state.listeningInterim = "";
  if (!collected) {
    resetTurnTracking();
    state.turnFinalizePending = false;
    await enterListeningState(false);
    return;
  }
  try {
    const speakerId = normalizeSpeakerId(state.currentSpeakerId);
    const speakerLabel = speakerLabelById(speakerId);
    const voiceConfirmThreshold = getVoiceConfirmThreshold();
    const hasFiniteConfidence = Number.isFinite(Number(confidence));
    const shouldAutoCommit = hasFiniteConfidence && Number(confidence) >= voiceConfirmThreshold;
    if (shouldAutoCommit) {
      closeFallbackComposer();
      await emitEvent("voice_transcript_auto_committed", "user", "talk", "Voice transcript auto-committed", {
        originalText: collected.slice(0, 220),
        finalText: collected.slice(0, 220),
        confidence: Number(confidence),
        autoCommitted: true,
        speakerId,
        speakerLabel,
        turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
      });
      await processTalkMessage(collected, {
        audioStartMs,
        audioEndMs,
        confidence: Number(confidence),
        speakerId
      });
      return;
    }

    state.pendingVoiceDraft = {
      source: "voice",
      audioStartMs,
      audioEndMs,
      confidence,
      speakerId,
      originalDraftText: collected
    };
    await emitEvent("voice_transcript_confirmation_requested", "system", "talk", "Confirm transcript before send", {
      draftText: collected.slice(0, 180),
      confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
      speakerId,
      turnId: normalizeTurnId(runtimeState.lastTurnId) || undefined
    });
    openFallbackComposer(collected, { includeSuggestions: true });
    setTalkState("idle");
    setOrbSubtitle("");
    showToast("Confirm transcript before send.", "ok");
    return;
  } finally {
    state.turnFinalizePending = false;
  }
}

function getRawRms() {
  if (!state.analyser || !state.analyserData) return 0;
  state.analyser.getByteTimeDomainData(state.analyserData);
  let sum = 0;
  for (let i = 0; i < state.analyserData.length; i += 1) {
    const v = (state.analyserData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / state.analyserData.length);
}

async function calibrateNoiseFloor(durationMs = 420) {
  const started = performance.now();
  let samples = 0;
  let total = 0;
  while (performance.now() - started < durationMs) {
    const rms = getRawRms();
    if (rms > 0) {
      samples += 1;
      total += rms;
    }
    await new Promise((resolve) => setTimeout(resolve, 34));
  }
  const floor = samples ? total / samples : 0.008;
  state.noiseFloor = Math.max(0.004, Math.min(0.03, floor));
  state.silenceThreshold = Math.max(0.01, Math.min(0.06, state.noiseFloor * 1.9));
}

function stopSilenceMonitor() {
  if (state.silenceMonitorTimer) {
    clearInterval(state.silenceMonitorTimer);
    state.silenceMonitorTimer = null;
  }
}

function startSilenceMonitor() {
  stopSilenceMonitor();
  state.silenceMonitorTimer = setInterval(async () => {
    if (!state.sessionActive || !state.analyser) return;
    const rms = getRawRms();
    const now = Date.now();
    const threshold = state.silenceThreshold;

    if (state.talkState === "speaking" || state.talkState === "thinking") {
      if (rms > threshold * 1.15) {
        if (!state.bargeStartTs) state.bargeStartTs = now;
        if (now - state.bargeStartTs >= 320) {
          state.bargeStartTs = 0;
          await interruptActiveAssistant("voice_barge_in", {
            resumeListening: true,
            resetListening: true
          });
        }
      } else {
        state.bargeStartTs = 0;
      }
      return;
    }

    if (state.talkState !== "listening" || state.turnFinalizePending) return;

    if (
      state.supportsRecognition &&
      state.turnHadSpeech &&
      state.sttLastUpdateTs > 0 &&
      now - state.sttLastUpdateTs >= state.silenceMs &&
      !String(state.listeningInterim || "").trim()
    ) {
      await finalizeTurnFromSilence();
      return;
    }

    if (rms > threshold) {
      if (state.silenceWindowStartTs) {
        await closeSilenceWindow(now);
      }
      state.silenceWindowLocked = false;
      if (!state.speakingStartTs) state.speakingStartTs = now;
      if (!state.turnAudioStartMs) state.turnAudioStartMs = now;
      state.turnAudioEndMs = now;
      state.silenceStartTs = 0;
      if (now - state.speakingStartTs >= 150) state.turnHadSpeech = true;
      return;
    }

    state.speakingStartTs = 0;

    if (!state.silenceWindowLocked) {
      const silenceDurationMs = await ensureSilenceStartedEvent(now);
      if (silenceDurationMs >= CHAPTER_SILENCE_THRESHOLD_MS && !state.silenceChapterCreated) {
        await closeSilenceWindow(now);
        state.silenceWindowLocked = true;
      }
    }

    if (!state.turnHadSpeech) return;
    if (!state.silenceStartTs) state.silenceStartTs = now;
    if (now - state.silenceStartTs >= state.silenceMs) {
      state.silenceStartTs = 0;
      await finalizeTurnFromSilence();
    }
  }, 48);
}

async function startAudioSession() {
  if (state.mediaStream && state.audioContext && state.analyser) return true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("Mic not supported. Use inline text fallback.", "error");
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaStream = stream;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioContext = AudioCtx ? new AudioCtx() : null;
    if (state.audioContext) {
      const source = state.audioContext.createMediaStreamSource(stream);
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 512;
      state.analyserData = new Uint8Array(state.analyser.frequencyBinCount);
      source.connect(state.analyser);
      await calibrateNoiseFloor(420);
      startSilenceMonitor();
    }
    return true;
  } catch {
    showToast("Mic permission denied.", "error");
    return false;
  }
}

async function stopAudioSession() {
  stopSilenceMonitor();
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((t) => t.stop());
    state.mediaStream = null;
  }
  if (state.audioContext) {
    try {
      await state.audioContext.close();
    } catch {}
    state.audioContext = null;
  }
  state.analyser = null;
  state.analyserData = null;
}

function buildRecognition() {
  if (!state.supportsRecognition) return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";
  rec.onresult = (ev) => {
    let interim = "";
    let final = "";
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const res = ev.results[i];
      const confidence = Number(res?.[0]?.confidence);
      if (Number.isFinite(confidence) && confidence >= 0) {
        state.turnConfidenceTotal += confidence;
        state.turnConfidenceSamples += 1;
      }
      if (res.isFinal) final += ` ${res[0].transcript}`;
      else interim += ` ${res[0].transcript}`;
    }
    if (final.trim()) {
      state.listeningFinal += ` ${final}`;
    }
    state.sttLastUpdateTs = Date.now();
    state.listeningInterim = interim.trim();
    const subtitleText = state.listeningInterim || state.listeningFinal.trim();
    if (subtitleText) {
      state.turnHadSpeech = true;
      const now = Date.now();
      if (!state.speakingStartTs) state.speakingStartTs = now;
      if (!state.turnAudioStartMs) state.turnAudioStartMs = now;
      state.turnAudioEndMs = now;
      queueUserSubtitle(subtitleText);
    } else {
      queueUserSubtitle("");
    }
  };
  rec.onend = () => {
    state.recognitionActive = false;
    if (!state.sessionActive || state.talkState !== "listening") return;
    if (state.turnHadSpeech && !state.turnFinalizePending) {
      void finalizeTurnFromSilence();
      return;
    }
    // Only restart if still in listening state and no pending operations
    if (!state.turnFinalizePending) {
      setTimeout(() => startRecognition(), 100);
    }
  };
  rec.onerror = () => {
    state.recognitionActive = false;
  };
  return rec;
}

function startRecognition() {
  if (!state.sessionActive || state.talkState !== "listening") return;
  if (!state.supportsRecognition) return;
  if (!state.recognition) state.recognition = buildRecognition();
  if (!state.recognition) return;
  if (state.recognitionActive) return;
  try {
    state.recognition.start();
    state.recognitionActive = true;
  } catch {}
}

async function stopRecognition() {
  if (state.recognition) {
    try {
      state.recognition.abort();
    } catch {}
  }
  state.recognition = null;
  state.recognitionActive = false;
}

function updateVisionIndicator() {
  const on = Boolean(state.screenStream || state.cameraStream);
  if (visionIndicator) visionIndicator.classList.toggle("hidden", !on);
}

function setVisionControlsVisible(visible) {
  if (!visionControls) return;
  visionControls.classList.toggle("hidden", !visible);
  if (!visible) {
    if (visionIndicator) visionIndicator.classList.add("hidden");
  }
}

async function submitVisionFramePlaceholder(blob, kind) {
  void blob;
  void kind;
  // Placeholder for next iteration:
  // await fetch(apiUrl("/vision/frame"), { method: "POST", body: blob });
}

function captureFrameFromVideo(videoEl, kind) {
  if (!videoEl || videoEl.videoWidth <= 0 || videoEl.videoHeight <= 0) return;
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    state.visionFrameId += 1;
    const label = `${kind} frame #${state.visionFrameId}`;
    state.visionFrames.push({ id: state.visionFrameId, kind, blob, url, ts: new Date().toISOString() });
    appendTranscriptAttachment("Vision", label, url);
    await submitVisionFramePlaceholder(blob, kind);
  }, "image/jpeg", 0.82);
}

function stopStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

function stopScreenShare() {
  if (state.screenCaptureTimer) {
    clearInterval(state.screenCaptureTimer);
    state.screenCaptureTimer = null;
  }
  stopStream(state.screenStream);
  state.screenStream = null;
  if (screenPreview) screenPreview.srcObject = null;
  if (screenPreviewWrap) screenPreviewWrap.classList.add("hidden");
  updateVisionIndicator();
}

function stopCameraView() {
  if (state.cameraCaptureTimer) {
    clearInterval(state.cameraCaptureTimer);
    state.cameraCaptureTimer = null;
  }
  stopStream(state.cameraStream);
  state.cameraStream = null;
  if (cameraPreview) cameraPreview.srcObject = null;
  if (cameraPreviewWrap) cameraPreviewWrap.classList.add("hidden");
  updateVisionIndicator();
}

async function startScreenShare() {
  if (!state.sessionActive) return;
  if (!navigator.mediaDevices?.getDisplayMedia) {
    showToast("Screen share not supported in this browser.", "error");
    return;
  }
  stopScreenShare();
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    state.screenStream = stream;
    if (screenPreview) screenPreview.srcObject = stream;
    if (screenPreviewWrap) screenPreviewWrap.classList.remove("hidden");
    state.screenCaptureTimer = setInterval(() => captureFrameFromVideo(screenPreview, "screen"), 7000);
    captureFrameFromVideo(screenPreview, "screen");
    updateVisionIndicator();
    const [track] = stream.getVideoTracks();
    if (track) track.addEventListener("ended", stopScreenShare, { once: true });
  } catch {
    showToast("Screen share canceled.", "error");
  }
}

async function startCameraView() {
  if (!state.sessionActive) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Camera not supported in this browser.", "error");
    return;
  }
  stopCameraView();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.cameraStream = stream;
    if (cameraPreview) cameraPreview.srcObject = stream;
    if (cameraPreviewWrap) cameraPreviewWrap.classList.remove("hidden");
    state.cameraCaptureTimer = setInterval(() => captureFrameFromVideo(cameraPreview, "camera"), 7000);
    captureFrameFromVideo(cameraPreview, "camera");
    updateVisionIndicator();
    const [track] = stream.getVideoTracks();
    if (track) track.addEventListener("ended", stopCameraView, { once: true });
  } catch {
    showToast("Camera access denied.", "error");
  }
}

function stopAllVision() {
  stopScreenShare();
  stopCameraView();
}

function buildSessionSummaryPayload(events = []) {
  const all = Array.isArray(events) ? events : [];
  const turns = all.filter((event) => String(event?.type || "") === "talk_turn_committed");
  const segmentsStarted = all.filter((event) => String(event?.type || "") === "segment_started").length;
  const longSilences = all.filter(
    (event) => String(event?.type || "") === "silence_ended" && Number(event?.meta?.durationMs) >= CHAPTER_SILENCE_THRESHOLD_MS
  ).length;
  const speakerBreakdown = {};
  let totalTurnDurationMs = 0;
  let durationSamples = 0;
  let confidenceTotal = 0;
  let confidenceSamples = 0;
  for (const turn of turns) {
    const speakerId = getEffectiveSpeakerId(turn);
    speakerBreakdown[speakerId] = (speakerBreakdown[speakerId] || 0) + 1;
    const startMs = Number(turn?.meta?.audioStartMs);
    const endMs = Number(turn?.meta?.audioEndMs);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      totalTurnDurationMs += endMs - startMs;
      durationSamples += 1;
    }
    const confidence = Number(turn?.meta?.confidence);
    if (Number.isFinite(confidence)) {
      confidenceTotal += confidence;
      confidenceSamples += 1;
    }
  }
  const avgTurnDurationMs = durationSamples ? Math.round(totalTurnDurationMs / durationSamples) : 0;
  const avgConfidence = confidenceSamples ? Number((confidenceTotal / confidenceSamples).toFixed(3)) : null;
  return {
    turnCount: turns.length,
    segmentCount: segmentsStarted,
    chapterCount: chapterState.chapters.length,
    longSilenceCount: longSilences,
    speakers: speakerBreakdown,
    avgTurnDurationMs,
    avgConfidence
  };
}

async function emitSessionReports() {
  const payload = buildSessionSummaryPayload(timelineState.events);
  if (!payload.turnCount) return;
  await emitEvent("session_summary_generated", "system", "talk", `Session recap: ${payload.turnCount} turns across ${payload.segmentCount} segments`, payload);
  await emitEvent(
    "speech_clarity_report_generated",
    "system",
    "talk",
    `Clarity: avg turn ${formatDurationMs(payload.avgTurnDurationMs)} | long pauses ${payload.longSilenceCount}`,
    payload
  );
}

async function enterListeningState(resetTurn = true) {
  if (!state.sessionActive) return;
  state.activeAssistantTurnId = "";
  state.assistantThinking = false;
  state.assistantSpeaking = false;
  runtimeState.isListening = true;
  runtimeState.assistantThinking = false;
  runtimeState.assistantSpeaking = false;
  runtimeState.activeAgent = "Coach";
  scheduleRuntimeHeartbeatTick(true);
  closeFallbackComposer();
  if (resetTurn) {
    state.listeningFinal = "";
    state.listeningInterim = "";
    resetTurnTracking();
    queueUserSubtitle("");
  }
  stopSubtitleChunker("agent");
  hideSubtitleNode(subtitleAgent);
  setTalkState("listening");
  setOrbSubtitle("");
  if (!state.supportsRecognition) {
    showToast("Speech recognition unavailable; use text fallback.", "error");
  }
  startRecognition();
}

async function startSession() {
  if (state.reviewMode) {
    showToast("Review mode is active. Disable it to start talking.", "error");
    return;
  }
  if (state.sessionActive) return;
  state.sessionActive = true;
  updateReviewModeUi();
  scheduleTimelinePoll(250);
  runtimeState.lane = "talk";
  runtimeState.activeAgent = "Coach";
  runtimeState.isListening = true;
  runtimeState.assistantThinking = false;
  runtimeState.assistantSpeaking = false;
  scheduleRuntimeHeartbeatTick(true);
  setVisionControlsVisible(true);
  hideSubtitleNode(subtitleAgent);
  hideSubtitleNode(subtitleUser);
  const audioOk = await startAudioSession();
  if (!audioOk) {
    state.sessionActive = false;
    updateReviewModeUi();
    scheduleTimelinePoll(5000);
    setVisionControlsVisible(false);
    setTalkState("idle");
    setRuntimeStateIdle(runtimeState.lastTurnId);
    openFallbackComposer("");
    return;
  }
  await ensureActiveSegment("session_start", Date.now());
  await enterListeningState(true);
}

async function endSession() {
  if (!state.sessionActive) return;
  state.sessionActive = false;
  updateReviewModeUi();
  scheduleTimelinePoll(5000);
  const nowMs = Date.now();
  await closeSilenceWindow(nowMs, { rotateSegment: false });
  await endActiveSegment("session_end", nowMs);
  await refreshTimelineNow();
  await emitSessionReports();
  await emitSpeakerAnalyticsGenerated("session_end");
  await refreshTimelineNow();
  setRuntimeStateIdle(runtimeState.lastTurnId);
  cancelPendingThinking();
  ttsStop();
  await stopRecognition();
  await stopAudioSession();
  stopAllVision();
  setVisionControlsVisible(false);
  setOrbSubtitle("");
  queueUserSubtitle("");
  fadeSubtitlesSoon(300);
  resetTurnTracking();
  setTalkState("idle");
}

function updateMicLevel() {
  const rms = getRawRms();
  return Math.min(1, rms * 3.8);
}

function resizeOrbCanvas() {
  if (!orbCanvas || !orbWrap || !orbCtx) return;
  const rect = orbWrap.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));

  orbCanvas.style.width = `${size}px`;
  orbCanvas.style.height = `${size}px`;
  orbCanvas.width = Math.floor(size * dpr);
  orbCanvas.height = Math.floor(size * dpr);

  state.orbW = size;
  state.orbH = size;
  orbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawOrb(ts) {
  if (!orbCtx || !orbCanvas) return;
  if (!state.rafTs) state.rafTs = ts;

  const delta = Math.min(0.06, (ts - state.rafTs) / 1000);
  state.rafTs = ts;

  const mic = updateMicLevel();
  let target = 0.2;
  let pulseSpeed = 2.1;
  let spin = 0.12;

  if (state.talkState === "listening") {
    target = 0.46 + mic * 0.55;
    pulseSpeed = 3.5;
    spin = 0.2;
  } else if (state.talkState === "thinking") {
    target = 0.32;
    pulseSpeed = 1.8;
    spin = 0.9;
  } else if (state.talkState === "speaking") {
    target = 0.58;
    pulseSpeed = 4.2;
    spin = 0.32;
  }

  state.orbEnergy += (target - state.orbEnergy) * 0.12;
  state.orbPhase += delta * pulseSpeed;
  state.orbSpin += delta * spin;

  const w = state.orbW || orbCanvas.clientWidth;
  const h = state.orbH || orbCanvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const base = Math.min(w, h) * 0.43;
  const radius = Math.max(0.1, Math.min(Math.min(w, h) * 0.46, base + Math.sin(state.orbPhase) * 10 * state.orbEnergy));

  orbCtx.clearRect(0, 0, w, h);

  const halo = orbCtx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius * 1.75);
  halo.addColorStop(0, "rgba(125,224,255,0.52)");
  halo.addColorStop(0.45, "rgba(52,145,255,0.35)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  orbCtx.fillStyle = halo;
  orbCtx.beginPath();
  orbCtx.arc(cx, cy, radius * 1.75, 0, Math.PI * 2);
  orbCtx.fill();

  const body = orbCtx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.15, cx, cy, radius * 1.12);
  body.addColorStop(0, "rgba(170,240,255,0.92)");
  body.addColorStop(0.34, "rgba(90,188,255,0.85)");
  body.addColorStop(0.7, "rgba(30,100,210,0.86)");
  body.addColorStop(1, "rgba(8,34,90,0.98)");
  orbCtx.fillStyle = body;
  orbCtx.beginPath();
  orbCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  orbCtx.fill();

  orbCtx.strokeStyle = "rgba(190,240,255,0.52)";
  orbCtx.lineWidth = Math.max(1.6, radius * 0.02);
  orbCtx.beginPath();
  orbCtx.arc(cx, cy, radius * 0.9, -2.3, -1.05);
  orbCtx.stroke();

  requestAnimationFrame(drawOrb);
}

function canAcceptOrbTap() {
  const now = Date.now();
  if (now - state.lastOrbTapTs < TAP_COOLDOWN_MS) {
    return false;
  }
  state.lastOrbTapTs = now;
  return true;
}

async function onOrbTap() {
  try {
    if (!canAcceptOrbTap()) return;
    ensureTtsReady();
    if (!state.sessionActive) {
      if (state.reviewMode) {
        showToast("Review mode is active. Disable it to start talking.", "error");
        return;
      }
      await startSession();
      return;
    }
    if (state.talkState === "thinking" || state.talkState === "speaking" || state.assistantThinking || state.assistantSpeaking) {
      await interruptActiveAssistant("orb_interrupt", {
        resumeListening: true,
        resetListening: true
      });
      showToast("Interrupted. Listening...", "ok");
      return;
    }
    await endSession();
  } catch (err) {
    console.error("onOrbTap_failed", err);
    showToast("Could not toggle talk session.", "error");
    setTalkState("idle");
    setOrbSubtitle("");
  }
}

function updateTaskCardStatus(taskId, status) {
  taskCards.forEach((card) => {
    if (card.dataset.taskId !== taskId) return;
    const strong = card.querySelector(".task-status strong");
    if (strong) strong.textContent = status;
  });
}

function setActiveToken(agent, roomId) {
  Object.values(tokens).forEach((token) => token.classList.remove("active"));

  const token = tokens[agent] || tokens.Coach;
  const room = rooms[roomId] || rooms["room-strategy"];
  if (!token || !room || !map) return;

  token.classList.add("active");
  const mapRect = map.getBoundingClientRect();
  const roomRect = room.getBoundingClientRect();
  token.style.left = `${roomRect.left - mapRect.left + roomRect.width / 2}px`;
  token.style.top = `${roomRect.top - mapRect.top + roomRect.height / 2}px`;
}

function selectTaskCard(card) {
  taskCards.forEach((node) => node.classList.remove("active"));
  card.classList.add("active");

  state.activeTaskId = String(card.dataset.taskId || "");
  state.activeTaskTitle = String(card.querySelector(".task-title")?.textContent || state.activeTaskId);
  state.activeAgent = String(card.dataset.agent || "Coach");

  setActiveToken(state.activeAgent, String(card.dataset.room || "room-strategy"));
  updateSelectionUi();
}

async function handleDashboardSend() {
  if (!state.activeTaskId) {
    showToast("Select a workflow run first.", "error");
    return;
  }
  const text = String(dashboardInput?.value || "").trim();
  if (!text) return;

  const officeAgentId = mapDashboardAgentToOffice(state.activeAgent);
  recordOfficeNote(officeAgentId, { lastTask: text, nextAction: "Awaiting response" });
  setOfficeOverride(officeAgentId, "working", 12000, {
    lastTask: text,
    nextAction: "Awaiting response"
  });

  // Show user message immediately
  const userMsg = { role: "user", content: text, agent: state.activeAgent };
  let currentThread = [];
  try {
    currentThread = await loadThread(state.activeTaskId || GLOBAL_TASK_ID);
  } catch {
    currentThread = [];
  }
  const displayThread = [...currentThread, userMsg];
  renderDashboardThread(displayThread);

  if (dashboardInput) dashboardInput.value = "";

  try {
    const data = await apiRequest("/agent/command", {
      method: "POST",
      body: {
        taskId: state.activeTaskId || GLOBAL_TASK_ID,
        agent: state.activeAgent,
        message: text,
        mode: "dashboard"
      }
    });

    if (data?.reply) {
      showToast("Agent replied.", "ok");
      setOfficeOverride(officeAgentId, "done", 4000, {
        lastTask: text,
        nextAction: "Review output"
      });
      // Reload and display the full thread after response
      let updatedThread = [];
      try {
        updatedThread = await loadThread(state.activeTaskId || GLOBAL_TASK_ID);
      } catch {
        updatedThread = displayThread;
      }
      renderDashboardThread(updatedThread);
    }
    setApiOnline(true);
  } catch (err) {
    setApiOnline(false);
    setOfficeOverride(officeAgentId, "blocked", 6000, {
      lastTask: text,
      nextAction: "Retry or revise"
    });
    showToast("Dashboard request failed.", "error");
  }
}

async function handleDecision(action) {
  if (!state.activeTaskId) {
    showToast("Select a task before decision.", "error");
    return;
  }

  try {
    const result = await apiRequest("/task/update", {
      method: "POST",
      body: {
        taskId: state.activeTaskId,
        status: action,
        decisionNote: `${action} from dashboard`
      }
    });

    updateTaskCardStatus(state.activeTaskId, result.task?.status || action);
    recordOfficeNote("henry", { lastTask: `Decision: ${action}`, nextAction: "Monitor outcomes" });
    setOfficeOverride("henry", action === "kill" ? "blocked" : "done", 4000, {
      lastTask: `Decision: ${action}`,
      nextAction: "Monitor outcomes"
    });
    void loadOfficeTasks().then(updateOfficeSimulation);
    showToast(`Task updated: ${action}`, "ok");
  } catch {
    showToast("Failed to update task status.", "error");
  }
}

function setTranscriptExpanded(expanded) {
  state.transcriptExpanded = Boolean(expanded);
  talkTranscriptWrap.classList.toggle("expanded", state.transcriptExpanded);
  talkView.classList.toggle("transcript-expanded", state.transcriptExpanded);
  talkTranscriptToggle.textContent = state.transcriptExpanded ? "Collapse" : "Expand";
  resizeOrbCanvas();
}

async function initHealth() {
  try {
    const data = await apiRequest("/health");
    setApiOnline(Boolean(data?.ok));
    state.talkStreamEnabled = Boolean(data?.config?.llm?.streamTalk ?? true);
    // If ElevenLabs isn't configured, fall back to free browser TTS automatically.
    state.serverTtsConfigured = Boolean(data?.config?.voice?.ttsConfigured);
    state.serverTtsProvider = String(data?.config?.voice?.provider || "");
  } catch {
    setApiOnline(false);
    state.talkStreamEnabled = false;
    state.serverTtsConfigured = false;
    state.serverTtsProvider = "";
  }
}

// ===== CONTENT PIPELINE MODULE =====
function formatContentTimestamp(timestamp) {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  } catch {
    return "";
  }
}

function formatContentMeta(...parts) {
  return parts.filter(Boolean).join(" • ");
}

function normalizeContentStatus(status) {
  const key = String(status || "draft").trim().toLowerCase();
  return CONTENT_STATUS_LABELS[key] ? key : "draft";
}

function clearContentSignalForm() {
  if (contentSignalTitle) contentSignalTitle.value = "";
  if (contentSignalSource) contentSignalSource.value = "";
  if (contentSignalUrl) contentSignalUrl.value = "";
  if (contentSignalSummary) contentSignalSummary.value = "";
}

function clearContentTopicForm() {
  if (contentTopicTitle) contentTopicTitle.value = "";
  if (contentTopicRationale) contentTopicRationale.value = "";
}

function clearContentDraftEditor() {
  contentState.selectedDraftId = "";
  if (contentDraftActive) contentDraftActive.textContent = "No draft selected";
  if (contentDraftTopic) contentDraftTopic.value = "";
  if (contentDraftHook) contentDraftHook.value = "";
  if (contentDraftExplanation) contentDraftExplanation.value = "";
  if (contentDraftInsight) contentDraftInsight.value = "";
  if (contentDraftCta) contentDraftCta.value = "";
  if (contentDraftStatus) contentDraftStatus.value = "draft";
  if (contentDraftSchedule) contentDraftSchedule.value = "";
}

function setContentDraftEditor(draft) {
  if (!draft) {
    clearContentDraftEditor();
    return;
  }
  contentState.selectedDraftId = draft.id;
  if (contentDraftActive) {
    const label = draft.topicTitle || draft.hook || draft.id;
    contentDraftActive.textContent = `Editing: ${label}`;
  }
  if (contentDraftTopic) contentDraftTopic.value = draft.topicTitle || "";
  if (contentDraftHook) contentDraftHook.value = draft.hook || "";
  if (contentDraftExplanation) contentDraftExplanation.value = draft.explanation || "";
  if (contentDraftInsight) contentDraftInsight.value = draft.insight || "";
  if (contentDraftCta) contentDraftCta.value = draft.cta || "";
  if (contentDraftStatus) contentDraftStatus.value = normalizeContentStatus(draft.status);
  if (contentDraftSchedule) contentDraftSchedule.value = toLocalDateInput(draft.scheduledFor);
}

function toLocalDateInput(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function parseScheduleInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function renderContentStats(store) {
  const signals = store?.signals || [];
  const topics = store?.topics || [];
  const drafts = store?.drafts || [];
  const pendingCount = drafts.filter((draft) => draft.status === "pending_approval").length;
  if (contentSignalCount) contentSignalCount.textContent = String(signals.length);
  if (contentTopicCount) contentTopicCount.textContent = String(topics.length);
  if (contentDraftCount) contentDraftCount.textContent = String(drafts.length);
  if (contentPendingCount) contentPendingCount.textContent = String(pendingCount);
}

function renderRadarSignals(signals = []) {
  if (!contentRadarList) return;
  contentRadarList.innerHTML = "";

  if (!signals.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No radar signals yet.";
    contentRadarList.appendChild(empty);
    return;
  }

  signals.forEach((signal) => {
    const card = document.createElement("div");
    card.className = "content-card";
    card.dataset.id = signal.id;

    const top = document.createElement("div");
    top.className = "content-card-top";

    const title = document.createElement("div");
    title.className = "content-card-title";
    title.textContent = signal.title || "Untitled signal";

    const meta = document.createElement("div");
    meta.className = "content-card-meta";
    meta.textContent = formatContentMeta(signal.source, formatRelativeTime(signal.createdAt));

    top.appendChild(title);
    top.appendChild(meta);

    const summary = document.createElement("div");
    summary.className = "content-card-meta";
    summary.textContent = signal.summary || "No summary added.";

    const actions = document.createElement("div");
    actions.className = "content-card-actions";
    const promoteBtn = document.createElement("button");
    promoteBtn.className = "content-action-btn";
    promoteBtn.dataset.action = "promote";
    promoteBtn.dataset.id = signal.id;
    promoteBtn.textContent = "Promote to Scout";
    actions.appendChild(promoteBtn);

    card.appendChild(top);
    card.appendChild(summary);
    if (signal.url) {
      const url = document.createElement("div");
      url.className = "content-card-meta";
      url.textContent = signal.url;
      card.appendChild(url);
    }
    card.appendChild(actions);
    contentRadarList.appendChild(card);
  });
}

function renderScoutTopics(topics = []) {
  if (!contentScoutList) return;
  contentScoutList.innerHTML = "";

  if (!topics.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No scout topics yet.";
    contentScoutList.appendChild(empty);
    return;
  }

  topics.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "content-card";
    card.dataset.id = topic.id;

    const top = document.createElement("div");
    top.className = "content-card-top";

    const title = document.createElement("div");
    title.className = "content-card-title";
    title.textContent = topic.title || "Untitled topic";

    const meta = document.createElement("div");
    meta.className = "content-card-meta";
    const signalCount = Array.isArray(topic.signalIds) ? topic.signalIds.length : 0;
    meta.textContent = formatContentMeta(
      signalCount ? `${signalCount} signal${signalCount > 1 ? "s" : ""}` : "",
      formatRelativeTime(topic.createdAt)
    );

    top.appendChild(title);
    top.appendChild(meta);

    const rationale = document.createElement("div");
    rationale.className = "content-card-meta";
    rationale.textContent = topic.rationale || "No rationale added.";

    const actions = document.createElement("div");
    actions.className = "content-card-actions";
    const draftBtn = document.createElement("button");
    draftBtn.className = "content-action-btn";
    draftBtn.dataset.action = "draft";
    draftBtn.dataset.id = topic.id;
    draftBtn.textContent = "Create Draft";
    actions.appendChild(draftBtn);

    card.appendChild(top);
    card.appendChild(rationale);
    card.appendChild(actions);
    contentScoutList.appendChild(card);
  });
}

function renderDrafts(drafts = []) {
  if (!contentDraftList) return;
  contentDraftList.innerHTML = "";

  if (!drafts.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No drafts yet.";
    contentDraftList.appendChild(empty);
    return;
  }

  drafts.forEach((draft) => {
    const card = document.createElement("div");
    card.className = "content-card";
    card.dataset.id = draft.id;

    const top = document.createElement("div");
    top.className = "content-card-top";

    const title = document.createElement("div");
    title.className = "content-card-title";
    title.textContent = draft.topicTitle || draft.hook || "Untitled draft";

    const status = document.createElement("div");
    status.className = "content-status";
    status.dataset.status = normalizeContentStatus(draft.status);
    status.textContent = CONTENT_STATUS_LABELS[normalizeContentStatus(draft.status)];

    top.appendChild(title);
    top.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "content-card-meta";
    meta.textContent = formatContentMeta(formatRelativeTime(draft.updatedAt || draft.createdAt));

    const preview = document.createElement("div");
    preview.className = "content-card-meta";
    preview.textContent = draft.hook || draft.insight || "No hook added yet.";

    const actions = document.createElement("div");
    actions.className = "content-card-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "content-action-btn";
    editBtn.dataset.action = "edit";
    editBtn.dataset.id = draft.id;
    editBtn.textContent = "Edit";
    actions.appendChild(editBtn);

    if (draft.status === "draft") {
      const requestBtn = document.createElement("button");
      requestBtn.className = "content-action-btn";
      requestBtn.dataset.action = "request";
      requestBtn.dataset.id = draft.id;
      requestBtn.textContent = "Request Approval";
      actions.appendChild(requestBtn);
    } else if (draft.status === "pending_approval") {
      const approveBtn = document.createElement("button");
      approveBtn.className = "content-action-btn";
      approveBtn.dataset.action = "approve";
      approveBtn.dataset.id = draft.id;
      approveBtn.textContent = "Approve";
      actions.appendChild(approveBtn);

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "content-action-btn";
      rejectBtn.dataset.action = "reject";
      rejectBtn.dataset.id = draft.id;
      rejectBtn.textContent = "Reject";
      actions.appendChild(rejectBtn);
    }

    card.appendChild(top);
    card.appendChild(meta);
    card.appendChild(preview);
    card.appendChild(actions);
    contentDraftList.appendChild(card);
  });
}

function renderPipelineQueue(drafts = []) {
  if (!contentPipelineList) return;
  contentPipelineList.innerHTML = "";

  const queued = drafts.filter((draft) => ["approved", "scheduled"].includes(draft.status));
  if (!queued.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No approved or scheduled posts yet.";
    contentPipelineList.appendChild(empty);
    return;
  }

  queued.forEach((draft) => {
    const card = document.createElement("div");
    card.className = "content-card";

    const top = document.createElement("div");
    top.className = "content-card-top";

    const title = document.createElement("div");
    title.className = "content-card-title";
    title.textContent = draft.topicTitle || draft.hook || "Untitled draft";

    const status = document.createElement("div");
    status.className = "content-status";
    status.dataset.status = normalizeContentStatus(draft.status);
    status.textContent = CONTENT_STATUS_LABELS[normalizeContentStatus(draft.status)];

    top.appendChild(title);
    top.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "content-card-meta";
    const schedule = draft.scheduledFor ? `Scheduled: ${formatContentTimestamp(draft.scheduledFor)}` : "Not scheduled";
    meta.textContent = formatContentMeta(schedule);

    card.appendChild(top);
    card.appendChild(meta);
    contentPipelineList.appendChild(card);
  });
}

function renderContentPipeline() {
  const store = contentState.store || { signals: [], topics: [], drafts: [] };
  renderContentStats(store);
  renderRadarSignals(store.signals || []);
  renderScoutTopics(store.topics || []);
  renderDrafts(store.drafts || []);
  renderPipelineQueue(store.drafts || []);

  if (contentState.selectedDraftId) {
    const active = (store.drafts || []).find((draft) => draft.id === contentState.selectedDraftId);
    if (active) {
      setContentDraftEditor(active);
      return;
    }
  }
  clearContentDraftEditor();
}

async function loadContentPipeline() {
  try {
    const res = await apiRequest("/content/pipeline");
    if (res?.ok && res.store) {
      contentState.store = res.store;
      renderContentPipeline();
      updateOfficeSimulation();
    }
  } catch (err) {
    showToast("Failed to load content pipeline.", "error");
  }
}

async function handleContentSignalSave() {
  const title = String(contentSignalTitle?.value || "").trim();
  const summary = String(contentSignalSummary?.value || "").trim();
  const source = String(contentSignalSource?.value || "").trim();
  const url = String(contentSignalUrl?.value || "").trim();

  if (!title) {
    showToast("Signal title is required.", "error");
    return;
  }

  try {
    await apiRequest("/content/radar", {
      method: "POST",
      body: { title, summary, source, url }
    });
    clearContentSignalForm();
    await loadContentPipeline();
    recordOfficeNote("scout", { lastTask: "Logged radar signal", nextAction: "Filter top topics" });
    setOfficeOverride("scout", "done", 3000, { lastTask: "Logged radar signal", nextAction: "Filter top topics" });
    showToast("Radar signal saved.", "ok");
  } catch {
    showToast("Failed to save radar signal.", "error");
  }
}

async function handleContentTopicSave() {
  const title = String(contentTopicTitle?.value || "").trim();
  const rationale = String(contentTopicRationale?.value || "").trim();

  if (!title) {
    showToast("Topic title is required.", "error");
    return;
  }

  try {
    await apiRequest("/content/scout", {
      method: "POST",
      body: { title, rationale, signalIds: [] }
    });
    clearContentTopicForm();
    await loadContentPipeline();
    recordOfficeNote("scout", { lastTask: "Promoted topic", nextAction: "Hand off to Quill" });
    setOfficeOverride("scout", "done", 3000, { lastTask: "Promoted topic", nextAction: "Hand off to Quill" });
    showToast("Scout topic saved.", "ok");
  } catch {
    showToast("Failed to save scout topic.", "error");
  }
}

function getDraftEditorPayload() {
  return {
    topicTitle: String(contentDraftTopic?.value || "").trim(),
    hook: String(contentDraftHook?.value || "").trim(),
    explanation: String(contentDraftExplanation?.value || "").trim(),
    insight: String(contentDraftInsight?.value || "").trim(),
    cta: String(contentDraftCta?.value || "").trim(),
    status: normalizeContentStatus(contentDraftStatus?.value || "draft"),
    scheduledFor: parseScheduleInput(contentDraftSchedule?.value || "")
  };
}

async function handleContentDraftSave() {
  const payload = getDraftEditorPayload();
  if (!payload.topicTitle && !payload.hook) {
    showToast("Add a topic title or hook before saving.", "error");
    return;
  }
  if (payload.status === "scheduled" && !payload.scheduledFor) {
    showToast("Pick a schedule time before marking as scheduled.", "error");
    return;
  }

  try {
    if (contentState.selectedDraftId) {
      await apiRequest(`/content/draft/${encodeURIComponent(contentState.selectedDraftId)}`, {
        method: "POST",
        body: payload
      });
      await loadContentPipeline();
      showToast("Draft updated.", "ok");
    } else {
      const res = await apiRequest("/content/draft", {
        method: "POST",
        body: payload
      });
      contentState.selectedDraftId = res?.draft?.id || "";
      await loadContentPipeline();
      recordOfficeNote("quill", { lastTask: "Created draft", nextAction: "Refine hook and insight" });
      setOfficeOverride("quill", "done", 3000, { lastTask: "Created draft", nextAction: "Refine hook and insight" });
      showToast("Draft created.", "ok");
    }
  } catch {
    showToast("Failed to save draft.", "error");
  }
}

async function handleContentDraftStatusChange(status) {
  if (!contentState.selectedDraftId) {
    showToast("Select a draft first.", "error");
    return;
  }
  try {
    await apiRequest(`/content/draft/${encodeURIComponent(contentState.selectedDraftId)}`, {
      method: "POST",
      body: { status }
    });
    await loadContentPipeline();
    recordOfficeNote("quill", {
      lastTask: `Status set to ${CONTENT_STATUS_LABELS[normalizeContentStatus(status)]}`,
      nextAction: status === "pending_approval" ? "Awaiting approval" : "Finalize for pipeline"
    });
    if (status === "approved" || status === "scheduled") {
      setOfficeOverride("quill", "done", 3000, {
        lastTask: `Approved: ${CONTENT_STATUS_LABELS[normalizeContentStatus(status)]}`,
        nextAction: "Return to idle"
      });
    }
    showToast(`Draft marked ${CONTENT_STATUS_LABELS[normalizeContentStatus(status)]}.`, "ok");
  } catch {
    showToast("Failed to update draft status.", "error");
  }
}

async function promoteSignalToTopic(signalId) {
  const signal = (contentState.store?.signals || []).find((item) => item.id === signalId);
  if (!signal) return;
  try {
    await apiRequest("/content/scout", {
      method: "POST",
      body: { title: signal.title, rationale: signal.summary, signalIds: [signal.id] }
    });
    await loadContentPipeline();
    recordOfficeNote("scout", { lastTask: "Signal promoted to topic", nextAction: "Draft with Quill" });
    setOfficeOverride("scout", "done", 3000, { lastTask: "Signal promoted to topic", nextAction: "Draft with Quill" });
    showToast("Signal promoted to Scout topic.", "ok");
  } catch {
    showToast("Failed to promote signal.", "error");
  }
}

async function createDraftFromTopic(topicId) {
  const topic = (contentState.store?.topics || []).find((item) => item.id === topicId);
  if (!topic) return;
  try {
    const res = await apiRequest("/content/draft", {
      method: "POST",
      body: {
        topicId: topic.id,
        topicTitle: topic.title,
        hook: "",
        explanation: "",
        insight: "",
        cta: "",
        status: "draft"
      }
    });
    contentState.selectedDraftId = res?.draft?.id || "";
    await loadContentPipeline();
    recordOfficeNote("quill", { lastTask: "Draft created from topic", nextAction: "Write hook" });
    setOfficeOverride("quill", "done", 3000, { lastTask: "Draft created from topic", nextAction: "Write hook" });
    showToast("Draft created from topic.", "ok");
  } catch {
    showToast("Failed to create draft.", "error");
  }
}

function handleContentRadarListClick(event) {
  const btn = event.target?.closest?.("button");
  if (!btn) return;
  const action = String(btn.dataset.action || "");
  const id = String(btn.dataset.id || "");
  if (action === "promote" && id) {
    void promoteSignalToTopic(id);
  }
}

function handleContentScoutListClick(event) {
  const btn = event.target?.closest?.("button");
  if (!btn) return;
  const action = String(btn.dataset.action || "");
  const id = String(btn.dataset.id || "");
  if (action === "draft" && id) {
    void createDraftFromTopic(id);
  }
}

function handleContentDraftListClick(event) {
  const btn = event.target?.closest?.("button");
  const card = event.target?.closest?.(".content-card");
  const id = String(btn?.dataset?.id || card?.dataset?.id || "");
  const action = String(btn?.dataset?.action || "");

  if (action === "edit" && id) {
    const draft = (contentState.store?.drafts || []).find((item) => item.id === id);
    setContentDraftEditor(draft);
    return;
  }
  if (action === "request" && id) {
    contentState.selectedDraftId = id;
    void handleContentDraftStatusChange("pending_approval");
    return;
  }
  if (action === "approve" && id) {
    contentState.selectedDraftId = id;
    void handleContentDraftStatusChange("approved");
    return;
  }
  if (action === "reject" && id) {
    contentState.selectedDraftId = id;
    void handleContentDraftStatusChange("rejected");
    return;
  }

  if (!action && id) {
    const draft = (contentState.store?.drafts || []).find((item) => item.id === id);
    setContentDraftEditor(draft);
  }
}

// ===== OFFICE SIMULATION MODULE =====
function initOfficeSimulation() {
  if (!officeView || !officeAgentPool) return;
  officeAgentPool.innerHTML = "";
  OFFICE_AGENTS.forEach((agent) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "office-agent-row";
    row.dataset.agent = agent.id;
    row.dataset.status = "idle";
    row.title = `${agent.role} \u00b7 ${agent.name}`;

    const dot = document.createElement("span");
    dot.className = "agent-dot";

    const meta = document.createElement("div");
    meta.className = "agent-meta";
    meta.innerHTML = `
      <div class="agent-name">${agent.name}</div>
      <div class="agent-role">${agent.role}</div>
    `;

    const status = document.createElement("div");
    status.className = "agent-status";
    status.textContent = "IDLE";

    row.appendChild(dot);
    row.appendChild(meta);
    row.appendChild(status);

    row.addEventListener("click", () => {
      setOfficeActiveAgent(agent.id);
      if (row.dataset.status === "waiting_for_you") {
        handleOfficeAgentAction(agent.id);
      }
    });

    officeAgentPool.appendChild(row);

    officeState.nodes[agent.id] = {
      card: row,
      row,
      dot,
      status
    };

     if (!officeState.agents[agent.id]) {
       officeState.agents[agent.id] = {
         lastTask: "No recent task",
         nextAction: "Standing by",
         status: "idle"
       };
     }
     if (agent.id === "henry" && officeState.agents[agent.id]?.lastTask === "No recent task") {
       officeState.agents[agent.id].lastTask = "Build Council - S…";
       officeState.agents[agent.id].nextAction = "Review with you";
     }
   });
}

function closeOfficeInfo() {
  return;
}

function recordOfficeNote(agentId, { lastTask, nextAction } = {}) {
  if (!agentId) return;
  const entry = officeState.agents[agentId] || { lastTask: "", nextAction: "", status: "idle" };
  if (lastTask !== undefined) entry.lastTask = lastTask;
  if (nextAction !== undefined) entry.nextAction = nextAction;
  officeState.agents[agentId] = entry;
}

function normalizeHumorEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const text = String(entry.text || "").trim();
  if (!text) return null;
  return {
    id: String(entry.id || `humor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    text,
    type: String(entry.type || "line").trim().toLowerCase() || "line",
    tone: String(entry.tone || "witty").trim().toLowerCase() || "witty",
    source: String(entry.source || "user").trim().toLowerCase() || "user",
    agent: String(entry.agent || "all").trim().toLowerCase() || "all",
    createdAt: String(entry.createdAt || new Date().toISOString())
  };
}

function migrateLegacyHumor(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const entries = [];
  Object.entries(raw).forEach(([key, lines]) => {
    if (!Array.isArray(lines)) return;
    lines.forEach((line) => {
      const text = String(line || "").trim();
      if (!text) return;
      entries.push({
        text,
        type: "line",
        tone: "witty",
        source: "user",
        agent: key || "all"
      });
    });
  });
  return entries.map(normalizeHumorEntry).filter(Boolean);
}

function ensureHumorMemory() {
  if (officeState.humorMemory) return officeState.humorMemory;
  let stored = null;
  try {
    const raw = localStorage.getItem(HUMOR_MEMORY_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }

  let entries = [];
  if (stored && Array.isArray(stored.entries)) {
    entries = stored.entries.map(normalizeHumorEntry).filter(Boolean);
  } else {
    let legacy = null;
    try {
      const rawLegacy = localStorage.getItem(HUMOR_MEMORY_LEGACY_KEY);
      legacy = rawLegacy ? JSON.parse(rawLegacy) : null;
    } catch {
      legacy = null;
    }
    entries = migrateLegacyHumor(legacy);
  }

  const baseEntries = DEFAULT_HUMOR_LINES.map(normalizeHumorEntry).filter(Boolean);
  const combined = [...baseEntries, ...entries];
  officeState.humorMemory = { entries: combined.slice(-220) };
  return officeState.humorMemory;
}

function saveHumorMemory() {
  if (!officeState.humorMemory) return;
  try {
    localStorage.setItem(HUMOR_MEMORY_KEY, JSON.stringify(officeState.humorMemory));
  } catch {}
}

function addHumorEntry({ agent = "all", text, type = "line", tone = "witty", source = "user" } = {}) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  const entry = normalizeHumorEntry({ agent, text: clean, type, tone, source });
  if (!entry) return false;
  const memory = ensureHumorMemory();
  memory.entries.push(entry);
  memory.entries = memory.entries.slice(-220);
  saveHumorMemory();
  return true;
}

function getHumorSummary() {
  const memory = ensureHumorMemory();
  const entries = memory.entries || [];
  const byAgent = entries.reduce((acc, entry) => {
    const key = entry.agent || "all";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { total: entries.length, byAgent };
}

function handleOfficeHumorAdd() {
  if (!officeHumorText) return;
  const agentId = String(officeHumorAgent?.value || "all").trim().toLowerCase();
  const line = String(officeHumorText.value || "").trim();
  if (!line) {
    showToast("Add a humor line first.", "error");
    return;
  }
  const ok = addHumorEntry({ agent: agentId, text: line, type: "line", tone: "witty", source: "user" });
  if (ok) {
    officeHumorText.value = "";
    const summary = getHumorSummary();
    showToast(`Humor memory updated (${summary.total}).`, "ok");
  }
}

function pickRandom(list) {
  if (!list || !list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

function generateHumorLine(agentId) {
  if (agentId === "henry") {
    const noun = pickRandom(["signal", "decision", "pattern", "tradeoff"]);
    const meaning = pickRandom(["a lesson", "a cost", "a consequence", "a direction"]);
    return { text: `Every ${noun} has ${meaning}.`, tone: "reflective", type: "idea" };
  }
  if (agentId === "scout") {
    const count = pickRandom(["two", "three", "five", "ten"]);
    const noun = pickRandom(["threads", "angles", "rabbit holes", "questions"]);
    return { text: `Pulled one thread. Found ${count} more ${noun}.`, tone: "witty", type: "line" };
  }
  if (agentId === "quill") {
    const style = pickRandom(["sharp", "poetic", "lean", "dramatic"]);
    const finish = pickRandom(["and still true", "without losing the point", "with a clean hook", "but grounded"]);
    return { text: `We can make it ${style} ${finish}.`, tone: "dramatic", type: "line" };
  }
  if (agentId === "codex") {
    const verb = pickRandom(["optimizing", "compiling", "reducing", "shipping"]);
    const noun = pickRandom(["latency", "diffs", "risk", "noise"]);
    return { text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${noun}. Humor optional.`, tone: "sarcastic", type: "line" };
  }
  return { text: "Quiet room, loud focus.", tone: "witty", type: "line" };
}

function pickHumorLine(agentId) {
  const memory = ensureHumorMemory();
  const pool = (memory.entries || []).filter((entry) => {
    if (!entry || !entry.text) return false;
    if (entry.agent === "all") return true;
    return entry.agent === agentId;
  });
  if (pool.length && Math.random() < 0.75) {
    return pickRandom(pool);
  }
  const generated = generateHumorLine(agentId);
  if (generated?.text) {
    addHumorEntry({ agent: agentId, text: generated.text, type: generated.type, tone: generated.tone, source: "agent" });
  }
  return generated;
}

function mapDashboardAgentToOffice(agent) {
  const normalized = String(agent || "").trim().toLowerCase();
  if (normalized === "coach") return "henry";
  if (normalized === "scout") return "scout";
  if (normalized === "builder") return "codex";
  if (normalized === "strategist") return "henry";
  if (normalized === "think tank" || normalized === "thinktank") return "henry";
  return "henry";
}

function setOfficeOverride(agentId, status, ttlMs = 0, meta = {}) {
  if (!agentId) return;
  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  officeState.overrides[agentId] = { status, expiresAt, meta };
  updateOfficeSimulation();
}

function getOfficeOverride(agentId) {
  const entry = officeState.overrides[agentId];
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    delete officeState.overrides[agentId];
    return null;
  }
  return entry;
}

function deriveHenryStatus() {
  const tasks = officeState.tasks || [];
  const statuses = tasks.map((task) => String(task?.status || "").toLowerCase());
  if (statuses.some((status) => ["kill", "rejected"].includes(status))) return "blocked";
  if (statuses.some((status) => ["awaiting_approval", "approve"].includes(status))) return "waiting_for_you";
  if (statuses.some((status) => ["assigned", "proposed", "created", "revise"].includes(status))) return "working";
  return "idle";
}

function deriveScoutStatus() {
  const store = contentState.store || { signals: [], topics: [] };
  const signalCount = store.signals?.length || 0;
  const topicCount = store.topics?.length || 0;
  if (!signalCount && !topicCount) return "idle";
  return signalCount > topicCount ? "working" : "idle";
}

function deriveQuillStatus() {
  const drafts = contentState.store?.drafts || [];
  if (!drafts.length) return "idle";
  if (drafts.some((draft) => draft.status === "pending_approval")) return "waiting_for_you";
  if (drafts.some((draft) => draft.status === "rejected")) return "blocked";
  if (drafts.some((draft) => draft.status === "draft")) return "working";
  return "idle";
}

function deriveDefaultStatus(agentConfig) {
  if (!agentConfig) return "idle";
  if (agentConfig.id === "henry") return deriveHenryStatus();
  if (agentConfig.id === "scout") return deriveScoutStatus();
  if (agentConfig.id === "quill") return deriveQuillStatus();

  const runtimeStatus = String(runtimeAgentStatuses?.[agentConfig.mapsTo] || "").toLowerCase();
  if (runtimeStatus === "thinking" || runtimeStatus === "speaking" || runtimeStatus === "listening") return "working";
  return "idle";
}

function applyOfficeCoolerCluster(node, agentState, enabled) {
  if (!node?.card) return;
  if (enabled && officeCoolerList) {
    if (!agentState.clusterOffset) {
      const agentId = node.card.dataset.agent || "";
      const index = OFFICE_AGENTS.findIndex((agent) => agent.id === agentId);
      const base = OFFICE_COOLER_OFFSETS[index >= 0 ? index : 0] || { x: 0, y: 0 };
      const jitter = {
        x: Math.round((Math.random() - 0.5) * 10),
        y: Math.round((Math.random() - 0.5) * 10)
      };
      agentState.clusterOffset = {
        x: base.x + jitter.x,
        y: base.y + jitter.y
      };
    }
    node.card.classList.add("in-cooler");
    node.card.style.setProperty("--cluster-x", `${agentState.clusterOffset.x}px`);
    node.card.style.setProperty("--cluster-y", `${agentState.clusterOffset.y}px`);
  } else {
    node.card.classList.remove("in-cooler");
    node.card.style.removeProperty("--cluster-x");
    node.card.style.removeProperty("--cluster-y");
  }
}

function animateOfficeMove(card, fromRect, toRect, agentId) {
  if (!card || !fromRect || !toRect) return;
  const deltaX = fromRect.left - toRect.left;
  const deltaY = fromRect.top - toRect.top;
  if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
  card.style.transition = "transform 600ms ease";
  card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  card.getBoundingClientRect();
  requestAnimationFrame(() => {
    card.classList.add("moving");
    card.style.transform = "";
  });
  if (officeState.moveTimers[agentId]) {
    clearTimeout(officeState.moveTimers[agentId]);
  }
  officeState.moveTimers[agentId] = setTimeout(() => {
    card.classList.remove("moving");
    card.style.transition = "";
    card.style.transform = "";
  }, 650);
}

function updateOfficeAgent(agentConfig) {
  if (!agentConfig) return;
  const node = officeState.nodes[agentConfig.id];
  if (!node) return;

  const override = getOfficeOverride(agentConfig.id);
  const status = override?.status || deriveDefaultStatus(agentConfig);
  const meta = override?.meta || {};
  const agentState = officeState.agents[agentConfig.id] || { lastTask: "", nextAction: "" };
  const prevStatus = agentState.status;
  const lastTask = meta.lastTask ?? agentState.lastTask ?? "";
  let nextAction = meta.nextAction ?? agentState.nextAction ?? "";
  if (!nextAction && status === "waiting_for_you") nextAction = "Needs your input";
  if (!nextAction && status === "blocked") nextAction = "Unblock or revise";

  agentState.status = status;
  agentState.lastTask = lastTask;
  agentState.nextAction = nextAction;
  officeState.agents[agentConfig.id] = agentState;

  if (prevStatus && prevStatus !== status) {
    node.card.classList.add("pulse");
    if (officeState.pulseTimers[agentConfig.id]) {
      clearTimeout(officeState.pulseTimers[agentConfig.id]);
    }
    officeState.pulseTimers[agentConfig.id] = setTimeout(() => {
      node.card.classList.remove("pulse");
    }, 900);
  }

  node.card.dataset.status = status;
  node.card.dataset.priority = "false";
  const label = status.replace(/_/g, " ").toUpperCase();
  if (node.status) node.status.textContent = label;
  if (node.row) node.row.dataset.status = status;
}

function formatOfficeStatus(status = "") {
  return status.replace(/_/g, " ");
}

function setOfficeActiveAgent(agentId) {
  if (!agentId) return;
  officeState.activeAgentId = agentId;
  updateOfficeCommandPanel();
  updateOfficeControlPanel();
}

function syncOfficeActiveAgent() {
  const active = officeState.activeAgentId;
  const exists = OFFICE_AGENTS.some((agent) => agent.id === active);
  if (exists) return;
  const waiting = OFFICE_AGENTS.find((agent) => officeState.agents[agent.id]?.status === "waiting_for_you");
  const working = OFFICE_AGENTS.find((agent) => officeState.agents[agent.id]?.status === "working");
  officeState.activeAgentId = waiting?.id || working?.id || OFFICE_AGENTS[0]?.id || "";
}

function updateOfficeCommandPanel() {
  if (!officeCommandActive || !officeCommandEmpty) return;
  const agentId = officeState.activeAgentId;
  const agent = OFFICE_AGENTS.find((item) => item.id === agentId);
  if (!agent) {
    officeCommandActive.classList.add("hidden");
    officeCommandEmpty.classList.remove("hidden");
    return;
  }

  Object.values(officeState.nodes).forEach((node) => {
    if (!node?.card) return;
    node.card.classList.toggle("active", node.card.dataset.agent === agentId);
  });

  const agentState = officeState.agents[agentId] || {};
  const status = agentState.status || "idle";
  const statusLabel = formatOfficeStatus(status);
  const task = agentState.lastTask && agentState.lastTask !== "No recent task" ? agentState.lastTask : "No active task";
  const nextAction = agentState.nextAction || "";

  if (officeCommandName) officeCommandName.textContent = agent.name;
  if (officeCommandRole) officeCommandRole.textContent = agent.role;
  if (officeCommandStatus) officeCommandStatus.textContent = statusLabel.toUpperCase();
  if (officeCommandTask) officeCommandTask.textContent = task;
  officeCommandActive.dataset.status = status;

  if (officeCommandLogs) {
    const logs = [];
    if (status === "working") logs.push("Status: Processing task");
    if (status === "waiting_for_you") logs.push("Status: Awaiting approval");
    if (status === "blocked") logs.push("Status: Blocked");
    if (status === "done") logs.push("Status: Completed");
    if (task && task !== "No active task") logs.push(`Task: ${task}`);
    if (nextAction) logs.push(`Next: ${nextAction}`);
    if (!logs.length) logs.push("Standing by.");
    officeCommandLogs.innerHTML = logs.map((line) => `<li>${line}</li>`).join("");
  }

  officeCommandEmpty.classList.add("hidden");
  officeCommandActive.classList.remove("hidden");

  if (officeState.lastActiveAgentId !== agentId) {
    officeState.lastActiveAgentId = agentId;
    officeCommandActive.classList.remove("arrive");
    requestAnimationFrame(() => {
      officeCommandActive.classList.add("arrive");
    });
    setTimeout(() => {
      officeCommandActive.classList.remove("arrive");
    }, 520);
  }
}

function updateOfficeControlPanel() {
  if (!officeControlDecisions) return;
  const waitingAgents = OFFICE_AGENTS.filter((agent) => officeState.agents[agent.id]?.status === "waiting_for_you");
  if (!waitingAgents.length) {
    officeControlDecisions.innerHTML = `<div class="control-empty">No pending approvals.</div>`;
    return;
  }
  officeControlDecisions.innerHTML = waitingAgents
    .map(
      (agent) => `
        <div class="control-item" data-agent="${agent.id}">
          <span class="control-dot"></span>
          <span class="control-name">${agent.name}</span>
          <button class="top-btn control-review" type="button" data-agent="${agent.id}">Review</button>
        </div>
      `
    )
    .join("");
  officeControlDecisions.querySelectorAll(".control-review").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const id = event.currentTarget?.dataset?.agent;
      if (!id) return;
      setOfficeActiveAgent(id);
      handleOfficeAgentAction(id);
    });
  });
}

function updateOfficePoolStatus() {
  if (!officePoolStatus) return;
  const statuses = OFFICE_AGENTS.map((agent) => officeState.agents[agent.id]?.status || "idle");
  const idle = statuses.filter((status) => status === "idle").length;
  const working = statuses.filter((status) => status === "working").length;
  const waiting = statuses.filter((status) => status === "waiting_for_you").length;
  const blocked = statuses.filter((status) => status === "blocked").length;
  officePoolStatus.textContent = `Idle: ${idle} • Working: ${working} • Waiting: ${waiting} • Blocked: ${blocked}`;
}

function updateOfficeSimulation() {
  if (!officeView) return;
  OFFICE_AGENTS.forEach((agent) => updateOfficeAgent(agent));
  applyOfficeAttentionBalance();
  syncOfficeActiveAgent();
  updateOfficeCommandPanel();
  updateOfficeControlPanel();
  updateOfficePoolStatus();
  const nextMode = computeOfficeMode();
  if (nextMode !== officeState.mode) {
    updateOfficeMode(nextMode);
    scheduleOfficeChatter();
  }
  if (state.view === "office") {
    renderOffice2AgentCards();
  }
}

function applyOfficeAttentionBalance() {
  const waitingAgents = OFFICE_AGENTS.filter((agent) => officeState.agents[agent.id]?.status === "waiting_for_you");
  const waitingNow = waitingAgents.length > 0;
  let primary = officeState.attentionLeaderId;
  if (!primary || !waitingAgents.some((agent) => agent.id === primary)) {
    primary = waitingAgents.length ? waitingAgents[0].id : "";
  }
  officeState.attentionLeaderId = primary;
  if (waitingNow !== officeState.waitingActive) {
    officeState.waitingActive = waitingNow;
    scheduleOfficeChatter();
  }
  if (officeView) {
    if (primary) {
      officeView.dataset.attention = "true";
    } else {
      delete officeView.dataset.attention;
    }
  }
  OFFICE_AGENTS.forEach((agent) => {
    const node = officeState.nodes[agent.id];
    if (!node?.card) return;
    const isPrimary = primary && agent.id === primary;
    if (primary && !isPrimary) {
      node.card.classList.add("subtle");
    } else {
      node.card.classList.remove("subtle");
    }
    node.card.dataset.priority = isPrimary ? "true" : "false";
  });
  updateOfficeModeChip();
  if (waitingAgents.length > 1) {
    waitingAgents.slice(1).forEach((agent) => {
      if (officeState.overrides[agent.id]?.status === "idle") return;
      setOfficeOverride(agent.id, "idle", 4000, {
        lastTask: "Queued for attention",
        nextAction: "Stand by",
        queuedForAttention: true
      });
    });
  }
}

function handleOfficeAgentAction(agentId) {
  if (!agentId) return;
  setOfficeOverride(agentId, "working", 5000, {
    lastTask: "Reviewing with you",
    nextAction: "Complete review"
  });
  if (agentId === "quill") {
    setView("content");
    const pending = contentState.store?.drafts?.find((draft) => draft.status === "pending_approval");
    if (pending) {
      contentState.selectedDraftId = pending.id;
      renderContentPipeline();
    }
    showToast("Review pending drafts for approval.", "ok");
    return;
  }

  if (agentId === "henry") {
    setView("dashboard");
    showToast("Pending tasks need a decision.", "ok");
    return;
  }

  if (agentId === "codex") {
    setView("dashboard");
    showToast(`Check ${mcDisplayName("codex") || "Codex"} output in the dashboard thread.`, "ok");
    return;
  }

  if (agentId === "scout") {
    setView("content");
    showToast("Review signals and promote topics.", "ok");
  }
}

function handleOfficeCommandAction(action) {
  const agentId = officeState.activeAgentId;
  if (!agentId) {
    showToast("Select an agent first.", "error");
    return;
  }
  const agentState = officeState.agents[agentId] || {};
  const status = agentState.status || "idle";
  if (action === "approve") {
    if (status === "waiting_for_you") {
      handleOfficeAgentAction(agentId);
      showToast("Approval sent.", "ok");
      return;
    }
    setOfficeOverride(agentId, "done", 3000, {
      lastTask: agentState.lastTask || "Approved task",
      nextAction: "Return to pool"
    });
    showToast("Approved.", "ok");
    return;
  }
  if (action === "edit") {
    setOfficeOverride(agentId, "working", 6000, {
      lastTask: agentState.lastTask || "Editing task",
      nextAction: "Review edits"
    });
    showToast("Editing queued.", "ok");
    return;
  }
  if (action === "retry") {
    setOfficeOverride(agentId, "working", 6000, {
      lastTask: agentState.lastTask || "Retrying task",
      nextAction: "Await output"
    });
    showToast("Retry started.", "ok");
    return;
  }
  if (action === "cancel") {
    setOfficeOverride(agentId, "blocked", 4000, {
      lastTask: agentState.lastTask || "Canceled",
      nextAction: "Await new task"
    });
    showToast("Canceled.", "ok");
  }
}

function pauseAllOfficeAgents() {
  OFFICE_AGENTS.forEach((agent) => {
    setOfficeOverride(agent.id, "idle", 6000, {
      lastTask: "Paused",
      nextAction: "Awaiting resume"
    });
  });
  showToast("All agents paused.", "ok");
}

function overrideActiveOfficeAgent() {
  const agentId = officeState.activeAgentId;
  if (!agentId) {
    showToast("Select an agent first.", "error");
    return;
  }
  setOfficeOverride(agentId, "blocked", 5000, {
    lastTask: "Override issued",
    nextAction: "Awaiting your input"
  });
  showToast("Override applied.", "ok");
}

function hasPendingApprovals() {
  const drafts = contentState.store?.drafts || [];
  const pendingDrafts = drafts.some((draft) => draft.status === "pending_approval");
  const tasks = officeState.tasks || [];
  const pendingTasks = tasks.some((task) => ["awaiting_approval", "approve"].includes(String(task?.status || "").toLowerCase()));
  return pendingDrafts || pendingTasks;
}

function hasUrgentTasks() {
  const tasks = officeState.tasks || [];
  const urgentTask = tasks.some((task) => ["kill", "rejected"].includes(String(task?.status || "").toLowerCase()));
  const drafts = contentState.store?.drafts || [];
  const urgentDraft = drafts.some((draft) => draft.status === "rejected");
  return urgentTask || urgentDraft;
}

function getQueuedAttentionCount() {
  const waitingAgents = OFFICE_AGENTS.filter((agent) => officeState.agents[agent.id]?.status === "waiting_for_you");
  const waitingQueue = Math.max(0, waitingAgents.length - 1);
  const queuedOverrides = Object.values(officeState.overrides || {}).filter(
    (entry) => entry?.meta?.queuedForAttention
  ).length;
  return waitingQueue + queuedOverrides;
}

function updateOfficeCoolerSummary() {
  if (!officeCoolerSummary) return;
  const statuses = OFFICE_AGENTS.map((agent) => officeState.agents[agent.id]?.status || "idle");
  const idleCount = statuses.filter((status) => status === "idle").length;
  const workingCount = statuses.filter((status) => status === "working").length;
  const blockedCount = statuses.filter((status) => status === "blocked").length;
  const doneCount = statuses.filter((status) => status === "done").length;
  const waitingCount = statuses.filter((status) => status === "waiting_for_you").length;
  const queuedCount = getQueuedAttentionCount();
  const lines = [];
  if (officeState.attentionLeaderId) {
    lines.push({
      label: "Attention",
      value: getOfficeAgentName(officeState.attentionLeaderId)
    });
  }
  if (queuedCount) {
    lines.push({ label: "Queued", value: `${queuedCount} waiting` });
  }
  if (hasPendingApprovals()) {
    lines.push({ label: "Approvals", value: "Pending" });
  }
  if (hasUrgentTasks()) {
    lines.push({ label: "Urgent", value: "Blockers" });
  }
  lines.push({ label: "Idle", value: String(idleCount) });
  lines.push({ label: "Working", value: String(workingCount) });
  if (waitingCount) lines.push({ label: "Waiting", value: String(waitingCount) });
  if (blockedCount) lines.push({ label: "Blocked", value: String(blockedCount) });
  if (doneCount) lines.push({ label: "Done", value: String(doneCount) });

  officeCoolerSummary.innerHTML = lines
    .map(
      (line) =>
        `<div class="cooler-line"><span class="cooler-label">${line.label}</span><span class="cooler-value">${line.value}</span></div>`
    )
    .join("");
}

function isOpenMicEligible() {
  const statuses = OFFICE_AGENTS.map((agent) => officeState.agents[agent.id]?.status || "idle");
  const allIdle = statuses.every((status) => status === "idle");
  return allIdle && !hasPendingApprovals() && !hasUrgentTasks();
}

function computeOfficeMode() {
  const statuses = OFFICE_AGENTS.map((agent) => officeState.agents[agent.id]?.status || "idle");
  const idleCount = statuses.filter((status) => status === "idle").length;
  if (isOpenMicEligible()) return "open_mic";
  if (idleCount > 0) return "pulse";
  return "flow";
}

function readOfficeBaseSize() {
  if (!officeStage) return { width: 1200, height: 720 };
  const styles = getComputedStyle(officeStage);
  const baseW = parseFloat(styles.getPropertyValue("--office-base-w")) || 1200;
  const baseH = parseFloat(styles.getPropertyValue("--office-base-h")) || 720;
  return { width: baseW, height: baseH };
}

function setOfficeScale() {
  if (!officeStage || !officeView || officeView.classList.contains("hidden")) return;
  const rect = officeStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const { width: baseW, height: baseH } = readOfficeBaseSize();
  const padding = 16;
  const availableW = Math.max(0, rect.width - padding);
  const availableH = Math.max(0, rect.height - padding);
  let scale = Math.min(availableW / baseW, availableH / baseH);
  scale = Math.max(0.95, Math.min(scale, 1.6));
  officeStage.style.setProperty("--office-scale", scale.toFixed(3));
}

let officeScaleRaf = null;
function scheduleOfficeScale() {
  if (officeScaleRaf) cancelAnimationFrame(officeScaleRaf);
  officeScaleRaf = requestAnimationFrame(() => {
    setOfficeScale();
    officeScaleRaf = null;
  });
}

function getOfficeAgentName(agentId) {
  const match = OFFICE_AGENTS.find((agent) => agent.id === agentId);
  return match?.name || "Agent";
}

function applyOfficeStudioMode() {
  const enabled = Boolean(officeState.studio);
  const active = enabled && state.view === "office";
  if (officeView) {
    if (active) {
      officeView.dataset.studio = "true";
    } else {
      delete officeView.dataset.studio;
    }
  }
  if (document.body) {
    if (active) {
      document.body.dataset.officeStudio = "true";
    } else {
      delete document.body.dataset.officeStudio;
    }
  }
  if (officeStudioToggle) {
    officeStudioToggle.textContent = `Studio Mode: ${enabled ? "On" : "Off"}`;
    officeStudioToggle.dataset.active = enabled ? "true" : "false";
  }
  scheduleOfficeScale();
}

function updateOfficeModeChip() {
  const modeLabel = OFFICE_MODES[officeState.mode] || OFFICE_MODES.flow;
  const attentionLabel = officeState.attentionLeaderId
    ? ` \u00b7 Attention: ${getOfficeAgentName(officeState.attentionLeaderId)}`
    : "";
  if (officeModeChip) {
    officeModeChip.textContent = `Mode: ${modeLabel}${attentionLabel}`;
    officeModeChip.dataset.mode = officeState.mode;
    officeModeChip.dataset.attention = officeState.attentionLeaderId ? "true" : "false";
  }
  if (officeAttentionChip) {
    if (officeState.attentionLeaderId) {
      officeAttentionChip.textContent = `Attention: ${getOfficeAgentName(officeState.attentionLeaderId)}`;
      officeAttentionChip.classList.remove("hidden");
    } else {
      officeAttentionChip.classList.add("hidden");
    }
  }
}

function updateOfficeMode(nextMode) {
  const normalized = OFFICE_MODES[nextMode] ? nextMode : "flow";
  officeState.mode = normalized;
  updateOfficeModeChip();
  if (normalized !== "open_mic") {
    clearOfficeSpeech();
  }
}

function hasWaitingForYou() {
  return OFFICE_AGENTS.some((agent) => officeState.agents[agent.id]?.status === "waiting_for_you");
}

function computeChatterDelay() {
  const waiting = hasWaitingForYou();
  const mode = officeState.mode;
  let min = 30000;
  let max = 45000;
  if (mode === "pulse") {
    min = 18000;
    max = 26000;
  }
  if (mode === "open_mic") {
    min = 6500;
    max = 9500;
  }
  if (waiting) {
    min += 12000;
    max += 16000;
  }
  return Math.floor(min + Math.random() * (max - min));
}

function chooseAgentForChatter(mode) {
  const waiting = hasWaitingForYou();
  const candidates = OFFICE_AGENTS.filter((agent) => !waiting || officeState.agents[agent.id]?.status !== "waiting_for_you");
  if (!candidates.length) return "";

  const weighted = [];
  candidates.forEach((agent) => {
    const status = officeState.agents[agent.id]?.status || "idle";
    const weight = status === "idle" ? 4 : 1;
    for (let i = 0; i < weight; i += 1) {
      weighted.push(agent.id);
    }
  });

  let pick = pickRandom(weighted);
  if (officeState.lastSpeakerId && weighted.length > 1 && pick === officeState.lastSpeakerId) {
    pick = pickRandom(weighted.filter((id) => id !== officeState.lastSpeakerId));
  }
  officeState.lastSpeakerId = pick;
  return pick;
}

function showOfficeSpeech(agentId, line, options = {}) {
  const node = officeState.nodes[agentId];
  if (!node?.speech) return;
  clearOfficeSpeech();
  const text = String(line || "").trim();
  if (!text) return;
  const maxLen = options.maxLen || 120;
  const clipped = text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
  node.speech.textContent = clipped;
  node.speech.classList.add("show");
  const tone = options.tone || (options.subtle ? "background" : "primary");
  node.speech.dataset.tone = tone;
  if (officeState.speechTimers[agentId]) {
    clearTimeout(officeState.speechTimers[agentId]);
  }
  officeState.speechTimers[agentId] = setTimeout(() => {
    node.speech.classList.remove("show");
    delete node.speech.dataset.tone;
  }, 5200);
}

function clearOfficeSpeech() {
  Object.values(officeState.nodes).forEach((node) => {
    if (!node?.speech) return;
    node.speech.classList.remove("show");
    delete node.speech.dataset.tone;
  });
}

function emitOfficeChatter() {
  if (!officeState.active || !officeView || officeView.classList.contains("hidden")) return;
  if (officeState.mode === "open_mic" && !isOpenMicEligible()) return;
  const agentId = chooseAgentForChatter(officeState.mode);
  if (!agentId) return;
  const entry = pickHumorLine(agentId);
  if (entry?.text) {
    const waiting = hasWaitingForYou();
    const subtle = officeState.mode !== "open_mic" || waiting;
    showOfficeSpeech(agentId, entry.text, { subtle, maxLen: 120 });
  }
}

function scheduleOfficeChatter() {
  if (officeState.chatterTimer) {
    clearTimeout(officeState.chatterTimer);
    officeState.chatterTimer = null;
  }
  if (!officeState.active) return;
  const delay = computeChatterDelay();
  officeState.chatterTimer = setTimeout(() => {
    emitOfficeChatter();
    scheduleOfficeChatter();
  }, delay);
}

async function loadOfficeTasks() {
  try {
    const res = await apiRequest("/tasks");
    const tasks = res?.tasks && typeof res.tasks === "object" ? Object.values(res.tasks) : [];
    officeState.tasks = tasks || [];
  } catch {
    officeState.tasks = [];
  }
}

async function refreshOfficeData() {
  await Promise.all([loadOfficeTasks(), loadContentPipeline()]);
  updateOfficeSimulation();
}

function startOfficeSync() {
  officeState.active = true;
  ensureHumorMemory();
  updateOfficeMode(computeOfficeMode());
  updateOfficeSimulation();
  if (officeState.timer) {
    clearInterval(officeState.timer);
    officeState.timer = null;
  }
  void refreshOfficeData();
  officeState.timer = setInterval(() => {
    void refreshOfficeData();
  }, 6000);
  scheduleOfficeChatter();
}

function stopOfficeSync() {
  officeState.active = false;
  if (officeState.timer) {
    clearInterval(officeState.timer);
    officeState.timer = null;
  }
  if (officeState.chatterTimer) {
    clearTimeout(officeState.chatterTimer);
    officeState.chatterTimer = null;
  }
  Object.values(officeState.speechTimers).forEach((timer) => clearTimeout(timer));
  officeState.speechTimers = {};
  clearOfficeSpeech();
}

// ===== SPEECH CLARITY MODULE =====
const speechElems = {
  goSpeechBtn: document.getElementById("go-speech"),
  listPanel: document.getElementById("speech-list-panel"),
  recordPanel: document.getElementById("speech-record-panel"),
  analysisPanel: document.getElementById("speech-analysis-panel"),
  reflectionPanel: document.getElementById("speech-reflection-panel"),
  createBtn: document.getElementById("speech-create-btn"),
  startBtn: document.getElementById("speech-start-btn"),
  stopBtn: document.getElementById("speech-stop-btn"),
  saveBtn: document.getElementById("speech-save-btn"),
  backBtn: document.getElementById("speech-back-btn")
};

const speechState = {
  currentSession: null,
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  recordingStartTime: 0,
  recordingDuration: 0,
  sessionTranscript: "",
  recognition: null,
  recognitionActive: false,
  interimTranscript: "",
  finalTranscript: "",
  recognitionIntentionallyStopped: false
};

async function initSpeechClarity() {
  if (speechElems.createBtn) {
    speechElems.createBtn.addEventListener("click", createSpeechSession);
  }
  if (speechElems.startBtn) {
    speechElems.startBtn.addEventListener("click", startSpeechRecording);
  }
  if (speechElems.stopBtn) {
    speechElems.stopBtn.addEventListener("click", stopSpeechRecording);
  }
  if (speechElems.saveBtn) {
    speechElems.saveBtn.addEventListener("click", saveSpeechSession);
  }
  await loadSpeechSessions();
}

async function loadSpeechSessions() {
  try {
    const res = await apiRequest("/speech/sessions");
    if (res.ok && res.sessions) {
      renderSessions(res.sessions);
    }
  } catch (e) {
    showToast("Failed to load sessions", "error");
  }
}

function renderSessions(sessions) {
  if (!speechElems.listPanel) return;
  const list = speechElems.listPanel.querySelector(".sessions-list");
  if (!list) return;
  list.innerHTML = "";
  for (const session of sessions) {
    const el = document.createElement("div");
    el.className = "session-item";
    el.innerHTML = "<div>" + session.title + " (" + session.mode + ")</div><button>View</button>";
    el.querySelector("button").addEventListener("click", () => viewSession(session.id));
    list.appendChild(el);
  }
}

async function createSpeechSession() {
  const mode = document.getElementById("speech-mode-select")?.value || "learning";
  const title = document.getElementById("speech-title-input")?.value || "Session";
  try {
    const res = await apiRequest("/speech/session/create", {
      method: "POST",
      body: { mode, title }
    });
    if (res.ok && res.session) {
      speechState.currentSession = res.session;
      showRecordPanel();
    }
  } catch (e) {
    showToast("Failed to create session", "error");
  }
}

function showRecordPanel() {
  if (speechElems.listPanel) speechElems.listPanel.classList.add("hidden");
  if (speechElems.recordPanel) speechElems.recordPanel.classList.remove("hidden");
}

function initSpeechRecognition() {
  if (speechState.recognition) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("Speech recognition not supported in this browser", "error");
    return;
  }
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";

  rec.onstart = () => {
    speechState.recognitionActive = true;
  };

  rec.onresult = (event) => {
    speechState.interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        speechState.finalTranscript += transcript + " ";
      } else {
        speechState.interimTranscript += transcript;
      }
    }
    updateLiveTranscript();
  };

  rec.onerror = (event) => {
    if (event.error !== "aborted" || !speechState.recognitionIntentionallyStopped) {
      console.error("Speech recognition error:", event.error);
    }
  };

  rec.onend = () => {
    speechState.recognitionActive = false;
  };

  speechState.recognition = rec;
}

function startSpeechRecognition() {
  initSpeechRecognition();
  if (speechState.recognition && !speechState.recognitionActive) {
    speechState.interimTranscript = "";
    speechState.finalTranscript = "";
    speechState.recognitionIntentionallyStopped = false;
    try {
      speechState.recognition.start();
    } catch (e) {
      console.error("Could not start recognition:", e);
    }
  }
}

function stopSpeechRecognition() {
  if (speechState.recognition && speechState.recognitionActive) {
    speechState.recognitionIntentionallyStopped = true;
    try {
      speechState.recognition.abort();
    } catch (e) {
      console.error("Could not stop recognition:", e);
    }
    speechState.recognitionActive = false;
    speechState.sessionTranscript = (speechState.finalTranscript + speechState.interimTranscript).trim();
  }
}

function updateLiveTranscript() {
  const fullTranscript = (speechState.finalTranscript + " " + speechState.interimTranscript).trim();
  const transcriptBox = document.getElementById("speech-live-transcript");
  if (transcriptBox) {
    const finalPart = speechState.finalTranscript.trim();
    const interimPart = speechState.interimTranscript.trim();
    transcriptBox.innerHTML = `<span class="final">${finalPart}</span><span class="interim">${interimPart}</span>`;
  }
}

function showListP() {
  if (speechElems.listPanel) speechElems.listPanel.classList.remove("hidden");
  if (speechElems.recordPanel) speechElems.recordPanel.classList.add("hidden");
  if (speechElems.analysisPanel) speechElems.analysisPanel.classList.add("hidden");
}

async function startSpeechRecording() {
  if (!navigator.mediaDevices) {
    showToast("Microphone not available", "error");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    speechState.mediaRecorder = new MediaRecorder(stream);
    speechState.recordedChunks = [];
    speechState.recordingStartTime = Date.now();
    speechState.isRecording = true;
    speechState.sessionTranscript = "";

    speechState.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) speechState.recordedChunks.push(e.data);
    };

    speechState.mediaRecorder.start();
    startSpeechRecognition();
    if (speechElems.startBtn) speechElems.startBtn.classList.add("hidden");
    if (speechElems.stopBtn) speechElems.stopBtn.classList.remove("hidden");
  } catch (e) {
    showToast("Microphone denied", "error");
  }
}

function stopSpeechRecording() {
  if (!speechState.mediaRecorder || !speechState.isRecording) return;
  speechState.isRecording = false;
  speechState.recordingDuration = (Date.now() - speechState.recordingStartTime) / 1000;
  stopSpeechRecognition();
  speechState.mediaRecorder.stop();
  if (speechElems.startBtn) speechElems.startBtn.classList.remove("hidden");
  if (speechElems.stopBtn) speechElems.stopBtn.classList.add("hidden");
  if (speechElems.saveBtn) speechElems.saveBtn.classList.remove("hidden");
}

async function saveSpeechSession() {
  if (!speechState.currentSession || !speechState.recordedChunks.length) {
    showToast("No audio to save", "error");
    return;
  }
  try {
    const id = speechState.currentSession.id;
    const transcript = speechState.sessionTranscript || "recording";
    const duration = Math.round(speechState.recordingDuration);

    await apiRequest("/speech/session/" + id + "/save-transcript", {
      method: "POST",
      body: { transcript_text: transcript, duration_seconds: duration }
    });

    const blob = new Blob(speechState.recordedChunks, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("audio", blob);
    await fetch(apiUrl("/speech/session/" + id + "/upload-audio"), {
      method: "POST",
      body: fd
    });

    const res = await apiRequest("/speech/session/" + id + "/analyze", {
      method: "POST"
    });

    if (res.ok) {
      displayAnalysis(res.metrics, res.drills);
    }
  } catch (e) {
    showToast("Save failed", "error");
  }
}

function displayAnalysis(metrics, drills) {
  if (speechElems.recordPanel) speechElems.recordPanel.classList.add("hidden");
  if (speechElems.analysisPanel) speechElems.analysisPanel.classList.remove("hidden");

  const wpm = document.getElementById("speech-wpm");
  if (wpm) wpm.textContent = (metrics.wpm || 0) + " WPM";
  const filler = document.getElementById("speech-filler-density");
  if (filler) filler.textContent = (metrics.fillerDensityPer100 || 0) + "%";

  const drillsList = document.getElementById("speech-drills-list");
  if (drillsList && drills) {
    drillsList.innerHTML = "";
    for (let i = 0; i < Math.min(4, drills.length); i++) {
      const d = document.createElement("div");
      d.className = "drill-card";
      d.innerHTML = "<h4>" + drills[i].title + "</h4><p>" + drills[i].description + "</p>";
      drillsList.appendChild(d);
    }
  }
}

async function viewSession(id) {
  try {
    const res = await apiRequest("/speech/session/" + id);
    if (res.ok) {
      speechState.currentSession = res.session;
      if (res.session.metrics_json) {
        displayAnalysis(res.session.metrics_json, res.session.drills_json);
      }
    }
  } catch (e) {
    showToast("Load failed", "error");
  }
}

async function revealWorkflowCards() {
  // Hide input phase
  const inputPhase = document.getElementById("entry-input-phase");
  const workflowPhase = document.getElementById("entry-workflow-phase");
  if (inputPhase) inputPhase.classList.add("hidden");
  if (workflowPhase) workflowPhase.classList.remove("hidden");

  // Reveal cards one by one with delays
  const cards = [
    "card-understanding",
    "card-assumptions",
    "card-plan",
    "card-approval",
    "card-execution",
    "card-output"
  ];

  for (let i = 0; i < cards.length; i++) {
    const card = document.getElementById(cards[i]);
    if (card) {
      // Add slight delay between reveals for visual effect
      await new Promise(resolve => setTimeout(resolve, 300 + (i * 150)));
      card.style.opacity = "0";
      card.style.animation = "none";
      // Trigger reflow to restart animation
      card.offsetHeight;
      card.style.animation = "slideInUp 0.4s ease";
      card.style.opacity = "1";
    }
  }
}

async function handleEntrySubmit(e) {
  e.preventDefault();
  const entryForm = document.getElementById("entry-form");
  const intentInput = document.getElementById("entry-intent");
  if (!entryForm || !intentInput) return;

  const intent = String(intentInput.value || "").trim();
  if (!intent) return;

  // Disable button during processing
  const submitBtn = entryForm.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  try {
    state.currentIntent = intent;
    state.workflowState = "processing";

    const run = await apiCreateWorkflowRun(intent, { requestedBy: "operator" });
    if (!run) throw new Error("Server did not return a run");

    state.workflowRunId = run.id;
    state.approvalId = run.approvals?.brief?.approvalId || null;

    const brief = run.brief || {};
    const assumptions = Array.isArray(run.request?.assumptions)
      ? run.request.assumptions.slice(0, 2).join(" \u00b7 ")
      : null;

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    };

    setText("understanding-text", brief.title || run.title || intent);
    setText("assumptions-text", assumptions || brief.summary || "Intent captured.");
    setText(
      "plan-text",
      brief.recommendedLane
        ? brief.recommendedLane + (brief.recommendedDirection ? " \u2014 " + brief.recommendedDirection.slice(0, 120) : "")
        : (Array.isArray(brief.phasedPlan) ? brief.phasedPlan[0] : null) || "Plan generated."
    );
    setText("approval-text", "Brief ready. Approve to start execution.");
    setText("execution-text", "Awaiting approval before execution begins.");
    setText("output-text", "Results will appear here after execution.");

    await revealWorkflowCards();

  } catch (err) {
    console.error("Entry submission failed:", err);
    showToast("Failed to start workflow. Please try again.", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function bindEvents() {
  // Entry form handler
  const entryForm = document.getElementById("entry-form");
  if (entryForm) {
    entryForm.addEventListener("submit", handleEntrySubmit);
  }

  // Entry approval buttons
  const approveBtn = document.getElementById("btn-approve");
  const reviseBtn = document.getElementById("btn-revise");
  if (approveBtn) {
    approveBtn.addEventListener("click", async () => {
      if (!state.workflowRunId) {
        setView("approvals");
        return;
      }
      approveBtn.disabled = true;
      try {
        await apiApproveWorkflowRun(state.workflowRunId, { gate: "brief", decision: "approved", actor: "operator" });
        await apiGenerateWorkflowPack(state.workflowRunId, { actor: "operator" });
        await apiApproveWorkflowRun(state.workflowRunId, { gate: "pack", decision: "approved", actor: "operator" });
        state.workflowState = "completed";
        mcInvalidateOverview();
        showToast("Workflow approved. Decision pack ready.", "ok");
        await new Promise(r => setTimeout(r, 400));
        setView("tasks");
      } catch (err) {
        console.warn("Entry approval failed:", err?.message || err);
        mcInvalidateOverview();
        showToast("Approval failed. Check Mission Control.", "error");
      } finally {
        approveBtn.disabled = false;
      }
    });
  }
  if (reviseBtn) {
    reviseBtn.addEventListener("click", () => {
      setView("approvals");
    });
  }

  // Mission Control routing.
  if (mcNavList) {
    mcNavList.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".mc-nav-item");
      if (!btn) return;
      const view = String(btn.dataset.view || "tasks");
      setView(view);
    });
  }

  window.addEventListener("popstate", () => {
    const view = mcViewFromPath(window.location.pathname) || "tasks";
    setView(view, { silent: true, replace: true });
  });

  // Top bar controls.
  if (mcPauseBtn) {
    mcPauseBtn.title = "Pause all agents briefly";
    mcPauseBtn.addEventListener("click", pauseAllOfficeAgents);
  }
  if (mcPingBtn) {
    const pingRole = mcCanonicalName("henry") || "Chief of Staff";
    const pingDisplay = mcDisplayName("henry") || "Manchi";
    mcPingBtn.textContent = `Ping ${pingRole}`;
    mcPingBtn.title = `${pingDisplay} \u2014 ${pingRole}`;
    mcPingBtn.addEventListener("click", () => {
      setView("agents");
      setOfficeActiveAgent("henry");
      showToast(`Pinged ${pingRole}.`, "ok");
    });
  }
  if (mcRefreshBtn) {
    mcRefreshBtn.title = "Reload the current page";
    mcRefreshBtn.addEventListener("click", () => {
      const route = window.location.pathname || "/tasks";
      window.location.href = `${route}?ts=${Date.now()}`;
    });
  }
  if (mcStatusBtn) {
    mcStatusBtn.title = "Open system status";
    mcStatusBtn.addEventListener("click", () => {
      setView("system");
      showToast("Opened System.", "ok");
    });
  }
  if (mcFeedbackBtn) {
    mcFeedbackBtn.addEventListener("click", () => {
      showToast("Feedback captured. (Wire this later.)", "ok");
    });
  }

  if (mcCommandDrawerClose) mcCommandDrawerClose.addEventListener("click", closeCommandDrawer);
  if (mcCommandDrawerBackdrop) mcCommandDrawerBackdrop.addEventListener("click", closeCommandDrawer);

  if (mcSearchInput) {
    mcSearchInput.placeholder = "Search pages and commands";
    mcSearchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const value = String(mcSearchInput.value || "").trim();
      if (!value) return;
      handleMissionControlSearch(value);
    });
  }
  window.addEventListener("keydown", (e) => {
    if (!mcSearchInput) return;
    const isK = String(e.key || "").toLowerCase() === "k";
    const hasMeta = e.metaKey || e.ctrlKey;
    if (!isK || !hasMeta) return;
    e.preventDefault();
    mcSearchInput.focus();
    mcSearchInput.select();
  });

  // Page controls.
  if (memorySearchInput) {
    memorySearchInput.addEventListener("input", (e) => {
      missionControlState.memory.filter = String(e.target?.value || "");
      renderMemoryPage();
    });
  }
  const ltmCard = document.querySelector(".memory-ltm-card");
  if (ltmCard) {
    const trigger = () => showToast("Long-term memory (demo).", "ok");
    ltmCard.addEventListener("click", trigger);
    ltmCard.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      trigger();
    });
  }

  if (calTodayBtn) {
    calTodayBtn.addEventListener("click", () => {
      missionControlState.calendar.selectedDay = new Date().getDay();
      renderCalendarPage();
    });
  }
  if (calRefreshBtn) calRefreshBtn.addEventListener("click", renderCalendarPage);
  if (calWeekBtn) calWeekBtn.addEventListener("click", renderCalendarPage);

  if (councilRefreshBtn) {
    councilRefreshBtn.addEventListener("click", () => {
      mcInvalidateOverview();
      void renderCouncilPage({ force: true });
    });
  }
  if (councilOpenApprovalsBtn) councilOpenApprovalsBtn.addEventListener("click", () => setView("approvals"));
  if (councilDecisionList) {
    councilDecisionList.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }

  if (projectsRefreshBtn) {
    projectsRefreshBtn.addEventListener("click", () => {
      mcInvalidateOverview();
      void renderProjectsPage({ force: true });
    });
  }
  if (projectsOpenFactoryBtn) projectsOpenFactoryBtn.addEventListener("click", () => setView("factory"));
  if (projectsWorkCreateBtn) projectsWorkCreateBtn.addEventListener("click", handleProjectsCreateItem);
  if (projectsWorkProject) {
    projectsWorkProject.addEventListener("change", () => {
      missionControlState.projects.selectedId = String(projectsWorkProject.value || "");
      void renderProjectsPage();
    });
  }
  if (projectsPortfolioList) {
    projectsPortfolioList.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (btn) {
        void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
        return;
      }
      const card = e.target?.closest?.("[data-project-id]");
      if (!card) return;
      missionControlState.projects.selectedId = String(card.dataset.projectId || "");
      void renderProjectsPage();
    });
    projectsPortfolioList.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target?.closest?.("[data-action]")) return;
      const card = e.target?.closest?.("[data-project-id]");
      if (!card) return;
      e.preventDefault();
      missionControlState.projects.selectedId = String(card.dataset.projectId || "");
      void renderProjectsPage();
    });
  }
  if (projectsDetail) {
    projectsDetail.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }
  if (projectsLedger) {
    projectsLedger.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }

  if (docsRefreshBtn) {
    docsRefreshBtn.addEventListener("click", () => {
      mcInvalidateDocs();
      void renderDocsPage({ force: true });
    });
  }
  if (docsSearchInput) {
    docsSearchInput.addEventListener("input", (e) => {
      missionControlState.docs.filter = String(e.target?.value || "");
      void renderDocsPage();
    });
  }
  if (docsList) {
    docsList.addEventListener("click", (e) => {
      const card = e.target?.closest?.("[data-doc-id]");
      if (!card) return;
      missionControlState.docs.selectedId = String(card.dataset.docId || "");
      void renderDocsPage();
    });
    docsList.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target?.closest?.("[data-doc-id]");
      if (!card) return;
      e.preventDefault();
      missionControlState.docs.selectedId = String(card.dataset.docId || "");
      void renderDocsPage();
    });
  }

  if (peopleOpenTalkBtn) peopleOpenTalkBtn.addEventListener("click", () => setView("talk"));
  if (peopleOpenTeamBtn) peopleOpenTeamBtn.addEventListener("click", () => setView("team"));

  if (systemRefreshBtn) {
    systemRefreshBtn.addEventListener("click", () => {
      mcInvalidateOverview();
      void renderSystemPage({ force: true });
    });
  }

  if (radarRefreshBtn) {
    radarRefreshBtn.addEventListener("click", () => {
      mcInvalidateOverview();
      void renderRadarPage({ force: true });
    });
  }
  if (radarOpenContentBtn) radarOpenContentBtn.addEventListener("click", () => setView("content"));
  if (radarSignalsList) {
    radarSignalsList.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }
  if (radarTopicsList) {
    radarTopicsList.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }

  if (pipelineRefreshBtn) {
    pipelineRefreshBtn.addEventListener("click", () => {
      mcInvalidateOverview();
      void renderPipelinePage({ force: true });
    });
  }
  if (pipelineOpenFactoryBtn) pipelineOpenFactoryBtn.addEventListener("click", () => setView("factory"));
  if (pipelineBoard) {
    pipelineBoard.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }

  const mcRunsList = document.getElementById("mc-runs-list");
  if (mcRunsList) {
    mcRunsList.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }

  if (aiLabRefreshBtn) {
    aiLabRefreshBtn.addEventListener("click", () => {
      mcInvalidateOverview();
      void renderAiLabPage({ force: true });
    });
  }
  if (aiLabOpenTalkBtn) aiLabOpenTalkBtn.addEventListener("click", () => setView("talk"));
  if (aiLabOpenSpeechBtn) aiLabOpenSpeechBtn.addEventListener("click", () => setView("speech"));
  if (aiLabModules) {
    aiLabModules.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action]");
      if (!btn) return;
      void handleMissionAction(String(btn.dataset.action || ""), btn.dataset || {});
    });
  }

  if (office2StartChatBtn) office2StartChatBtn.addEventListener("click", () => setView("talk", { query: "?focus=1" }));

  if (talkUiModeBtn && !talkUiModeBtn.dataset.bound) {
    talkUiModeBtn.dataset.bound = "1";
    talkUiModeBtn.addEventListener("click", () => {
      const enabled = !(talkView && talkView.classList.contains("talk-focus"));
      setTalkFocusMode(enabled, { persist: true, updateUrl: true });
      if (enabled && talkChatInput) talkChatInput.focus();
    });
  }

  if (talkVoiceToggleBtn && !talkVoiceToggleBtn.dataset.bound) {
    talkVoiceToggleBtn.dataset.bound = "1";
    talkVoiceToggleBtn.addEventListener("click", () => {
      void onOrbTap();
    });
  }

  if (talkAdvancedToggleBtn && !talkAdvancedToggleBtn.dataset.bound) {
    talkAdvancedToggleBtn.dataset.bound = "1";
    talkAdvancedToggleBtn.addEventListener("click", () => {
      const expanded = talkAdvancedToggleBtn.getAttribute("aria-expanded") === "true";
      setTalkAdvancedVisible(!expanded);
    });
  }

  if (talkChatSendBtn && !talkChatSendBtn.dataset.bound) {
    talkChatSendBtn.dataset.bound = "1";
    talkChatSendBtn.addEventListener("click", handleTalkComposerSend);
  }
  if (talkChatInput && !talkChatInput.dataset.bound) {
    talkChatInput.dataset.bound = "1";
    talkChatInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      handleTalkComposerSend();
    });
    talkChatInput.addEventListener("input", () => {
      // Auto-grow up to a gentle max height for a ChatGPT-like feel.
      try {
        talkChatInput.style.height = "auto";
        const next = Math.min(140, Math.max(40, talkChatInput.scrollHeight));
        talkChatInput.style.height = `${next}px`;
      } catch {}
    });
  }

  if (factoryBeltItems) {
    factoryBeltItems.addEventListener("click", (e) => {
      const pkg = e.target?.closest?.(".factory-package");
      const itemId = String(pkg?.dataset?.itemId || "");
      if (!itemId) return;
      advanceFactoryItem(itemId);
    });
  }

  goDashboardBtn.addEventListener("click", () => setView("dashboard"));
  if (goOfficeBtn) goOfficeBtn.addEventListener("click", () => setView("office"));
  if (goContentBtn) goContentBtn.addEventListener("click", () => setView("content"));
  goTalkBtn.addEventListener("click", () => setView("talk"));
  const goSpeechBtn = document.getElementById("go-speech");
  if (goSpeechBtn) goSpeechBtn.addEventListener("click", () => setView("speech"));

  taskCards.forEach((card) => card.addEventListener("click", () => selectTaskCard(card)));

  if (dashboardSend) dashboardSend.addEventListener("click", handleDashboardSend);
  if (dashboardInput) {
    dashboardInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleDashboardSend();
    });
  }

  decisionButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleDecision(btn.dataset.action));
  });

  if (contentSignalSave) contentSignalSave.addEventListener("click", handleContentSignalSave);
  if (contentSignalClear) contentSignalClear.addEventListener("click", clearContentSignalForm);
  if (contentTopicSave) contentTopicSave.addEventListener("click", handleContentTopicSave);
  if (contentTopicClear) contentTopicClear.addEventListener("click", clearContentTopicForm);
  if (contentDraftSave) contentDraftSave.addEventListener("click", handleContentDraftSave);
  if (contentDraftRequest)
    contentDraftRequest.addEventListener("click", () => handleContentDraftStatusChange("pending_approval"));
  if (contentDraftApprove)
    contentDraftApprove.addEventListener("click", () => handleContentDraftStatusChange("approved"));
  if (contentDraftReject) contentDraftReject.addEventListener("click", () => handleContentDraftStatusChange("rejected"));
  if (contentRadarList) contentRadarList.addEventListener("click", handleContentRadarListClick);
  if (contentScoutList) contentScoutList.addEventListener("click", handleContentScoutListClick);
  if (contentDraftList) contentDraftList.addEventListener("click", handleContentDraftListClick);
  if (officeHumorAdd) officeHumorAdd.addEventListener("click", handleOfficeHumorAdd);
  if (officeHumorText) {
    officeHumorText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleOfficeHumorAdd();
      }
    });
  }
  if (officeStudioToggle) {
    officeStudioToggle.addEventListener("click", () => {
      officeState.studio = !officeState.studio;
      try {
        localStorage.setItem(OFFICE_STUDIO_KEY, officeState.studio ? "1" : "0");
      } catch {}
      applyOfficeStudioMode();
    });
  }
  if (officeActionApprove) officeActionApprove.addEventListener("click", () => handleOfficeCommandAction("approve"));
  if (officeActionEdit) officeActionEdit.addEventListener("click", () => handleOfficeCommandAction("edit"));
  if (officeActionRetry) officeActionRetry.addEventListener("click", () => handleOfficeCommandAction("retry"));
  if (officeActionCancel) officeActionCancel.addEventListener("click", () => handleOfficeCommandAction("cancel"));
  if (officeActionPause) officeActionPause.addEventListener("click", pauseAllOfficeAgents);
  if (officeActionOverride) officeActionOverride.addEventListener("click", overrideActiveOfficeAgent);
  if (officeActionViewLogs)
    officeActionViewLogs.addEventListener("click", () => showToast("Logs appear in the command station.", "ok"));

  if (talkOrbButton) talkOrbButton.addEventListener("click", onOrbTap);
  if (talkTranscriptToggle) {
    talkTranscriptToggle.addEventListener("click", () => {
      setTranscriptExpanded(!state.transcriptExpanded);
    });
  }

  if (talkVoiceStyle) {
    talkVoiceStyle.addEventListener("change", () => {
      setVoiceStyle(talkVoiceStyle.value);
      state.voiceInfoShown = false;
      showToast("Voice style updated.", "ok");
    });
  }

  if (talkSpeakerSelect) {
    talkSpeakerSelect.addEventListener("change", () => {
      setCurrentSpeakerId(talkSpeakerSelect.value, true);
    });
  }

  if (talkSpeakerEditLabelBtn) {
    talkSpeakerEditLabelBtn.addEventListener("click", async () => {
      const speakerId = normalizeSpeakerId(state.currentSpeakerId || talkSpeakerSelect?.value || "unknown");
      const previousSpeakerLabel = speakerLabelById(speakerId);
      const input = window.prompt("Set speaker label", previousSpeakerLabel);
      if (input === null) return;
      const nextSpeakerLabel = String(input || "").trim();
      if (!nextSpeakerLabel) {
        showToast("Speaker label cannot be empty.", "error");
        return;
      }
      const changed = setSpeakerLabel(speakerId, nextSpeakerLabel);
      if (!changed) return;
      const ok = await emitEvent("speaker_label_edited", "user", "talk", `Speaker label set: ${nextSpeakerLabel}`, {
        speakerId,
        previousSpeakerLabel,
        newSpeakerLabel: nextSpeakerLabel,
        scope: "registry"
      });
      if (!ok) {
        showToast("Speaker label saved locally. Event emit failed.", "error");
        return;
      }
      showToast(`Speaker label updated: ${nextSpeakerLabel}.`, "ok");
    });
  }

  if (screenShareBtn) {
    screenShareBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await startScreenShare();
    });
  }

  if (cameraViewBtn) {
    cameraViewBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await startCameraView();
    });
  }

  if (screenStopBtn) {
    screenStopBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      stopScreenShare();
    });
  }

  if (cameraStopBtn) {
    cameraStopBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      stopCameraView();
    });
  }

  if (fallbackInput) {
    fallbackInput.addEventListener("keydown", async (e) => {
      if (e.key === "Escape") {
        await cancelFallbackComposer();
        return;
      }

      if (e.key === "Enter") {
        await submitFallbackComposer();
      }
    });
    fallbackInput.addEventListener("input", () => {
      const fromVoice = String(state.pendingVoiceDraft?.source || "").toLowerCase() === "voice";
      if (!fromVoice) return;
      const nextSuggestions = buildTranscriptSuggestions(fallbackInput.value);
      state.pendingVoiceDraftSuggestions = nextSuggestions;
      renderFallbackSuggestions(nextSuggestions);
    });
  }

  if (fallbackSendBtn) {
    fallbackSendBtn.addEventListener("click", () => {
      void submitFallbackComposer();
    });
  }

  if (fallbackRetryBtn) {
    fallbackRetryBtn.addEventListener("click", () => {
      void retryFallbackComposer();
    });
  }

  if (fallbackCancelBtn) {
    fallbackCancelBtn.addEventListener("click", () => {
      void cancelFallbackComposer();
    });
  }

  if (fallbackSuggestions) {
    fallbackSuggestions.addEventListener("click", (e) => {
      const chip = e.target?.closest?.(".fallback-suggestion-chip");
      if (!chip || !fallbackInput) return;
      const suggestion = String(chip.dataset.suggestion || "").trim();
      if (!suggestion) return;
      fallbackInput.value = suggestion;
      fallbackInput.focus();
    });
  }

  if (timelineRefreshBtn) {
    timelineRefreshBtn.addEventListener("click", () => {
      void refreshTimelineNow();
    });
  }

  if (timelinePauseBtn) {
    timelinePauseBtn.addEventListener("click", () => {
      setTimelinePollingPaused(true);
    });
  }

  if (timelineResumeBtn) {
    timelineResumeBtn.addEventListener("click", () => {
      setTimelinePollingPaused(false);
    });
  }

  if (timelineClearBtn) {
    timelineClearBtn.addEventListener("click", () => {
      clearTimelineView();
    });
  }

  if (timelineExportBtn) {
    timelineExportBtn.addEventListener("click", () => {
      void exportTimelineJson();
    });
  }

  if (timelineExportPackBtn) {
    timelineExportPackBtn.addEventListener("click", () => {
      void exportSessionPackJson();
    });
  }

  if (reviewModeBtn) {
    reviewModeBtn.addEventListener("click", () => {
      void setReviewMode(!state.reviewMode);
    });
  }

  if (timelineHighlightBtn) {
    timelineHighlightBtn.addEventListener("click", () => {
      void markTimelineHighlight();
    });
  }

  if (timelineReviewPrevBtn) {
    timelineReviewPrevBtn.addEventListener("click", () => {
      if (!state.reviewMode) return;
      void moveReviewFocus(-1);
    });
  }

  if (timelineReviewNextBtn) {
    timelineReviewNextBtn.addEventListener("click", () => {
      if (!state.reviewMode) return;
      void moveReviewFocus(1);
    });
  }

  if (timelineReviewLatestBtn) {
    timelineReviewLatestBtn.addEventListener("click", () => {
      if (!state.reviewMode) return;
      jumpReviewFocusToLatest();
    });
  }

  if (timelineReviewAutoplayBtn) {
    timelineReviewAutoplayBtn.addEventListener("click", () => {
      if (!state.reviewMode) return;
      setReviewAutoplay(!reviewPlaybackState.autoPlay);
    });
  }

  if (ttsToggleBtn) {
    ttsToggleBtn.addEventListener("click", () => {
      runtimeState.ttsDisabled = !runtimeState.ttsDisabled;
      if (!runtimeState.ttsDisabled) state.ttsServerWarningShown = false;
      updateTtsToggleUi();
      showToast(runtimeState.ttsDisabled ? "TTS disabled for this session." : "TTS enabled for this session.", "ok");
    });
  }

  if (ttsStopBtn) {
    ttsStopBtn.addEventListener("click", () => {
      void handleStopVoiceTap();
    });
  }

  if (timelineFilters) {
    timelineFilters.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".timeline-filter-btn");
      if (!btn) return;
      setTimelineFilter(String(btn.dataset.filter || "all"));
    });
  }

  if (timelineSpeakerFilter) {
    timelineSpeakerFilter.addEventListener("change", () => {
      setTimelineSpeakerFilter(timelineSpeakerFilter.value);
    });
  }

  if (talkSpeakerAnalyticsControls) {
    talkSpeakerAnalyticsControls.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".speaker-analytics-sort-btn");
      if (!btn) return;
      setSpeakerAnalyticsSort(String(btn.dataset.sort || "turns"));
    });
  }

  if (talkTimeline) {
    talkTimeline.addEventListener("click", (e) => {
      const editBtn = e.target?.closest?.(".timeline-speaker-edit");
      if (!editBtn) return;
      const turnId = normalizeTurnId(editBtn.dataset.turnId || "");
      if (!turnId) return;
      const currentSpeakerId = normalizeSpeakerId(editBtn.dataset.currentSpeakerId || "unknown");
      const optionsHint = SPEAKER_OPTIONS.map((opt) => `${opt.id}`).join(", ");
      const input = window.prompt(`Set speaker (${optionsHint})`, currentSpeakerId);
      if (input === null) return;
      const rawSpeakerId = String(input || "").trim().toLowerCase();
      if (!SPEAKER_OPTIONS.some((opt) => opt.id === rawSpeakerId)) {
        showToast("Invalid speaker id.", "error");
        return;
      }
      const nextSpeakerId = normalizeSpeakerId(rawSpeakerId);
      void relabelTurnSpeaker(turnId, nextSpeakerId, currentSpeakerId).then((ok) => {
        if (ok) showToast(`Speaker updated: ${speakerLabelById(nextSpeakerId)}.`, "ok");
        else showToast("Speaker update failed.", "error");
      });
    });
    talkTimeline.addEventListener("click", (e) => {
      if (!state.reviewMode) return;
      if (e.target?.closest?.(".timeline-speaker-edit")) return;
      const row = e.target?.closest?.(".timeline-event");
      const eventKey = String(row?.dataset?.eventKey || "").trim();
      if (!eventKey) return;
      setReviewFocusedEvent(eventKey, { scroll: false });
    });
  }

  if (talkChapters) {
    talkChapters.addEventListener("click", (e) => {
      const chapterBtn = e.target?.closest?.(".chapter-card");
      if (!chapterBtn) return;
      const chapterId = String(chapterBtn.dataset.chapterId || "");
      if (!chapterId) return;
      focusTimelineOnChapter(chapterId);
    });
  }

  if (chapterClearFocusBtn) {
    chapterClearFocusBtn.addEventListener("click", () => {
      clearTimelineChapterFocus();
    });
  }

  if (state.supportsTTS && "onvoiceschanged" in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (state.view !== "talk") return;
    if (state.fallbackOpen) return;
    const interruptible = state.talkState === "thinking" || state.talkState === "speaking";
    if (!interruptible) return;
    e.preventDefault();
    void interruptActiveAssistant("keyboard_interrupt", {
      resumeListening: true,
      resetListening: true
    });
  });

  window.addEventListener("resize", resizeOrbCanvas);
  window.addEventListener("resize", scheduleOfficeScale);
  window.addEventListener("beforeunload", () => {
    stopReviewAutoplayTimer();
    stopTimelinePolling();
    stopRuntimeHeartbeat();
    endSession();
  });
}

async function bootstrap() {
  bindEvents();

  // Determine initial view
  const initialFromPath = mcViewFromPath(window.location.pathname);
  if (initialFromPath) state.view = initialFromPath;

  // Set view first to apply chrome visibility
  applyWorkflowShellChrome();
  setView(state.view, { silent: true, replace: true });

  // Entry mode: minimal initialization
  if (state.view === "entry") {
    const entryIntent = document.getElementById("entry-intent");
    if (entryIntent) entryIntent.focus();
    return;
  }

  // Full initialization for non-entry views
  initOfficeSimulation();
  setSpeakerAnalyticsSort(speakerAnalyticsState.sortBy);
  renderSpeakerControlOptions();
  if (talkVoiceStyle) talkVoiceStyle.value = state.voiceStyle;
  setVoiceStyle(state.voiceStyle);
  setCurrentSpeakerId(state.currentSpeakerId, false);
  refreshVoices();
  updateSelectionUi();

  setTalkState("idle");
  setTalkAdvancedVisible(loadTalkAdvancedPref(), { persist: false });
  updateReviewModeUi();
  setOrbSubtitle("");
  setTranscriptExpanded(false);
  setVisionControlsVisible(false);
  setApiOnline(false);
  ensureTalkDemoSeeded();

  requestAnimationFrame(() => {
    resizeOrbCanvas();
    requestAnimationFrame(drawOrb);
  });
  await loadTalkSession();
  applyTimelineFilterUi();
  updateTimelineControlUi();
  updateTtsToggleUi();
  updateStopVoiceBtnUi();
  await refreshTimelineNow();
  renderChapters();
  renderSpeakerAnalytics();
  startTimelinePolling();
  await hydrateRuntimeStateFromLatestEvent();
  startRuntimeHeartbeat();

  renderDashboardThread([]);
  setActiveToken("Coach", "room-strategy");

  await initHealth();
}

bootstrap();
