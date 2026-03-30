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
  ateamWorkflowCategories,
  formatWorkflowPhaseLabel,
  type WorkflowCategoryValue,
  type WorkflowRun,
} from "../../lib/ateamWorkflow";
import {
  clearAteamDemoHandoff,
  saveAteamWorkflowHandoff,
  type AteamWorkflowHandoffPayload,
} from "../../lib/ateamHandoff";

// ── Types ─────────────────────────────────────────────────────────────────────

type BusyState = "idle" | "starting" | "processing" | "loading";
type WorkflowServiceState = "checking" | "ready" | "unavailable";
type AteamWorkflowClientProps = {
  basePath?: string;
  operatorOfficePath?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
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
  { label: "Reading your idea", detail: "Capturing the signal and intent." },
  { label: "Finding the right path", detail: "Routing to the fastest believable lane." },
  { label: "Building the first version", detail: "Generating concept, prototype, and artifacts." },
  { label: "Packaging your results", detail: "Creating the decision pack for Una Labs." },
] as const;

// Compact type labels (no verbose descriptions)
const COMPACT_TYPES = [
  { value: "auto", label: "Auto" },
  { value: "product-app", label: "App / Product" },
  { value: "website", label: "Website" },
  { value: "lead-automation", label: "Lead system" },
  { value: "ai-feature", label: "AI workflow" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyAnswers(run: WorkflowRun | null) {
  return (run?.questions || []).reduce<Record<string, string>>((acc, q) => {
    acc[q.id] = String(run?.answers?.[q.id] || "");
    return acc;
  }, {});
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
    throw new Error(
      payload?.message || payload?.details || payload?.error || "ATEAM workflow request failed.",
    );
  }
  return payload;
}

function buildWorkflowPath(basePath: string, runId?: string) {
  const normalizedBasePath = basePath === "/" ? "/" : basePath.replace(/\/$/, "");
  if (!runId) {
    return normalizedBasePath;
  }
  return `${normalizedBasePath}?run=${encodeURIComponent(runId)}`;
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
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<WorkflowCategoryValue>("auto");
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [workflowServiceState, setWorkflowServiceState] = useState<WorkflowServiceState>("checking");
  const [processingStageIndex, setProcessingStageIndex] = useState(-1);
  const [activePrototypeFrameId, setActivePrototypeFrameId] = useState("");
  const [supportsVoice, setSupportsVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const runId = String(searchParams.get("run") || "").trim();
  const operatorEnabled = isAteamOperatorEnabled();

  // Check if ATEAM is live
  useEffect(() => {
    let cancelled = false;
    requestJson<{ ok: true }>("/api/ateam/workflow/runs?limit=1")
      .then(() => { if (!cancelled) setWorkflowServiceState("ready"); })
      .catch(() => { if (!cancelled) setWorkflowServiceState("unavailable"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackEvent("ateam_landing_view", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      base_path: basePath,
    });
  }, [basePath]);

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

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        const transcript = String(result[0]?.transcript || "").trim();
        if (transcript) parts.push(transcript);
      }
      if (!parts.length) return;
      setIdea((current) => {
        const spoken = parts.join(" ").trim();
        if (!current.trim()) return spoken;
        const suffix = /[.?!]\s*$/.test(current) ? " " : ". ";
        return `${current.trim()}${suffix}${spoken}`;
      });
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setSupportsVoice(true);

    return () => {
      try { recognition.abort?.(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, []);

  // Load run from URL
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setBusy("loading");
    requestJson<{ ok: true; run: WorkflowRun }>(
      `/api/ateam/workflow/runs/${encodeURIComponent(runId)}`
    )
      .then((payload) => {
        if (cancelled) return;
        setRun(payload.run);
        setIdea(payload.run.idea || "");
        setCategory((payload.run.category as WorkflowCategoryValue) || "auto");
        setAnswers(buildEmptyAnswers(payload.run));
        setActivePrototypeFrameId(payload.run.artifacts?.prototype?.frames?.[0]?.id || "");
        setBusy("idle");
      })
      .catch(() => { if (!cancelled) setBusy("idle"); });
    return () => { cancelled = true; };
  }, [runId]);

  useEffect(() => {
    if (!run) return;
    setAnswers(buildEmptyAnswers(run));
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
  const showClarifiers = Boolean(run && !workflowReady && !isWorking && (run.questions?.length ?? 0) > 0);

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
    setAnswers(buildEmptyAnswers(nextRun));
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
    clearAteamDemoHandoff();
    router.replace(buildWorkflowPath(basePath));
  }

  function toggleVoice() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
        return;
      }
      setError("");
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  async function handleStartRun() {
    setError("");
    setNotice("");
    if (workflowServiceState !== "ready") {
      setError("ATEAM is still connecting. Try again in a moment.");
      trackEvent("ateam_run_start_error", {
        reason: "service_not_ready",
        location: basePath === "/" ? "homepage" : "ateam_page",
        category,
      });
      return;
    }
    if (idea.trim().length < 12) {
      setError("Add a bit more detail — one sentence is enough to start.");
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
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>(
        "/api/ateam/workflow/runs",
        { method: "POST", body: JSON.stringify({ idea, category: category === "auto" ? "" : category }) }
      );
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

  async function handleBuildPack() {
    if (!run) return;
    const missing = (run.questions || []).find((q) => !String(answers[q.id] || "").trim());
    if (missing) {
      setError("Answer both questions so ATEAM can shape the pack cleanly.");
      trackEvent("ateam_pack_build_error", {
        reason: "missing_answer",
        location: basePath === "/" ? "homepage" : "ateam_page",
        run_id: run.id,
      });
      return;
    }
    setError("");
    trackEvent("ateam_pack_build_start", {
      location: basePath === "/" ? "homepage" : "ateam_page",
      run_id: run.id,
      question_count: run.questions?.length || 0,
    });
    setBusy("processing");
    try {
      setProcessingStageIndex(1);
      await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/answers`,
        { method: "POST", body: JSON.stringify({ answers }) }
      );
      setProcessingStageIndex(2);
      await wait(180);
      await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        { method: "POST", body: JSON.stringify({ gate: "brief", decision: "approved" }) }
      );
      setProcessingStageIndex(3);
      await wait(220);
      await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/generate-pack`,
        { method: "POST", body: JSON.stringify({}) }
      );
      setProcessingStageIndex(4);
      await wait(220);
      const result = await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        { method: "POST", body: JSON.stringify({ gate: "pack", decision: "approved" }) }
      );
      trackEvent("ateam_pack_ready", {
        location: basePath === "/" ? "homepage" : "ateam_page",
        run_id: result.run.id,
        recommended_lane: result.run.recommendedLane || "",
        next_steps_count: result.run.artifacts?.nextSteps?.length || 0,
      });
      await syncRun(result.run);
    } catch (err) {
      trackEvent("ateam_pack_build_error", {
        reason: err instanceof Error ? err.message : "request_failed",
        location: basePath === "/" ? "homepage" : "ateam_page",
        run_id: run.id,
      });
      setError(err instanceof Error ? err.message : "ATEAM could not build the pack right now.");
    } finally {
      setBusy("idle");
      setProcessingStageIndex(-1);
    }
  }

  function handleContinueWithUnaLabs() {
    if (!handoff) { setError("The decision pack isn't ready yet."); return; }
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
          <span className="wf-bar-sep">·</span>
          <span className="wf-bar-sub">Una Labs</span>
        </div>
        <div className="wf-bar-right">
          <span
            className={`wf-live-chip ${workflowServiceState === "ready" ? "wf-live-chip--on" : workflowServiceState === "checking" ? "wf-live-chip--wait" : "wf-live-chip--off"}`}
          >
            <span className="wf-live-dot" />
            {workflowServiceState === "ready" ? "Live" : workflowServiceState === "checking" ? "Connecting" : "Unavailable"}
          </span>
          {run && (
            <button className="wf-reset-btn" onClick={resetFlow} aria-label="Start a new idea">
              New idea
            </button>
          )}
          {operatorEnabled && (
            <Link href={operatorOfficePath} prefetch={false} className="wf-op-link">
              Operator →
            </Link>
          )}
        </div>
      </header>

      <div className="wf-split">
        <aside className="wf-office-col" aria-label="ATEAM agents">
          <OperatorOfficePanel phase={officePhase} />
        </aside>
        <div className="wf-intake-col">
        <div className="container">
        <div className="wf-body">

          {/* ── INTAKE STAGE ── */}
          {!run && !isWorking && !workflowReady && (
            <section className="wf-stage wf-stage--intake">
              <div className="wf-intro">
                <p className="wf-intro-eyebrow">Operator-led AI build studio</p>
                <h1 className="wf-intro-headline">
                  Turn a rough idea into a
                  <br />
                  scoped, buildable system fast.
                </h1>
                <p className="wf-intro-lead">
                  ATEAM structures the intake, shapes the first pass, and hands Una Labs a
                  clearer next move for websites, lead systems, workflow tools, and early
                  product builds.
                </p>
              </div>

              <div className="wf-intake-card">
                <div className="wf-intake-label-row">
                  <label className="wf-field-label" htmlFor="wf-idea">Drop the rough idea</label>
                  {supportsVoice && (
                    <button
                      type="button"
                      className={`wf-voice-btn ${isListening ? "wf-voice-btn--active" : ""}`}
                      onClick={toggleVoice}
                      aria-label={isListening ? "Stop voice capture" : "Speak your idea"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 15.2 14.47 17 12 17s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                      </svg>
                      {isListening ? "Listening…" : "Speak"}
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

                <div className="wf-intake-actions">
                  <button
                    type="button"
                    className="wf-btn-primary"
                    onClick={handleStartRun}
                    disabled={busy !== "idle" || workflowServiceState !== "ready"}
                  >
                    {busy !== "idle" ? "Starting…" : "Start ATEAM →"}
                  </button>
                  <p className="wf-intake-hint">
                    {workflowServiceState === "checking" ? "Connecting to ATEAM…" :
                     workflowServiceState === "unavailable" ? "ATEAM is offline — try again shortly" :
                     "One paragraph is enough. ATEAM turns it into a scoped first pass."}
                  </p>
                </div>
              </div>

              {/* What you'll get */}
              <div className="wf-expect-row" aria-label="What ATEAM produces">
                {[
                  { icon: "◎", label: "Scoped first pass", detail: "Problem, audience, and the shortest believable path" },
                  { icon: "⬡", label: "Prototype direction", detail: "What the first version should do and prove" },
                  { icon: "✦", label: "Build note", detail: "Scope, risk, lane, and technical direction" },
                  { icon: "→", label: "Next move", detail: "A handoff Una Labs can review and execute" },
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

              <div className="wf-fit-strip" aria-label="Who ATEAM is best for">
                <div className="wf-fit-card">
                  <p className="wf-fit-title">Best for teams that need a clear next step fast</p>
                  <ul className="wf-fit-list">
                    <li>Local services businesses needing lead and ops systems</li>
                    <li>Founders who need a believable prototype path</li>
                    <li>Teams shaping workflow or internal tool direction</li>
                    <li>Operators with messy process problems that need structure</li>
                  </ul>
                </div>
                <p className="wf-fit-note">
                  Not ideal for long procurement cycles, broad RFP shopping, or projects with no
                  direct owner.
                </p>
              </div>
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
          {showClarifiers && (
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
                <h2 className="wf-clarify-headline">Two quick gaps</h2>
                <p className="wf-clarify-sub">
                  ATEAM needs these last two points to route cleanly and build a strong first pass.
                </p>
              </div>

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
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="wf-error" role="alert">{error}</p>}

              <div className="wf-clarify-actions">
                <button
                  type="button"
                  className="wf-btn-primary"
                  onClick={handleBuildPack}
                  disabled={busy !== "idle"}
                >
                  Build my pack →
                </button>
                <button type="button" className="wf-btn-ghost" onClick={resetFlow}>
                  Start over
                </button>
              </div>
            </section>
          )}

          {/* ── OUTPUT / DECISION PACK ── */}
          {workflowReady && run && (
            <section
              ref={outputRef}
              className="wf-stage wf-stage--output"
              aria-label="Decision pack"
            >
              {/* Pack header */}
              <div className="wf-pack-head">
                <div className="wf-pack-head-copy">
                  <span className="wf-pack-badge">Decision pack ready</span>
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
                    Start this with Una Labs →
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
                    Open in Mission Control →
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* ── IDLE OUTPUT PLACEHOLDER (before run) ── */}
          {!run && !isWorking && !workflowReady && (
            <div className="wf-placeholder-strip" aria-hidden="true">
              <div className="wf-placeholder-node">
                <span>◎</span><p>Concept brief</p>
              </div>
              <div className="wf-placeholder-arrow">→</div>
              <div className="wf-placeholder-node">
                <span>⬡</span><p>Prototype</p>
              </div>
              <div className="wf-placeholder-arrow">→</div>
              <div className="wf-placeholder-node">
                <span>✦</span><p>Build note</p>
              </div>
              <div className="wf-placeholder-arrow">→</div>
              <div className="wf-placeholder-node wf-placeholder-node--cta">
                <span>→</span><p>Una Labs</p>
              </div>
            </div>
          )}

        </div>
        </div>{/* container */}
        </div>{/* wf-intake-col */}
      </div>{/* wf-split */}
    </div>
  );
}

