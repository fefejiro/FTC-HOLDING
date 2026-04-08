"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "../../lib/analytics";
import { ATEAM_BRAND_LOGO_PATH } from "../../lib/ateamEmbed";
import { isAteamOperatorEnabled } from "../../lib/ateamOperator";
import OperatorOfficePanel, { type OfficePhase } from "../components/OperatorOfficePanel";
import {
  type WorkflowAgentRole,
  type WorkflowCatalog,
  type WorkflowIntake,
  type WorkflowCategoryValue,
  type WorkflowTemplate,
  type WorkflowRun,
} from "../../lib/ateamWorkflow";
import { getProjectCaseStudy } from "../../lib/content";
import {
  clearAteamDemoHandoff,
  saveAteamWorkflowHandoff,
  type AteamWorkflowHandoffPayload,
} from "../../lib/ateamHandoff";
import {
  getLocalWorkflowFallbackEventName,
  handleLocalWorkflowRequest,
  shouldUseLocalWorkflowFallback,
} from "../../lib/ateamWorkflowLocal";

// ── Types ─────────────────────────────────────────────────────────────────────

type BusyState = "idle" | "starting" | "processing" | "loading";
type AteamWorkflowClientProps = {
  basePath?: string;
  operatorOfficePath?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionAlternativeLike = {
  0?: SpeechRecognitionResultLike;
  isFinal?: boolean;
  length?: number;
};
type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionAlternativeLike>;
};
type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

// ── Constants ─────────────────────────────────────────────────────────────────

// Human-readable working stages shown during processing
const WORKING_STAGES = [
  { label: "Reading your idea", detail: "Capturing the signal, goals, and constraints." },
  { label: "Finding the right path", detail: "Matching the problem to the best execution lane." },
  { label: "Structuring the system", detail: "Building the first plan, flow, and proof points." },
  { label: "Preparing the handoff", detail: "Turning the work into a decision-ready next step." },
] as const;

const V1_STATE_STEPS = [
  "queued",
  "planning",
  "awaiting_approval",
  "executing",
  "generating_artifact",
  "completed",
] as const;

// Compact type labels (no verbose descriptions)
const COMPACT_TYPES = [
  { value: "auto", label: "Auto" },
  { value: "product-app", label: "App / Product" },
  { value: "website", label: "Website" },
  { value: "lead-automation", label: "Lead system" },
  { value: "ai-feature", label: "AI workflow" },
] as const;

const VOICE_AUTO_STOP_MS = 45000;
const VOICE_SILENCE_STOP_MS = 6500;
const VOICE_RESTART_DELAY_MS = 240;
const VOICE_MAX_RESTARTS = 2;
const LOCAL_DEMO_MESSAGE = "Demo mode active. Runs currently stay in this browser.";

const ateamProject = getProjectCaseStudy("ateam");

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyAnswers(run: WorkflowRun | null) {
  return (run?.questions || []).reduce<Record<string, string>>((acc, q) => {
    acc[q.id] = String(run?.answers?.[q.id] || "");
    return acc;
  }, {});
}

function buildInitialIntake(run: WorkflowRun | null): WorkflowIntake {
  const requestIntake = run?.request?.intake || {};
  return {
    goal: String(requestIntake.goal || run?.answers?.goal || run?.answers?.firstWin || ""),
    context: String(requestIntake.context || run?.answers?.context || run?.answers?.audience || ""),
    desiredOutput: String(requestIntake.desiredOutput || run?.answers?.desiredOutput || ""),
    constraints: String(requestIntake.constraints || run?.answers?.constraints || ""),
    nonGoals: String(requestIntake.nonGoals || run?.answers?.nonGoals || ""),
  };
}

function buildInitialPlanDraft(run: WorkflowRun | null) {
  return {
    summary: String(run?.plan?.summary || ""),
    proposedSteps: (run?.plan?.proposedSteps || []).map((step) => ({
      id: String(step.id || ""),
      title: String(step.title || ""),
      detail: String(step.detail || ""),
    })),
    expectedArtifact: {
      type: String(run?.plan?.expectedArtifact?.type || ""),
      title: String(run?.plan?.expectedArtifact?.title || ""),
      summary: String(run?.plan?.expectedArtifact?.summary || ""),
    },
    blockers: [...(run?.plan?.blockers || [])],
    editorNotes: String(run?.plan?.editable?.editorNotes || ""),
  };
}

function trimPlanDraft(planDraft: ReturnType<typeof buildInitialPlanDraft>, templateId = "") {
  return {
    summary: String(planDraft.summary || "").trim(),
    proposedSteps: planDraft.proposedSteps
      .map((step) => ({
        id: String(step.id || "").trim(),
        title: String(step.title || "").trim(),
        detail: String(step.detail || "").trim(),
      }))
      .filter((step) => step.title || step.detail),
    expectedArtifact: {
      type: String(planDraft.expectedArtifact.type || "").trim(),
      title: String(planDraft.expectedArtifact.title || "").trim(),
      summary: String(planDraft.expectedArtifact.summary || "").trim(),
    },
    blockers: planDraft.blockers.map((item) => String(item || "").trim()).filter(Boolean),
    editorNotes: String(planDraft.editorNotes || "").trim(),
    templateId,
  };
}

function buildAnswersPayload(run: WorkflowRun | null, intake: WorkflowIntake, answers: Record<string, string>) {
  const nextAnswers: Record<string, string> = {
    ...answers,
    goal: String(intake.goal || "").trim(),
    context: String(intake.context || "").trim(),
    desiredOutput: String(intake.desiredOutput || "").trim(),
    constraints: String(intake.constraints || "").trim(),
    nonGoals: String(intake.nonGoals || "").trim(),
  };
  if (!nextAnswers.firstWin && nextAnswers.goal) {
    nextAnswers.firstWin = nextAnswers.goal;
  }
  return Object.fromEntries(
    Object.entries(nextAnswers).filter(([, value]) => String(value || "").trim())
  ) as Record<string, string>;
}

function formatWorkflowStateLabel(state?: string | null) {
  const safe = String(state || "").trim().toLowerCase();
  if (!safe) return "Queued";
  return safe
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHandoffPayload(run: WorkflowRun | null): AteamWorkflowHandoffPayload | null {
  if (!run?.handoff || Number(run.handoff.version || 0) !== 2) return null;
  if (typeof run.handoff.runId !== "string" || !run.handoff.runId.trim()) return null;
  return run.handoff as AteamWorkflowHandoffPayload;
}

function processingIndexToHumanStage(idx: number): number {
  if (idx <= 0) return 0;
  if (idx === 1) return 1;
  if (idx <= 3) return 2;
  return 3;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(path, {
      method: init?.method || "GET",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      body: init?.body,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as T & {
      ok?: boolean;
      message?: string;
      details?: string;
      error?: string;
    };
    if (!response.ok || payload?.ok === false) {
      const message =
        payload?.message || payload?.details || payload?.error || "ATEAM workflow request failed.";
      if (shouldUseLocalWorkflowFallback(message, response.status)) {
        return handleLocalWorkflowRequest<T>(path, init);
      }
      throw new Error(message);
    }
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ATEAM workflow request failed.";
    if (shouldUseLocalWorkflowFallback(message, 0)) {
      return handleLocalWorkflowRequest<T>(path, init);
    }
    throw error;
  }
}

function buildWorkflowPath(basePath: string, runId?: string) {
  const normalizedBasePath = basePath === "/" ? "/" : basePath.replace(/\/$/, "");
  if (!runId) {
    return normalizedBasePath;
  }
  return `${normalizedBasePath}?run=${encodeURIComponent(runId)}`;
}

function mergeSpokenIdea(base: string, spoken: string) {
  const trimmedBase = base.trim();
  const trimmedSpoken = spoken.trim();
  if (!trimmedSpoken) return trimmedBase;
  if (!trimmedBase) return trimmedSpoken;
  const suffix = /[.?!]\s*$/.test(trimmedBase) ? " " : ". ";
  return `${trimmedBase}${suffix}${trimmedSpoken}`;
}

function appendTranscriptSegment(base: string, next: string) {
  const trimmedBase = base.trim();
  const trimmedNext = next.trim().replace(/\s+/g, " ");
  if (!trimmedNext) return trimmedBase;
  if (!trimmedBase) return trimmedNext;
  if (trimmedBase.toLowerCase().endsWith(trimmedNext.toLowerCase())) {
    return trimmedBase;
  }
  return `${trimmedBase} ${trimmedNext}`.replace(/\s+/g, " ").trim();
}

function isDemoNotice(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("demo mode active.");
}

function combineTranscript(finalText: string, interimText: string) {
  return `${finalText} ${interimText}`.replace(/\s+/g, " ").trim();
}

function getSpeechErrorMessage(error?: string) {
  switch (error) {
    case "audio-capture":
      return "ATEAM could not access your microphone. Check your device input and try again.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow mic permission in your browser and try again.";
    case "network":
      return "Voice capture hit a network issue. Try again or type the idea instead.";
    case "no-speech":
      return "No speech was detected. Try again and start speaking right away.";
    case "aborted":
      return "";
    default:
      return "Voice capture could not start cleanly. Try again or type the idea instead.";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AteamWorkflowClient({
  basePath = "/ateam",
  operatorOfficePath = "/ateam/operator/office",
}: AteamWorkflowClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);
  const hasTrackedViewRef = useRef(false);
  const trackedPackViewRef = useRef("");
  const ideaRef = useRef("");
  const speechBaseIdeaRef = useRef("");
  const speechTranscriptRef = useRef("");
  const speechFinalTranscriptRef = useRef("");
  const speechInterimTranscriptRef = useRef("");
  const speechHadErrorRef = useRef(false);
  const voiceAutoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSessionDeadlineRef = useRef(0);
  const voiceSessionActiveRef = useRef(false);
  const voiceStopReasonRef = useRef<"" | "manual" | "timeout" | "silence" | "error">("");
  const voiceRestartCountRef = useRef(0);
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<WorkflowCategoryValue>("auto");
  const [intake, setIntake] = useState<WorkflowIntake>({
    goal: "",
    context: "",
    desiredOutput: "",
    constraints: "",
    nonGoals: "",
  });
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [catalog, setCatalog] = useState<WorkflowCatalog>({ templates: [], agentRoles: [] });
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategory, setHistoryCategory] = useState("all");
  const [historyState, setHistoryState] = useState("all");
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState(buildInitialPlanDraft(null));
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [localFallbackEnabled, setLocalFallbackEnabled] = useState(false);
  const [processingStageIndex, setProcessingStageIndex] = useState(-1);
  const [activePrototypeFrameId, setActivePrototypeFrameId] = useState("");
  const [supportsVoice, setSupportsVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const runId = String(searchParams.get("run") || "").trim();
  const operatorEnabled = isAteamOperatorEnabled();

  useEffect(() => {
    ideaRef.current = idea;
  }, [idea]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackEvent("ateam_landing_view", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      base_path: basePath,
    });
  }, [basePath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eventName = getLocalWorkflowFallbackEventName();
    const handleFallback = () => {
      setLocalFallbackEnabled(true);
      setError("");
      setNotice("");
    };
    window.addEventListener(eventName, handleFallback as EventListener);
    return () => window.removeEventListener(eventName, handleFallback as EventListener);
  }, []);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const speechWindow = window as Window &
      typeof globalThis & {
        SpeechRecognition?: BrowserSpeechRecognitionCtor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
      };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    function clearVoiceTimers() {
      if (voiceAutoStopTimerRef.current) {
        clearTimeout(voiceAutoStopTimerRef.current);
        voiceAutoStopTimerRef.current = null;
      }
      if (voiceSilenceTimerRef.current) {
        clearTimeout(voiceSilenceTimerRef.current);
        voiceSilenceTimerRef.current = null;
      }
    }

    function scheduleAutoStop() {
      if (!voiceSessionActiveRef.current) return;
      const remaining = Math.max(800, voiceSessionDeadlineRef.current - Date.now());
      if (voiceAutoStopTimerRef.current) {
        clearTimeout(voiceAutoStopTimerRef.current);
      }
      voiceAutoStopTimerRef.current = setTimeout(() => {
        voiceStopReasonRef.current = "timeout";
        try {
          recognition.stop();
        } catch {
          voiceSessionActiveRef.current = false;
          setIsListening(false);
        }
      }, remaining);
    }

    function scheduleSilenceStop() {
      if (voiceSilenceTimerRef.current) {
        clearTimeout(voiceSilenceTimerRef.current);
      }
      voiceSilenceTimerRef.current = setTimeout(() => {
        voiceStopReasonRef.current = "silence";
        try {
          recognition.stop();
        } catch {
          voiceSessionActiveRef.current = false;
          setIsListening(false);
        }
      }, VOICE_SILENCE_STOP_MS);
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      speechHadErrorRef.current = false;
      setError("");
      if (!voiceSessionActiveRef.current) {
        voiceSessionActiveRef.current = true;
        voiceSessionDeadlineRef.current = Date.now() + VOICE_AUTO_STOP_MS;
        voiceRestartCountRef.current = 0;
      }
      setNotice("Recording... speak naturally, then click Stop recording when you're done.");
      setIsListening(true);
      clearVoiceTimers();
      scheduleAutoStop();
      scheduleSilenceStop();
    };
    recognition.onresult = (event) => {
      let nextFinal = speechFinalTranscriptRef.current;
      const interimParts: string[] = [];
      const startIndex = Math.max(0, Number(event.resultIndex || 0));
      for (let i = startIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = String(result[0]?.transcript || "").trim();
        if (!transcript) continue;
        if (result.isFinal) {
          nextFinal = appendTranscriptSegment(nextFinal, transcript);
        } else {
          interimParts.push(transcript);
        }
      }
      speechFinalTranscriptRef.current = nextFinal;
      speechInterimTranscriptRef.current = interimParts.join(" ").replace(/\s+/g, " ").trim();
      const spoken = combineTranscript(
        speechFinalTranscriptRef.current,
        speechInterimTranscriptRef.current
      );
      if (!spoken) return;
      speechTranscriptRef.current = spoken;
      setIdea(mergeSpokenIdea(speechBaseIdeaRef.current, spoken));
      voiceStopReasonRef.current = "";
      setNotice(
        speechInterimTranscriptRef.current
          ? "Listening... ATEAM is still transcribing. Natural pauses are okay."
          : "Listening... ATEAM is appending your request as you speak."
      );
      scheduleAutoStop();
      scheduleSilenceStop();
    };
    recognition.onend = () => {
      clearVoiceTimers();
      const stopReason = voiceStopReasonRef.current;
      const spoken = combineTranscript(
        speechFinalTranscriptRef.current,
        speechInterimTranscriptRef.current
      );
      const canRestart =
        voiceSessionActiveRef.current &&
        !speechHadErrorRef.current &&
        !stopReason &&
        Date.now() < voiceSessionDeadlineRef.current &&
        voiceRestartCountRef.current < VOICE_MAX_RESTARTS;
      if (canRestart) {
        voiceRestartCountRef.current += 1;
        setNotice("Listening paused briefly... reopening the mic.");
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            voiceSessionActiveRef.current = false;
            setIsListening(false);
            setNotice("Recording paused unexpectedly. Click Start recording to continue or type the request.");
          }
        }, VOICE_RESTART_DELAY_MS);
        return;
      }
      setIsListening(false);
      voiceSessionActiveRef.current = false;
      voiceSessionDeadlineRef.current = 0;
      voiceRestartCountRef.current = 0;
      if (speechHadErrorRef.current) {
        speechTranscriptRef.current = "";
        speechFinalTranscriptRef.current = "";
        speechInterimTranscriptRef.current = "";
        voiceStopReasonRef.current = "";
        return;
      }
      if (spoken) {
        const nextIdea = mergeSpokenIdea(speechBaseIdeaRef.current, spoken);
        setIdea(nextIdea);
        if (stopReason === "timeout") {
          setNotice("Recording reached the current capture limit. Review the text, then continue.");
        } else {
          setNotice("Voice captured. Review the text, then generate the scoped plan.");
        }
      } else {
        setNotice("No speech captured. Try again or type the idea instead.");
      }
      speechTranscriptRef.current = "";
      speechFinalTranscriptRef.current = "";
      speechInterimTranscriptRef.current = "";
      voiceStopReasonRef.current = "";
    };
    recognition.onerror = (event) => {
      clearVoiceTimers();
      if (event.error === "no-speech" && voiceSessionActiveRef.current) {
        speechHadErrorRef.current = false;
        setNotice("Recording is ready. Start speaking when you're ready.");
        return;
      }
      setIsListening(false);
      speechHadErrorRef.current = true;
      speechTranscriptRef.current = "";
      speechFinalTranscriptRef.current = "";
      speechInterimTranscriptRef.current = "";
      voiceSessionActiveRef.current = false;
      voiceSessionDeadlineRef.current = 0;
      voiceRestartCountRef.current = 0;
      voiceStopReasonRef.current = "error";
      const message = getSpeechErrorMessage(event.error);
      if (!message) return;
      if (event.error === "no-speech") {
        setNotice(message);
        return;
      }
      setNotice("");
      setError(message);
    };
    recognitionRef.current = recognition;
    setSupportsVoice(true);

    return () => {
      clearVoiceTimers();
      try { recognition.abort?.(); } catch { /* ignore */ }
      voiceSessionActiveRef.current = false;
      voiceSessionDeadlineRef.current = 0;
      voiceRestartCountRef.current = 0;
      voiceStopReasonRef.current = "";
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !isListening) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      try {
        recognitionRef.current?.abort?.();
      } catch {
        setIsListening(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isListening]);

  // Load run from URL
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setBusy("loading");
    requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
      `/api/ateam/workflow/runs/${encodeURIComponent(runId)}`
    )
      .then((payload) => {
        if (cancelled) return;
        setRun(payload.run);
        if (payload.catalog) setCatalog(payload.catalog);
        setIdea(payload.run.idea || "");
        setCategory((payload.run.category as WorkflowCategoryValue) || "auto");
        setIntake(buildInitialIntake(payload.run));
        setSelectedTemplateId(
          String(payload.run.plan?.editable?.templateId || payload.run.meta?.templateId || "")
        );
        setAnswers(buildEmptyAnswers(payload.run));
        setPlanDraft(buildInitialPlanDraft(payload.run));
        setActivePrototypeFrameId(payload.run.artifacts?.prototype?.frames?.[0]?.id || "");
        setBusy("idle");
      })
      .catch(() => { if (!cancelled) setBusy("idle"); });
    return () => { cancelled = true; };
  }, [runId]);

  useEffect(() => {
    if (!run) return;
    setIntake(buildInitialIntake(run));
    setSelectedTemplateId(String(run.plan?.editable?.templateId || run.meta?.templateId || ""));
    setAnswers(buildEmptyAnswers(run));
    setPlanDraft(buildInitialPlanDraft(run));
    setIsEditingPlan(false);
  }, [run?.id]);

  useEffect(() => {
    let cancelled = false;
    requestJson<{ ok: true; runs: WorkflowRun[]; catalog?: WorkflowCatalog }>("/api/ateam/workflow/runs?limit=12")
      .then((payload) => {
        if (!cancelled) {
          setRecentRuns(Array.isArray(payload.runs) ? payload.runs : []);
          if (payload.catalog) setCatalog(payload.catalog);
        }
      })
      .catch(() => {
        if (!cancelled) setRecentRuns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [run?.id]);

  useEffect(() => {
    const firstFrame = run?.artifacts?.prototype?.frames?.[0]?.id || "";
    if (!firstFrame) { setActivePrototypeFrameId(""); return; }
    setActivePrototypeFrameId((current) => current || firstFrame);
  }, [run?.artifacts?.prototype?.frames]);

  // Scroll to output when ready
  useEffect(() => {
    const handoff = toHandoffPayload(run);
    if (!handoff || !outputRef.current) return;
    outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [run?.id, run?.phase]);

  useEffect(() => {
    const handoff = toHandoffPayload(run);
    const packApproved = String(run?.approvals?.pack?.status || "").toLowerCase() === "approved";
    const ready = Boolean(handoff && (packApproved || run?.phase === "handoff"));
    if (!ready || !handoff || !run?.id) return;
    if (trackedPackViewRef.current === run.id) return;
    trackedPackViewRef.current = run.id;
    trackEvent("ateam_pack_view", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      run_id: run.id,
      recommended_lane: handoff.recommendedLane,
      category: handoff.categoryValue,
    });
  }, [basePath, run]);

  // Derived state
  const handoff = toHandoffPayload(run);
  const packApproved = String(run?.approvals?.pack?.status || "").toLowerCase() === "approved";
  const workflowReady = Boolean(handoff && (packApproved || run?.phase === "handoff"));
  const activePrototypeFrame =
    run?.artifacts?.prototype?.frames?.find((f) => f.id === activePrototypeFrameId) ||
    run?.artifacts?.prototype?.frames?.[0] ||
    null;
  const nextSteps = (handoff?.nextSteps || run?.artifacts?.nextSteps || []).slice(0, 4);
  const humanStage = processingIndexToHumanStage(processingStageIndex);
  const isWorking = busy === "starting" || busy === "processing";
  const showPlanReview = Boolean(run && !workflowReady && !isWorking);
  const showBarActions = Boolean(run || operatorEnabled);
  const currentState = String(run?.state || "").trim().toLowerCase() || "queued";
  const currentStateIndex = Math.max(0, V1_STATE_STEPS.findIndex((step) => step === currentState));
  const filteredRecentRuns = useMemo(() => {
    return recentRuns.filter((recentRun) => {
      const matchesSearch = !historySearch || `${recentRun.title || ""} ${recentRun.idea || ""} ${recentRun.plan?.summary || ""}`
        .toLowerCase()
        .includes(historySearch.toLowerCase());
      const matchesCategory = historyCategory === "all" || recentRun.category === historyCategory;
      const matchesState = historyState === "all" || String(recentRun.state || "").toLowerCase() === historyState;
      return matchesSearch && matchesCategory && matchesState;
    });
  }, [historyCategory, historySearch, historyState, recentRuns]);

  const officePhase: OfficePhase = workflowReady
    ? "done"
    : !isWorking
    ? "idle"
    : processingStageIndex <= 1
    ? "routing"
    : processingStageIndex <= 3
    ? "building"
    : "packaging";

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function syncRun(nextRun: WorkflowRun) {
    setRun(nextRun);
    setIdea(nextRun.idea || "");
    setCategory((nextRun.category as WorkflowCategoryValue) || "auto");
    setIntake(buildInitialIntake(nextRun));
    setSelectedTemplateId(String(nextRun.plan?.editable?.templateId || nextRun.meta?.templateId || ""));
    setAnswers(buildEmptyAnswers(nextRun));
    setPlanDraft(buildInitialPlanDraft(nextRun));
    setIsEditingPlan(false);
    if (nextRun.id && nextRun.id !== runId) {
      router.replace(buildWorkflowPath(basePath, nextRun.id));
    }
  }

  function resetFlow() {
    if (run?.id || idea.trim()) {
      trackEvent("ateam_reset", {
        location: basePath === "/" ? "homepage" : "ateam_page",
        had_run: Boolean(run?.id),
        had_idea: Boolean(idea.trim()),
      });
    }
    setRun(null);
    setAnswers({});
    setError("");
    setNotice("");
    setBusy("idle");
    setProcessingStageIndex(-1);
    setActivePrototypeFrameId("");
    setIdea("");
    setCategory("auto");
    setSelectedTemplateId("");
    setIntake({
      goal: "",
      context: "",
      desiredOutput: "",
      constraints: "",
      nonGoals: "",
    });
    setPlanDraft(buildInitialPlanDraft(null));
    setIsEditingPlan(false);
    clearAteamDemoHandoff();
    router.replace(buildWorkflowPath(basePath));
  }

  function toggleVoice() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      if (isListening) {
        voiceStopReasonRef.current = "manual";
        recognition.stop();
        return;
      }
      setError("");
      setNotice("");
      speechBaseIdeaRef.current = ideaRef.current;
      speechTranscriptRef.current = "";
      speechFinalTranscriptRef.current = "";
      speechInterimTranscriptRef.current = "";
      speechHadErrorRef.current = false;
      voiceSessionActiveRef.current = true;
      voiceSessionDeadlineRef.current = Date.now() + VOICE_AUTO_STOP_MS;
      voiceRestartCountRef.current = 0;
      voiceStopReasonRef.current = "";
      recognition.start();
    } catch {
      voiceSessionActiveRef.current = false;
      voiceSessionDeadlineRef.current = 0;
      voiceRestartCountRef.current = 0;
      voiceStopReasonRef.current = "error";
      setIsListening(false);
      setError("Voice capture could not start. Check microphone permission and try again.");
    }
  }

  function handleApplyTemplate(template: WorkflowTemplate) {
    setSelectedTemplateId(template.id);
    setCategory((template.category as WorkflowCategoryValue) || "auto");
    setIntake((prev) => ({
      goal: String(prev.goal || template.intake.goal || ""),
      context: String(prev.context || template.intake.context || ""),
      desiredOutput: String(prev.desiredOutput || template.intake.desiredOutput || ""),
      constraints: String(prev.constraints || template.intake.constraints || ""),
      nonGoals: String(prev.nonGoals || template.intake.nonGoals || ""),
    }));
    if (!idea.trim()) {
      setIdea(template.exampleIdea);
    }
    setNotice(`Template applied: ${template.label}. Adjust anything before starting the run.`);
  }

  async function handleStartRun() {
    setError("");
    setNotice("");
    if (isListening) {
      voiceStopReasonRef.current = "manual";
      try {
        recognitionRef.current?.stop();
      } catch {
        setIsListening(false);
      }
    }
    if (idea.trim().length < 12) {
      setError("Add a bit more detail - one sentence is enough to start.");
      trackEvent("ateam_run_start_error", {
        reason: "idea_too_short",
        location: basePath === "/" ? "homepage" : "ateam_page",
        category,
      });
      return;
    }
    trackEvent("ateam_run_start", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      category,
      idea_length: idea.trim().length,
    });
    setBusy("starting");
    setProcessingStageIndex(0);
    try {
      await wait(180);
      const payload = await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
        "/api/ateam/workflow/runs",
        {
          method: "POST",
          body: JSON.stringify({
            idea,
            category: category === "auto" ? "" : category,
            templateId: selectedTemplateId,
            intake,
          }),
        }
      );
      if (payload.catalog) setCatalog(payload.catalog);
      trackEvent("ateam_run_started", {
        location: basePath === "/" ? "homepage" : "ateam_page",
        run_id: payload.run.id,
        category: payload.run.category || category,
        question_count: payload.run.questions?.length || 0,
      });
      setProcessingStageIndex(1);
      await wait(180);
      await syncRun(payload.run);
    } catch (err) {
      trackEvent("ateam_run_start_error", {
        reason: err instanceof Error ? err.message : "request_failed",
        location: basePath === "/" ? "homepage" : "ateam_page",
        category,
      });
      setError(err instanceof Error ? err.message : "ATEAM could not start the run.");
    } finally {
      setBusy("idle");
      setProcessingStageIndex(-1);
    }
  }

  async function handlePlanDecision(decision: "approved" | "rejected" | "regenerate") {
    if (!run) return;
    const answerPayload = buildAnswersPayload(run, intake, answers);
    const planPayload = trimPlanDraft(planDraft, selectedTemplateId);
    const goalValue = String(intake.goal || answerPayload.firstWin || "").trim();
    if (decision === "approved" && goalValue.length < 8) {
      setError("Add the primary goal before approving the plan.");
      return;
    }

    setError("");
    trackEvent("ateam_plan_decision_start", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      run_id: run.id,
      decision,
      question_count: run.questions?.length || 0,
    });
    setBusy("processing");
    try {
      setProcessingStageIndex(1);
      const captured = await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: answerPayload,
            intake,
            plan: planPayload,
            templateId: selectedTemplateId,
          }),
        }
      );
      if (captured.catalog) setCatalog(captured.catalog);
      await syncRun(captured.run);

      if (decision === "regenerate") {
        setProcessingStageIndex(2);
        await wait(180);
        const regenerated = await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
          `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
          { method: "POST", body: JSON.stringify({ gate: "brief", decision: "regenerate" }) }
        );
        if (regenerated.catalog) setCatalog(regenerated.catalog);
        trackEvent("ateam_plan_regenerated", {
          location: basePath === "/" ? "homepage" : "ateam_page",
          run_id: regenerated.run.id,
        });
        await syncRun(regenerated.run);
        setNotice("ATEAM refreshed the plan with your latest guidance.");
        return;
      }

      if (decision === "rejected") {
        const rejected = await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
          `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
          { method: "POST", body: JSON.stringify({ gate: "brief", decision: "rejected" }) }
        );
        if (rejected.catalog) setCatalog(rejected.catalog);
        trackEvent("ateam_plan_rejected", {
          location: basePath === "/" ? "homepage" : "ateam_page",
          run_id: rejected.run.id,
        });
        await syncRun(rejected.run);
        setNotice("ATEAM marked the run as rejected. Start a new idea or adjust the intake and regenerate.");
        return;
      }

      setProcessingStageIndex(2);
      await wait(180);
      await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        { method: "POST", body: JSON.stringify({ gate: "brief", decision: "approved" }) }
      );
      setProcessingStageIndex(3);
      await wait(220);
      await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/generate-pack`,
        { method: "POST", body: JSON.stringify({}) }
      );
      setProcessingStageIndex(4);
      await wait(220);
      const result = await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        { method: "POST", body: JSON.stringify({ gate: "pack", decision: "approved" }) }
      );
      if (result.catalog) setCatalog(result.catalog);
      trackEvent("ateam_pack_ready", {
        location: basePath === "/" ? "homepage" : "ateam_page",
        run_id: result.run.id,
        recommended_lane: result.run.recommendedLane || "",
        next_steps_count: result.run.artifacts?.nextSteps?.length || 0,
      });
      await syncRun(result.run);
    } catch (err) {
      trackEvent("ateam_plan_decision_error", {
        reason: err instanceof Error ? err.message : "request_failed",
        location: basePath === "/" ? "homepage" : "ateam_page",
        run_id: run.id,
        decision,
      });
      setError(err instanceof Error ? err.message : "ATEAM could not continue this run right now.");
    } finally {
      setBusy("idle");
      setProcessingStageIndex(-1);
    }
  }

  async function handleSavePlanEdits() {
    if (!run) return;
    setError("");
    setNotice("");
    setBusy("processing");
    try {
      const payload = await requestJson<{ ok: true; run: WorkflowRun; catalog?: WorkflowCatalog }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: buildAnswersPayload(run, intake, answers),
            intake,
            plan: trimPlanDraft(planDraft, selectedTemplateId),
            templateId: selectedTemplateId,
          }),
        }
      );
      if (payload.catalog) setCatalog(payload.catalog);
      await syncRun(payload.run);
      setNotice("ATEAM saved your plan edits and refreshed the review view.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ATEAM could not save the plan edits.");
    } finally {
      setBusy("idle");
    }
  }

  function handleDownloadBundle() {
    if (!run) return;
    const payload = {
      request: run.request || null,
      plan: run.plan || null,
      evaluation: run.evaluation || null,
      brief: run.brief || null,
      artifacts: run.artifacts || null,
      handoff: run.handoff || null,
      recentArtifact: run.recentArtifact || null,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${run.id || "ateam-run"}-decision-pack.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    trackEvent("ateam_artifact_download", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      run_id: run.id,
      artifact_type: run.recentArtifact?.type || "decision_pack",
    });
  }

  function handleContinueWithUnaLabs() {
    if (!handoff) { setError("The output bundle isn't ready yet."); return; }
    clearAteamDemoHandoff();
    saveAteamWorkflowHandoff(handoff);
    trackEvent("ateam_continue_to_intake", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      run_id: handoff.runId,
      recommended_lane: handoff.recommendedLane,
      category: handoff.categoryValue,
    });
    router.push("/work-with-ftc?from=ateam");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="wf-shell">

      {/* ── Top bar ── */}
      <header className="wf-bar">
        <div className="wf-bar-brand">
          <Image src={ATEAM_BRAND_LOGO_PATH} alt="ATEAM" width={28} height={28} className="wf-bar-logo" />
          <span className="wf-bar-name">ATEAM</span>
          <span className="wf-bar-sep">-</span>
          <span className="wf-bar-sub">Una Labs</span>
        </div>
        {showBarActions ? (
          <div className="wf-bar-right">
            {run ? (
              <button className="wf-reset-btn" onClick={resetFlow} aria-label="Start a new idea">
                New idea
              </button>
            ) : null}
            {operatorEnabled ? (
              <Link href={operatorOfficePath} prefetch={false} className="wf-op-link">
                Operator {"->"}
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="wf-split">
        <div className="wf-intake-col">
        <div className="container">
        <div className="wf-body">
          {localFallbackEnabled ? (
            <p className="wf-notice wf-fallback-banner" role="status">
              {LOCAL_DEMO_MESSAGE}
            </p>
          ) : null}

          {/* ── INTAKE STAGE ── */}
          {!run && !isWorking && !workflowReady && (
            <section className={`wf-stage wf-stage--intake ${basePath === "/" ? "wf-stage--hp" : ""}`}>

              {basePath === "/" ? (
                /* ── HOMEPAGE MODE: minimal single-input hero ── */
                <div className="wf-hp-hero">
                  <p className="wf-hp-eyebrow">Una Labs · AI workflow</p>
                  <h1 className="wf-hp-headline">Type your idea.</h1>
                  <p className="wf-hp-sub">ATEAM turns it into a scoped plan, visible workflow, and decision-ready output.</p>

                  <div className="wf-hp-input-wrap">
                    <textarea
                      id="wf-idea"
                      className="wf-hp-textarea"
                      rows={3}
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Describe what you need to build, fix, or figure out…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleStartRun();
                        }
                      }}
                      autoFocus
                    />
                    <div className="wf-hp-input-foot">
                      {supportsVoice && (
                        <button
                          type="button"
                          className={`wf-hp-voice-btn ${isListening ? "wf-hp-voice-btn--active" : ""}`}
                          onClick={toggleVoice}
                          aria-label={isListening ? "Stop recording" : "Record idea"}
                          aria-pressed={isListening}
                        >
                          <span className="wf-voice-indicator-dot" aria-hidden="true" />
                          {isListening ? "Stop" : "Record"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="wf-hp-send-btn"
                        onClick={handleStartRun}
                        disabled={busy !== "idle"}
                        aria-label="Submit idea"
                      >
                        {busy !== "idle" ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {error && <p className="wf-error wf-hp-error" role="alert">{error}</p>}

                  {catalog.templates.length > 0 && (
                    <div className="wf-hp-templates" role="list" aria-label="Quick start templates">
                      {catalog.templates.slice(0, 4).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          role="listitem"
                          className="wf-hp-template-chip"
                          onClick={() => handleApplyTemplate(template)}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── /ATEAM PAGE MODE: full intake form ── */
                <>
                  <div className="wf-intro">
                    <p className="wf-intro-eyebrow">Trusted AI workflow infrastructure</p>
                    <h1 className="wf-intro-headline">
                      Start with the request.
                      <br />
                      Move only the approved next step.
                    </h1>
                    <p className="wf-intro-lead">
                      ATEAM is the workflow surface inside Una Labs: describe the request, review the
                      scoped plan, approve what should move forward, and leave with a decision-ready
                      output before delivery starts.
                    </p>
                  </div>

                  <div className="wf-proof-strip" aria-label="How ATEAM moves work forward">
                    <div className="wf-proof-step">
                      <span className="wf-proof-step-label">Structured intake</span>
                      <p>Capture the request, context, constraints, and non-goals without losing the signal.</p>
                    </div>
                    <div className="wf-proof-step">
                      <span className="wf-proof-step-label">Scoped plan</span>
                      <p>ATEAM turns the request into a visible first-pass plan, expected artifact, and likely blockers.</p>
                    </div>
                    <div className="wf-proof-step">
                      <span className="wf-proof-step-label">Human approval</span>
                      <p>Review assumptions, tune the plan, and approve before artifact generation or delivery steps.</p>
                    </div>
                    <div className="wf-proof-step">
                      <span className="wf-proof-step-label">Decision-ready output</span>
                      <p>Get a scoped pack, implementation direction, and a clear next move into Una Labs delivery.</p>
                    </div>
                  </div>

                  {catalog.templates.length > 0 && (
                    <div className="wf-template-card">
                      <div className="wf-template-head">
                        <div>
                          <p className="wf-pack-panel-kicker">Workflow templates</p>
                          <h2 className="wf-recent-title">Start from a stronger request pattern</h2>
                        </div>
                        <span className="wf-recent-count">{catalog.templates.length} curated</span>
                      </div>
                      <div className="wf-template-grid">
                        {catalog.templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className={`wf-template-item ${selectedTemplateId === template.id ? "wf-template-item--active" : ""}`}
                            onClick={() => handleApplyTemplate(template)}
                          >
                            <strong>{template.label}</strong>
                            <p>{template.summary}</p>
                            <span>{template.recommendedFor.join(" · ")}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="wf-intake-card">
                    <div className="wf-intake-label-row">
                      <div className="wf-intake-label-copy">
                        <label className="wf-field-label" htmlFor="wf-idea">Describe the request</label>
                        {supportsVoice ? (
                          <p className="wf-field-help wf-field-help--voice">
                            Type is the safest path today. Voice capture supports click-to-start, click-to-stop
                            dictation with longer pauses than before.
                          </p>
                        ) : null}
                      </div>
                      {supportsVoice && (
                        <button
                          type="button"
                          className={`wf-voice-btn ${isListening ? "wf-voice-btn--active" : ""}`}
                          onClick={toggleVoice}
                          aria-label={isListening ? "Stop voice capture" : "Start voice capture"}
                          aria-pressed={isListening}
                        >
                          <span className="wf-voice-indicator" aria-hidden="true">
                            <span className="wf-voice-indicator-dot" />
                          </span>
                          <span className="wf-voice-copy">
                            <strong>{isListening ? "Stop recording" : "Start recording"}</strong>
                            <span>{isListening ? "Click to stop and keep this draft" : "Click to begin voice capture"}</span>
                          </span>
                        </button>
                      )}
                    </div>

                    <textarea
                      id="wf-idea"
                      className="wf-idea-textarea"
                      rows={6}
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Example: We need a WhatsApp-first order flow that captures requests, routes them to staff, and shows live status without manual follow-up."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStartRun();
                      }}
                    />

                    <div className="wf-guided-grid" aria-label="Guided intake details">
                      <div className="wf-guided-field wf-guided-field--wide">
                        <label className="wf-field-label" htmlFor="wf-goal">Primary goal</label>
                        <input
                          id="wf-goal"
                          className="wf-guided-input"
                          type="text"
                          value={intake.goal || ""}
                          onChange={(e) => setIntake((prev) => ({ ...prev, goal: e.target.value }))}
                          placeholder="What should improve first?"
                        />
                      </div>
                      <div className="wf-guided-field wf-guided-field--wide">
                        <label className="wf-field-label" htmlFor="wf-output">Desired output</label>
                        <input
                          id="wf-output"
                          className="wf-guided-input"
                          type="text"
                          value={intake.desiredOutput || ""}
                          onChange={(e) => setIntake((prev) => ({ ...prev, desiredOutput: e.target.value }))}
                          placeholder="Spec, plan, prototype, or research summary"
                        />
                      </div>
                      <div className="wf-guided-field wf-guided-field--full">
                        <label className="wf-field-label" htmlFor="wf-context">Relevant context</label>
                        <textarea
                          id="wf-context"
                          className="wf-question-textarea"
                          rows={3}
                          value={intake.context || ""}
                          onChange={(e) => setIntake((prev) => ({ ...prev, context: e.target.value }))}
                          placeholder="Who this is for, what already exists, and what ATEAM should keep in view."
                        />
                      </div>
                      <div className="wf-guided-field">
                        <label className="wf-field-label" htmlFor="wf-constraints">Constraints</label>
                        <textarea
                          id="wf-constraints"
                          className="wf-question-textarea"
                          rows={3}
                          value={intake.constraints || ""}
                          onChange={(e) => setIntake((prev) => ({ ...prev, constraints: e.target.value }))}
                          placeholder="Timeline, budget, tools, team, compliance, or delivery constraints."
                        />
                      </div>
                      <div className="wf-guided-field">
                        <label className="wf-field-label" htmlFor="wf-nongoals">Non-goals</label>
                        <textarea
                          id="wf-nongoals"
                          className="wf-question-textarea"
                          rows={3}
                          value={intake.nonGoals || ""}
                          onChange={(e) => setIntake((prev) => ({ ...prev, nonGoals: e.target.value }))}
                          placeholder="What should not be included in the first pass?"
                        />
                      </div>
                    </div>

                    {/* Compact type selector */}
                    <div className="wf-type-row" role="group" aria-label="What type of idea is this?">
                      {COMPACT_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          className={`wf-type-chip ${category === t.value ? "wf-type-chip--active" : ""}`}
                          onClick={() => setCategory(t.value as WorkflowCategoryValue)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {error && <p className="wf-error" role="alert">{error}</p>}
                    {!error && notice && !localFallbackEnabled && !isDemoNotice(notice) && (
                      <p className="wf-notice" aria-live="polite">
                        {notice}
                      </p>
                    )}

                    <div className="wf-intake-actions">
                      <button
                        type="button"
                        className="wf-btn-primary"
                        onClick={handleStartRun}
                        disabled={busy !== "idle"}
                      >
                        {busy !== "idle" ? "Starting..." : "Generate the scoped plan ->"}
                      </button>
                      <p className="wf-intake-hint">
                        Intake comes first. ATEAM only moves what you approve into the next step.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* What you'll get — only on /ateam page */}
              {basePath !== "/" && (
              <div className="wf-expect-row" aria-label="What ATEAM produces">
                {[
                  { icon: "O", label: "Structured intake", detail: "Goal, context, constraints, and non-goals captured in one request." },
                  { icon: "[]", label: "Scoped plan", detail: "Visible steps, expected artifact, and likely blockers before execution." },
                  { icon: "+", label: "Approval gate", detail: "A human review point before work is packaged into output." },
                  { icon: "->", label: "Decision-ready output", detail: "A pack Una Labs can review, refine, and move into delivery." },
                ].map((item) => (
                  <div key={item.label} className="wf-expect-item">
                    <span className="wf-expect-icon" aria-hidden="true">{item.icon}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {recentRuns.length > 0 && (
                <div className="wf-recent-card">
                  <div className="wf-recent-head">
                    <div>
                      <p className="wf-pack-panel-kicker">Recent runs</p>
                      <h2 className="wf-recent-title">Resume a recent workflow</h2>
                    </div>
                    <span className="wf-recent-count">{recentRuns.length} visible</span>
                  </div>
                  <div className="wf-history-filters">
                    <input
                      className="wf-guided-input"
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search titles, ideas, or plan summaries"
                    />
                    <select
                      className="wf-guided-input"
                      value={historyCategory}
                      onChange={(e) => setHistoryCategory(e.target.value)}
                    >
                      <option value="all">All categories</option>
                      {Array.from(new Set(recentRuns.map((item) => item.category).filter(Boolean))).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                    <select
                      className="wf-guided-input"
                      value={historyState}
                      onChange={(e) => setHistoryState(e.target.value)}
                    >
                      <option value="all">All states</option>
                      {Array.from(new Set(recentRuns.map((item) => String(item.state || "").toLowerCase()).filter(Boolean))).map((value) => (
                        <option key={value} value={value}>{formatWorkflowStateLabel(value)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="wf-recent-list">
                    {filteredRecentRuns.map((recentRun) => (
                      <Link
                        key={recentRun.id}
                        href={buildWorkflowPath(basePath, recentRun.id)}
                        prefetch={false}
                        className="wf-recent-link"
                      >
                        <div>
                          <strong>{recentRun.brief?.title || recentRun.title || "ATEAM run"}</strong>
                          <p>{recentRun.plan?.summary || recentRun.brief?.summary || recentRun.idea}</p>
                        </div>
                        <span>{formatWorkflowStateLabel(recentRun.state || recentRun.phase)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </section>
          )}

          {/* ── WORKING ANIMATION ── */}
          {isWorking && (
            <section className="wf-stage wf-stage--working" aria-live="polite" aria-label="ATEAM is working">
              {idea && (
                <div className="wf-idea-echo">
                  <span className="wf-idea-echo-label">Your idea</span>
                  <p className="wf-idea-echo-text">
                    &ldquo;{idea.length > 140 ? `${idea.slice(0, 140)}\u2026` : idea}&rdquo;
                  </p>
                </div>
              )}
              <div className="wf-working-track">
                {WORKING_STAGES.map((stage, i) => {
                  const isActive = humanStage === i;
                  const isDone = humanStage > i;
                  return (
                    <div
                      key={stage.label}
                      className={`wf-wnode ${isActive ? "wf-wnode--active" : ""} ${isDone ? "wf-wnode--done" : ""}`}
                    >
                      <div className="wf-wnode-indicator" aria-hidden="true">
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        ) : isActive ? (
                          <div className="wf-wnode-spinner" />
                        ) : (
                          <div className="wf-wnode-idle-dot" />
                        )}
                      </div>
                      <div className="wf-wnode-body">
                        <strong className="wf-wnode-label">{stage.label}</strong>
                        <span className="wf-wnode-detail">{stage.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── CLARIFIER QUESTIONS ── */}
          {showPlanReview && run && (
            <section className="wf-stage wf-stage--clarify">
              {idea && (
                <div className="wf-idea-echo">
                  <span className="wf-idea-echo-label">Your idea</span>
                  <p className="wf-idea-echo-text">
                    &ldquo;{idea.length > 140 ? `${idea.slice(0, 140)}\u2026` : idea}&rdquo;
                  </p>
                </div>
              )}

              <div className="wf-clarify-head">
                <h2 className="wf-clarify-headline">Review the plan before ATEAM executes</h2>
                <p className="wf-clarify-sub">
                  Confirm what ATEAM understood, tighten the scope if needed, and approve before
                  the output is generated.
                </p>
              </div>

              <div className="wf-state-progress" aria-label="Workflow state progress">
                {V1_STATE_STEPS.map((step, index) => {
                  const isDone = currentStateIndex > index;
                  const isActive = currentStateIndex === index;
                  return (
                    <div
                      key={step}
                      className={`wf-state-pill ${isDone ? "wf-state-pill--done" : ""} ${isActive ? "wf-state-pill--active" : ""}`}
                    >
                      {formatWorkflowStateLabel(step)}
                    </div>
                  );
                })}
              </div>

              <div className="wf-plan-layout">
                <div className="wf-plan-card">
                  <p className="wf-pack-panel-kicker">What ATEAM understood</p>
                  <h3 className="wf-pack-panel-title">
                    {run.request?.normalized?.goal || run.brief?.primaryGoal || "ATEAM has a first goal in view"}
                  </h3>
                  <p className="wf-pack-panel-body">
                    {run.publicFlow?.understanding?.summary || run.brief?.summary || run.plan?.summary}
                  </p>

                  <div className="wf-pack-meta">
                    {[
                      { label: "State", value: formatWorkflowStateLabel(run.state || run.phase) },
                      { label: "Lane", value: run.request?.routing?.recommendedLane || run.brief?.recommendedLane || run.recommendedLane },
                      { label: "Artifact", value: run.plan?.expectedArtifact?.title || run.request?.normalized?.desiredArtifactType },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label} className="wf-pack-meta-cell">
                          <span className="wf-pack-meta-label">{item.label}</span>
                          <strong className="wf-pack-meta-value">{item.value}</strong>
                        </div>
                      ))}
                  </div>

                  {(run.request?.assumptions || run.plan?.assumptions || []).length > 0 && (
                    <div className="wf-plan-list-card">
                      <p className="wf-pack-panel-kicker">Assumptions</p>
                      <ul className="wf-plan-list">
                        {(run.plan?.assumptions || run.request?.assumptions || []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="wf-plan-card">
                  <p className="wf-pack-panel-kicker">Visible plan</p>
                  <h3 className="wf-pack-panel-title">{run.plan?.expectedArtifact?.title || "Decision-ready output"}</h3>
                  <p className="wf-pack-panel-body">{run.plan?.summary || "ATEAM is preparing a scoped first-pass plan."}</p>

                  {(run.plan?.proposedSteps || []).length > 0 && (
                    <ol className="wf-plan-steps">
                      {run.plan?.proposedSteps.map((step) => (
                        <li key={step.id} className="wf-plan-step">
                          <strong>{step.title}</strong>
                          <p>{step.detail}</p>
                        </li>
                      ))}
                    </ol>
                  )}

                  {(run.plan?.blockers || []).length > 0 && (
                    <div className="wf-plan-list-card">
                      <p className="wf-pack-panel-kicker">Likely blockers</p>
                      <ul className="wf-plan-list">
                        {(run.plan?.blockers || []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {catalog.agentRoles.length > 0 && (
                <div className="wf-role-card">
                  <div className="wf-template-head">
                    <div>
                      <p className="wf-pack-panel-kicker">Role-aware execution</p>
                      <h2 className="wf-recent-title">Workflow stage library</h2>
                    </div>
                    <span className="wf-recent-count">
                      {run.plan?.singleAgent?.lane || run.request?.routing?.recommendedLane || "Single lane"}
                    </span>
                  </div>
                  <div className="wf-role-grid">
                    {catalog.agentRoles.map((role) => (
                      <div
                        key={role.id}
                        className={`wf-role-item ${run.plan?.singleAgent?.ownerAgentId === role.ownerAgentId ? "wf-role-item--active" : ""}`}
                      >
                        <span>{role.stage}</span>
                        <strong>{role.label}</strong>
                        <p>{role.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="wf-guided-grid" aria-label="Adjust the request before approval">
                <div className="wf-guided-field">
                  <label className="wf-field-label" htmlFor="wf-review-goal">Primary goal</label>
                  <input
                    id="wf-review-goal"
                    className="wf-guided-input"
                    type="text"
                    value={intake.goal || ""}
                    onChange={(e) => setIntake((prev) => ({ ...prev, goal: e.target.value }))}
                    placeholder="What should improve first?"
                  />
                </div>
                <div className="wf-guided-field">
                  <label className="wf-field-label" htmlFor="wf-review-output">Desired output</label>
                  <input
                    id="wf-review-output"
                    className="wf-guided-input"
                    type="text"
                    value={intake.desiredOutput || ""}
                    onChange={(e) => setIntake((prev) => ({ ...prev, desiredOutput: e.target.value }))}
                    placeholder="What do you want ATEAM to hand back?"
                  />
                </div>
                <div className="wf-guided-field wf-guided-field--full">
                  <label className="wf-field-label" htmlFor="wf-review-context">Relevant context</label>
                  <textarea
                    id="wf-review-context"
                    className="wf-question-textarea"
                    rows={3}
                    value={intake.context || ""}
                    onChange={(e) => setIntake((prev) => ({ ...prev, context: e.target.value }))}
                    placeholder="Anything ATEAM should preserve before execution starts."
                  />
                </div>
                <div className="wf-guided-field">
                  <label className="wf-field-label" htmlFor="wf-review-constraints">Constraints</label>
                  <textarea
                    id="wf-review-constraints"
                    className="wf-question-textarea"
                    rows={3}
                    value={intake.constraints || ""}
                    onChange={(e) => setIntake((prev) => ({ ...prev, constraints: e.target.value }))}
                    placeholder="Timeline, tools, approvals, or delivery constraints."
                  />
                </div>
                <div className="wf-guided-field">
                  <label className="wf-field-label" htmlFor="wf-review-nongoals">Non-goals</label>
                  <textarea
                    id="wf-review-nongoals"
                    className="wf-question-textarea"
                    rows={3}
                    value={intake.nonGoals || ""}
                    onChange={(e) => setIntake((prev) => ({ ...prev, nonGoals: e.target.value }))}
                    placeholder="What should not be included in this first pass?"
                  />
                </div>
              </div>

              <div className="wf-plan-editor-card">
                <div className="wf-template-head">
                    <div>
                      <p className="wf-pack-panel-kicker">Pre-approval plan edits</p>
                      <h2 className="wf-recent-title">Tune the plan before output generation</h2>
                  </div>
                  <button
                    type="button"
                    className="wf-btn-ghost"
                    onClick={() => setIsEditingPlan((current) => !current)}
                  >
                    {isEditingPlan ? "Hide plan editor" : "Edit the plan"}
                  </button>
                </div>
                {isEditingPlan ? (
                  <div className="wf-guided-grid">
                    <div className="wf-guided-field wf-guided-field--full">
                      <label className="wf-field-label" htmlFor="wf-plan-summary">Plan summary</label>
                      <textarea
                        id="wf-plan-summary"
                        className="wf-question-textarea"
                        rows={3}
                        value={planDraft.summary}
                        onChange={(e) => setPlanDraft((prev) => ({ ...prev, summary: e.target.value }))}
                      />
                    </div>
                    {planDraft.proposedSteps.map((step, index) => (
                      <div key={step.id || index} className="wf-plan-step-editor">
                        <label className="wf-field-label" htmlFor={`wf-step-title-${index}`}>Step {index + 1} title</label>
                        <input
                          id={`wf-step-title-${index}`}
                          className="wf-guided-input"
                          type="text"
                          value={step.title}
                          onChange={(e) =>
                            setPlanDraft((prev) => ({
                              ...prev,
                              proposedSteps: prev.proposedSteps.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, title: e.target.value } : item
                              ),
                            }))
                          }
                        />
                        <label className="wf-field-label" htmlFor={`wf-step-detail-${index}`}>Step {index + 1} detail</label>
                        <textarea
                          id={`wf-step-detail-${index}`}
                          className="wf-question-textarea"
                          rows={3}
                          value={step.detail}
                          onChange={(e) =>
                            setPlanDraft((prev) => ({
                              ...prev,
                              proposedSteps: prev.proposedSteps.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, detail: e.target.value } : item
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                    <div className="wf-guided-field">
                      <label className="wf-field-label" htmlFor="wf-plan-expected-title">Artifact title</label>
                      <input
                        id="wf-plan-expected-title"
                        className="wf-guided-input"
                        type="text"
                        value={planDraft.expectedArtifact.title}
                        onChange={(e) =>
                          setPlanDraft((prev) => ({
                            ...prev,
                            expectedArtifact: { ...prev.expectedArtifact, title: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="wf-guided-field">
                      <label className="wf-field-label" htmlFor="wf-plan-expected-summary">Artifact summary</label>
                      <textarea
                        id="wf-plan-expected-summary"
                        className="wf-question-textarea"
                        rows={3}
                        value={planDraft.expectedArtifact.summary}
                        onChange={(e) =>
                          setPlanDraft((prev) => ({
                            ...prev,
                            expectedArtifact: { ...prev.expectedArtifact, summary: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="wf-guided-field wf-guided-field--full">
                      <label className="wf-field-label" htmlFor="wf-plan-notes">Editor notes</label>
                      <textarea
                        id="wf-plan-notes"
                        className="wf-question-textarea"
                        rows={3}
                        value={planDraft.editorNotes}
                        onChange={(e) => setPlanDraft((prev) => ({ ...prev, editorNotes: e.target.value }))}
                        placeholder="Optional note about what changed or why."
                      />
                    </div>
                  </div>
                ) : (
                  <p className="wf-pack-panel-body">
                    Use this to refine wording, steps, and artifact framing without changing the
                    underlying workflow contract.
                  </p>
                )}
              </div>

              {(run?.questions || []).length > 0 && (
                <div className="wf-questions">
                  {(run?.questions || []).map((question, idx) => (
                  <div key={question.id} className="wf-question-card">
                    <div className="wf-question-num" aria-hidden="true">{idx + 1}</div>
                    <div className="wf-question-body">
                      <label className="wf-field-label" htmlFor={`wf-q-${question.id}`}>
                        {question.prompt}
                      </label>
                      <textarea
                        id={`wf-q-${question.id}`}
                        className="wf-question-textarea"
                        rows={3}
                        value={answers[question.id] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                        placeholder={question.placeholder || "Keep it short and direct."}
                      />
                      {question.hint && <small className="wf-field-hint">{question.hint}</small>}
                      {question.reason && <small className="wf-field-hint">{question.reason}</small>}
                    </div>
                  </div>
                  ))}
                </div>
              )}

              {error && <p className="wf-error" role="alert">{error}</p>}
              {!error && notice && !isDemoNotice(notice) && <p className="wf-notice">{notice}</p>}

              <div className="wf-clarify-actions">
                {isEditingPlan && (
                  <button
                    type="button"
                    className="wf-btn-ghost"
                    onClick={handleSavePlanEdits}
                    disabled={busy !== "idle"}
                  >
                    Save plan edits
                  </button>
                )}
                <button
                  type="button"
                  className="wf-btn-primary"
                  onClick={() => handlePlanDecision("approved")}
                  disabled={busy !== "idle"}
                >
                  Approve and generate the output {"->"}
                </button>
                <button
                  type="button"
                  className="wf-btn-ghost"
                  onClick={() => handlePlanDecision("regenerate")}
                  disabled={busy !== "idle"}
                >
                  Regenerate plan
                </button>
                <button
                  type="button"
                  className="wf-btn-ghost"
                  onClick={() => handlePlanDecision("rejected")}
                  disabled={busy !== "idle"}
                >
                  Reject
                </button>
              </div>
            </section>
          )}

          {/* ── OUTPUT / DECISION PACK ── */}
          {workflowReady && run && (
            <section
              ref={outputRef}
              className="wf-stage wf-stage--output"
              aria-label="Decision-ready output"
            >
              {/* Pack header */}
              <div className="wf-pack-head">
                <div className="wf-pack-head-copy">
                  <span className="wf-pack-badge">Decision-ready output</span>
                  <h1 className="wf-pack-title">{run.brief?.title || "ATEAM result"}</h1>
                  {run.brief?.summary && (
                    <p className="wf-pack-summary">{run.brief.summary}</p>
                  )}
                </div>
                {run.brief?.quickVerdict && (
                  <div className="wf-pack-verdict">
                    <span className="wf-pack-verdict-label">Verdict</span>
                    <p>{run.brief.quickVerdict}</p>
                  </div>
                )}
              </div>

              <div className="wf-state-progress wf-state-progress--output" aria-label="Workflow state progress">
                {V1_STATE_STEPS.map((step, index) => {
                  const isDone = currentStateIndex > index;
                  const isActive = currentStateIndex === index;
                  return (
                    <div
                      key={step}
                      className={`wf-state-pill ${isDone ? "wf-state-pill--done" : ""} ${isActive ? "wf-state-pill--active" : ""}`}
                    >
                      {formatWorkflowStateLabel(step)}
                    </div>
                  );
                })}
              </div>

              {run.recentArtifact && (
                <div className="wf-artifact-preview">
                  <div>
                    <p className="wf-pack-panel-kicker">Primary artifact preview</p>
                    <h3 className="wf-pack-panel-title">{run.recentArtifact.title}</h3>
                    <p className="wf-pack-panel-body">{run.recentArtifact.summary}</p>
                    {(run.recentArtifact.previewItems || []).length > 0 && (
                      <div className="wf-pack-tags">
                        {(run.recentArtifact.previewItems || []).map((item) => (
                          <span key={item} className="wf-pack-tag">{item}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="wf-artifact-actions">
                    <span className="wf-pack-meta-label">{formatWorkflowStateLabel(run.state || run.phase)}</span>
                    <button type="button" className="wf-btn-ghost" onClick={handleDownloadBundle}>
                      Download bundle
                    </button>
                  </div>
                </div>
              )}

              {/* 3-cell meta: lane / audience / first win */}
              <div className="wf-pack-meta">
                {[
                  { label: "Recommended path", value: run.brief?.recommendedLane || run.recommendedLane },
                  { label: "Who it helps", value: run.brief?.audience },
                  { label: "First win", value: run.brief?.primaryGoal || run.brief?.likelyUserValue },
                ].filter((m) => m.value).map((meta) => (
                  <div key={meta.label} className="wf-pack-meta-cell">
                    <span className="wf-pack-meta-label">{meta.label}</span>
                    <strong className="wf-pack-meta-value">{meta.value}</strong>
                  </div>
                ))}
              </div>

              {/* Prototype direction + Build note */}
              <div className="wf-pack-2col">

                {/* Prototype direction */}
                {run.artifacts?.prototype && (
                  <div className="wf-pack-panel wf-pack-panel--proto">
                    <p className="wf-pack-panel-kicker">Prototype direction</p>
                    <h3 className="wf-pack-panel-title">{run.artifacts.prototype.title || "First version"}</h3>
                    {run.artifacts.prototype.summary && (
                      <p className="wf-pack-panel-body">{run.artifacts.prototype.summary}</p>
                    )}

                    {/* Frame tabs */}
                    {(run.artifacts.prototype.frames || []).length > 0 && (
                      <div className="wf-proto-shell">
                        <div className="wf-proto-tabs" role="tablist">
                          {run.artifacts.prototype.frames.map((frame) => (
                            <button
                              key={frame.id}
                              type="button"
                              role="tab"
                              aria-selected={activePrototypeFrame?.id === frame.id}
                              className={`wf-proto-tab ${activePrototypeFrame?.id === frame.id ? "wf-proto-tab--active" : ""}`}
                              onClick={() => setActivePrototypeFrameId(frame.id)}
                            >
                              {frame.title}
                            </button>
                          ))}
                        </div>

                        {activePrototypeFrame && (
                          <div className="wf-proto-frame">
                            <div className="wf-proto-window">
                              <div className="wf-proto-window-bar" aria-hidden="true">
                                <span /><span /><span />
                              </div>
                              <div className="wf-proto-window-body">
                                <h4>{activePrototypeFrame.title}</h4>
                                <p>{activePrototypeFrame.purpose}</p>
                                {(activePrototypeFrame.interactions || []).length > 0 && (
                                  <ul className="wf-proto-interactions">
                                    {activePrototypeFrame.interactions.map((item) => (
                                      <li key={item}>{item}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tech stack */}
                    {(run.artifacts.prototype.stack || []).length > 0 && (
                      <div className="wf-pack-tags">
                        {run.artifacts.prototype.stack.map((s) => (
                          <span key={s} className="wf-pack-tag">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Build note */}
                <div className="wf-pack-panel wf-pack-panel--build">
                  <p className="wf-pack-panel-kicker">Build note</p>
                  <h3 className="wf-pack-panel-title">
                    {run.artifacts?.smoke?.summary
                      ? "Scope & watch-outs"
                      : "What to expect"}
                  </h3>
                  {run.artifacts?.smoke?.summary && (
                    <p className="wf-pack-panel-body">{run.artifacts.smoke.summary}</p>
                  )}

                  {/* Smoke checks */}
                  {(run.artifacts?.smoke?.checks || []).length > 0 && (
                    <div className="wf-smoke-list">
                      {run.artifacts!.smoke!.checks.slice(0, 4).map((check) => (
                        <div key={check.label} className="wf-smoke-item">
                          <span className={`wf-smoke-result wf-smoke-result--${String(check.result).toLowerCase()}`}>
                            {check.result}
                          </span>
                          <div>
                            <strong>{check.label}</strong>
                            {check.note && <p>{check.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Phased plan */}
                  {(run.brief?.phasedPlan || []).length > 0 && (
                    <>
                      <p className="wf-pack-panel-kicker" style={{ marginTop: "20px" }}>Phased plan</p>
                      <ol className="wf-phased-list">
                        {(run.brief!.phasedPlan || []).slice(0, 3).map((phase, i) => (
                          <li key={i}>{phase}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              </div>

              {/* Next steps */}
              {nextSteps.length > 0 && (
                <div className="wf-pack-nextsteps">
                  <p className="wf-pack-panel-kicker">Next steps</p>
                  <ol className="wf-nextsteps-list">
                    {nextSteps.map((step, i) => (
                      <li key={i} className="wf-nextstep">
                        <span className="wf-nextstep-num" aria-hidden="true">{i + 1}</span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="wf-proof-strip wf-proof-strip--output" aria-label="What ATEAM has clarified">
                <div className="wf-proof-step">
                  <span className="wf-proof-step-label">Objective set</span>
                  <p>Lead and Scout turned the idea into a clearer goal and input.</p>
                </div>
                <div className="wf-proof-step">
                  <span className="wf-proof-step-label">System designed</span>
                  <p>Architect and Builder mapped the shortest believable execution path.</p>
                </div>
                <div className="wf-proof-step">
                  <span className="wf-proof-step-label">Experience shaped</span>
                  <p>Designer and Operator clarified how the system should be used and run.</p>
                </div>
                <div className="wf-proof-step">
                  <span className="wf-proof-step-label">Ready to move</span>
                  <p>This pack is now ready for scoped delivery with Una Labs.</p>
                </div>
              </div>

              {/* CTA to Una Labs */}
              <div className="wf-pack-cta">
                <div className="wf-pack-cta-copy">
                  <h2 className="wf-pack-cta-headline">Move this into a real scoped engagement.</h2>
                  <p className="wf-pack-cta-body">
                    This pack becomes the commercial starting point: scoped first pass, prototype direction sprint, or build execution track. Send it over and get the shortest credible next step back.
                  </p>
                  <p className="wf-pack-cta-pricing">
                    Starting ranges: Scoped First Pass from $750, Prototype Direction Sprint from
                    $2,500, Build Execution Track from $5,000+.
                  </p>
                </div>
                <div className="wf-pack-cta-actions">
                  <button
                    type="button"
                    className="wf-btn-primary wf-btn-primary--large"
                    onClick={handleContinueWithUnaLabs}
                  >
                    Start this with Una Labs {"->"}
                  </button>
                  <button type="button" className="wf-btn-ghost" onClick={resetFlow}>
                    Run another idea
                  </button>
                </div>
              </div>

              {/* Operator shortcut (hidden from public) */}
              {operatorEnabled && run.id && (
                <div className="wf-op-strip">
                  <Link
                    href={`${operatorOfficePath}?workflowRunId=${encodeURIComponent(run.id)}&shell=workflow`}
                    prefetch={false}
                    className="wf-op-link"
                  >
                    Open in Mission Control {"->"}
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* ── IDLE OUTPUT PLACEHOLDER (before run) ── */}
          {!run && !isWorking && !workflowReady && (
            <div className="wf-placeholder-strip" aria-hidden="true">
              <div className="wf-placeholder-node">
                <span>◎</span><p>Idea in</p>
              </div>
              <div className="wf-placeholder-arrow">{"->"}</div>
              <div className="wf-placeholder-node">
                <span>⬡</span><p>Scoped plan</p>
              </div>
              <div className="wf-placeholder-arrow">{"->"}</div>
              <div className="wf-placeholder-node">
                <span>✦</span><p>Approved output</p>
              </div>
              <div className="wf-placeholder-arrow">{"->"}</div>
              <div className="wf-placeholder-node wf-placeholder-node--cta">
                <span>{"->"}</span><p>Live system</p>
              </div>
            </div>
          )}

        </div>
        </div>{/* container */}
        </div>{/* wf-intake-col */}
      </div>{/* wf-split */}
      {!run && !isWorking && !workflowReady && (
        <section className="wf-secondary-band" aria-label="ATEAM supporting information">
          <div className="container">
            <div className="wf-secondary-grid">
              <div className="wf-fit-strip" aria-label="Who ATEAM is best for">
                <div className="wf-fit-card">
                  <p className="wf-fit-title">Best for teams that need structured delivery decisions quickly</p>
                  <ul className="wf-fit-list">
                    <li>Local services businesses needing lead and ops systems</li>
                    <li>Founders who need a believable prototype path</li>
                    <li>Teams shaping workflow or internal tool direction</li>
                    <li>Operators with messy process problems that need structure</li>
                  </ul>
                  <p className="wf-fit-note">
                    Not ideal for long procurement cycles, broad RFP shopping, or projects with no
                    direct owner.
                  </p>
                </div>
              </div>
              <div className="wf-support-stack">
                {catalog.agentRoles.length > 0 && (
                  <div className="wf-role-card">
                    <div className="wf-template-head">
                      <div>
                        <p className="wf-pack-panel-kicker">Agent role library</p>
                        <h2 className="wf-recent-title">Workflow stages inside ATEAM</h2>
                      </div>
                    </div>
                    <div className="wf-role-grid">
                      {catalog.agentRoles.map((role) => (
                        <div key={role.id} className="wf-role-item">
                          <span>{role.stage}</span>
                          <strong>{role.label}</strong>
                          <p>{role.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="wf-office-support" aria-label="ATEAM workflow stages">
                  <OperatorOfficePanel phase={officePhase} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

