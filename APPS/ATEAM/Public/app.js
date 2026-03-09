const ORIGIN = window.location.origin;
const API_BASE =
  window.ATEAM_API_BASE ||
  localStorage.getItem("ATEAM_API_BASE") ||
  (ORIGIN.includes("localhost:3000") || ORIGIN.includes("127.0.0.1:3000")
    ? ORIGIN
    : "http://localhost:3000");

const GLOBAL_TASK_ID = "global";
const GLOBAL_PODCAST_ID = "global_podcast";
const LOCAL_THREAD_KEY = `talk_thread_${GLOBAL_PODCAST_ID}`;

const TTS_CONFIG = {
  rate: 0.98,
  pitch: 0.95,
  volume: 1.0
};

const TAP_COOLDOWN_MS = 200;

const state = {
  view: localStorage.getItem("ATEAM_VIEW") || "dashboard",
  activeTaskId: "",
  activeTaskTitle: "",
  activeAgent: "Coach",
  currentThread: [],
  talkState: "idle",
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
  voiceStyle: localStorage.getItem("ATEAM_VOICE_STYLE") || "male_assistant",
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
  currentSpeakerId: localStorage.getItem("ATEAM_SPEAKER_ID") || "unknown",
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
const goTalkBtn = document.getElementById("go-talk");

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
const talkTranscriptWrap = document.getElementById("talk-transcript-wrap");
const talkTranscriptToggle = document.getElementById("talk-transcript-toggle");
const talkTranscript = document.getElementById("talk-transcript");
const talkTimelineWrap = document.getElementById("talk-timeline-wrap");
const talkTimeline = document.getElementById("talk-timeline");
const talkChapters = document.getElementById("talk-chapters");
const talkSpeakerAnalytics = document.getElementById("talk-speaker-analytics");
const talkSpeakerAnalyticsControls = document.getElementById("talk-speaker-analytics-controls");
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
const AGENT_STATUS_ORDER = ["Coach", "Strategist", "Builder", "Scout", "Think Tank", "Podcast"];
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
let timelinePollTimer = null;
let timelineFetchInFlight = false;
const reviewPlaybackState = {
  focusedEventKey: "",
  autoPlay: false,
  timer: null,
  intervalMs: 2000
};
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
  { id: "ai_podcast", label: "AI" }
];
const SPEAKER_REGISTRY_KEY = "ATEAM_SPEAKER_REGISTRY";

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

function clearSubtitleFadeTimer() {
  if (state.subtitleFadeTimer) {
    clearTimeout(state.subtitleFadeTimer);
    state.subtitleFadeTimer = null;
  }
}

function normalizedSpace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
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
        if (cfg.node.classList.contains("visible")) {
          cfg.node.classList.remove("visible");
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
  if (!talkHint) return;
  if (next === "idle") talkHint.textContent = state.reviewMode && !state.sessionActive ? "Review mode active. Disable review mode to talk." : "Tap to talk";
  if (next === "listening") talkHint.textContent = "Listening... tap orb to end session";
  if (next === "thinking") talkHint.textContent = "Thinking...";
  if (next === "speaking") talkHint.textContent = "Speaking...";
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

function setView(view) {
  view = String(view || "dashboard").toLowerCase();
  if (!["dashboard", "talk", "speech"].includes(view)) view = "dashboard";
  state.view = view;
  localStorage.setItem("ATEAM_VIEW", state.view);

  const dashboardOn = state.view === "dashboard";
  const talkOn = state.view === "talk";
  const speechOn = state.view === "speech";

  dashboardView.classList.toggle("hidden", !dashboardOn);
  dashboardConsole.classList.toggle("hidden", !dashboardOn);
  talkView.classList.toggle("hidden", !talkOn);
  const speechView = document.getElementById("speech-view");
  if (speechView) speechView.classList.toggle("hidden", !speechOn);

  goDashboardBtn.classList.toggle("active", dashboardOn);
  goTalkBtn.classList.toggle("active", talkOn);
  const goSpeechBtn = document.getElementById("go-speech");
  if (goSpeechBtn) goSpeechBtn.classList.toggle("active", speechOn);

  if (dashboardOn && state.sessionActive) {
    endSession();
  }

  if (talkOn) {
    loadTalkSession();
    scheduleTimelinePoll(0);
    requestAnimationFrame(() => {
      resizeOrbCanvas();
    });
  }

  if (speechOn) {
    initSpeechClarity();
  }
}

function updateSelectionUi() {
  if (chipTask) chipTask.textContent = `Task: ${state.activeTaskId || "none"}`;
  if (chipAgent) chipAgent.textContent = `Agent: ${state.activeAgent || "Coach"}`;
  if (talkTaskLabel) talkTaskLabel.textContent = `Session Thread: ${GLOBAL_PODCAST_ID}`;
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

  if (!thread || !thread.length) return;

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
}

function renderTalkTranscript(thread) {
  if (!talkTranscript) return;
  talkTranscript.innerHTML = "";

  if (!thread || !thread.length) {
    const empty = document.createElement("div");
    empty.className = "talk-empty";
    empty.textContent = "Tap the orb to start.";
    talkTranscript.appendChild(empty);
    return;
  }

  thread.forEach((msg) => {
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

    row.textContent = `${label}: ${msg.content || ""}`;
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

  const content = String(text || "");
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

async function loadThread(taskId) {
  try {
    const data = await apiRequest(`/task/thread/${encodeURIComponent(taskId)}`);
    setApiOnline(true);
    return Array.isArray(data.thread) ? data.thread : [];
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

    const summary = document.createElement("div");
    summary.className = "chapter-card-summary";
    summary.textContent = truncateTimelineSummary(chapter.summary || "", 120);

    card.appendChild(top);
    card.appendChild(summary);
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
  const data = await apiRequest(`/events/${encodeURIComponent(sid)}`);
  const events = Array.isArray(data?.events) ? data.events : [];
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
    const data = await apiRequest(`/events/${encodeURIComponent(GLOBAL_PODCAST_ID)}`);
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
    const data = await apiRequest(`/events/${encodeURIComponent(GLOBAL_PODCAST_ID)}`);
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
      console.error("tts_error", { style: state.voiceStyle, voice: selectedVoice?.name || "default" });
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
        console.error("[TTS Error]", {
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
      // If server TTS was attempted but failed, finalize silently (no browser fallback to prevent mic feedback loop)
      if (serverTtsAttempted && sessionId === state.speechSession) {
        finalizeTtsSession(sessionId, state.ttsResolve);
        if (state.ttsResolve === resolve) state.ttsResolve = null;
        // Restart recognition to listen for next user input
        if (state.sessionActive) {
          setTimeout(() => startRecognition(), 150);
        }
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
  const contextPack = buildTalkContextPack(text, { turnId, segmentId, speakerId });

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
  const text = String(dashboardInput?.value || "").trim();
  if (!text) return;

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
  } catch {
    setApiOnline(false);
    state.talkStreamEnabled = false;
  }
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

function bindEvents() {
  goDashboardBtn.addEventListener("click", () => setView("dashboard"));
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
  window.addEventListener("beforeunload", () => {
    stopReviewAutoplayTimer();
    stopTimelinePolling();
    stopRuntimeHeartbeat();
    endSession();
  });
}

async function bootstrap() {
  bindEvents();
  setSpeakerAnalyticsSort(speakerAnalyticsState.sortBy);
  renderSpeakerControlOptions();
  if (talkVoiceStyle) talkVoiceStyle.value = state.voiceStyle;
  setVoiceStyle(state.voiceStyle);
  setCurrentSpeakerId(state.currentSpeakerId, false);
  refreshVoices();
  updateSelectionUi();

  setTalkState("idle");
  updateReviewModeUi();
  setOrbSubtitle("");
  setTranscriptExpanded(false);
  setVisionControlsVisible(false);
  setApiOnline(false);

  setView(state.view);
  requestAnimationFrame(() => {
    resizeOrbCanvas();
    requestAnimationFrame(drawOrb);
  });
  await loadTalkSession();
  applyTimelineFilterUi();
  updateTimelineControlUi();
  updateTtsToggleUi();
  updateStopVoiceBtnUi();
  renderChapters();
  renderSpeakerAnalytics();
  await refreshTimelineNow();
  startTimelinePolling();
  await hydrateRuntimeStateFromLatestEvent();
  startRuntimeHeartbeat();

  renderDashboardThread([]);
  setActiveToken("Coach", "room-strategy");

  await initHealth();
}

bootstrap();
