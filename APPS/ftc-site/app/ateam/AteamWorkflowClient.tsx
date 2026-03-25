"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ATEAM_BRAND_LOGO_PATH,
  ATEAM_MISSION_CONTROL_PREVIEW_PATH
} from "../../lib/ateamEmbed";
import { isAteamOperatorEnabled } from "../../lib/ateamOperator";
import {
  ateamWorkflowCategories,
  ateamWorkflowSteps,
  formatWorkflowPhaseLabel,
  type WorkflowCategoryValue,
  type WorkflowRun
} from "../../lib/ateamWorkflow";
import {
  clearAteamDemoHandoff,
  saveAteamWorkflowHandoff,
  type AteamWorkflowHandoffPayload
} from "../../lib/ateamHandoff";

type BusyState = "idle" | "starting" | "processing" | "loading";
type WorkflowServiceState = "checking" | "ready" | "unavailable";

type SpeechRecognitionResultLike = {
  transcript: string;
};

type SpeechRecognitionAlternativeLike = {
  0?: SpeechRecognitionResultLike;
  isFinal?: boolean;
  length?: number;
};

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionAlternativeLike>;
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

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

const conversionTunnel = [
  { key: "capture", label: "Capture", detail: "Take the raw idea as-is." },
  { key: "structure", label: "Structure", detail: "Pull out the audience and first useful win." },
  { key: "route", label: "Route", detail: "Pick the fastest believable lane." },
  { key: "build", label: "Build pass", detail: "Shape a quick concept and flow." },
  { key: "review", label: "QA check", detail: "Flag what is ready and what still needs care." },
  { key: "pack", label: "Decision pack", detail: "Bundle the next move with Una Labs." }
] as const;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    method: init?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    body: init?.body,
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    message?: string;
    details?: string;
    error?: string;
  };

  if (!response.ok || payload?.ok === false) {
    throw new Error(
      payload?.message ||
        payload?.details ||
        payload?.error ||
        "ATEAM workflow request failed."
    );
  }

  return payload;
}

function buildEmptyAnswers(run: WorkflowRun | null) {
  return (run?.questions || []).reduce<Record<string, string>>((acc, question) => {
    acc[question.id] = String(run?.answers?.[question.id] || "");
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

function getStepIndex(run: WorkflowRun | null, workflowReady: boolean, busy: BusyState) {
  if (busy === "starting") return 0;
  if (!run) return 0;
  if (workflowReady) return 4;
  if (busy === "processing") return 3;
  if (run.phase === "analysis") return 1;
  if (run.phase === "brief_approval" || run.phase === "initiation") return 2;
  if (run.phase === "prototype_pack" || run.phase === "pack_approval") return 3;
  return 0;
}

function getQuickVerdict(run: WorkflowRun | null) {
  if (!run) return "No output yet";
  return run.brief?.quickVerdict || "Go for a scoped first pass";
}

export default function AteamWorkflowClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    requestJson<{ ok: true; runs?: WorkflowRun[] }>("/api/ateam/workflow/runs?limit=1")
      .then(() => {
        if (!cancelled) setWorkflowServiceState("ready");
      })
      .catch(() => {
        if (!cancelled) setWorkflowServiceState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
        const result = event.results[index];
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
      try {
        recognition.abort?.();
      } catch {
        // Ignore cleanup issues from browser recognition.
      }
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setBusy("loading");
    requestJson<{ ok: true; run: WorkflowRun }>(`/api/ateam/workflow/runs/${encodeURIComponent(runId)}`)
      .then((payload) => {
        if (cancelled) return;
        setRun(payload.run);
        setIdea(payload.run.idea || "");
        setCategory((payload.run.category as WorkflowCategoryValue) || "auto");
        setAnswers(buildEmptyAnswers(payload.run));
        setActivePrototypeFrameId(payload.run.artifacts?.prototype?.frames?.[0]?.id || "");
        setBusy("idle");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setBusy("idle");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load the ATEAM workflow run."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [runId]);

  useEffect(() => {
    if (!run) return;
    setAnswers(buildEmptyAnswers(run));
  }, [run?.id]);

  useEffect(() => {
    const firstFrame = run?.artifacts?.prototype?.frames?.[0]?.id || "";
    if (!firstFrame) {
      setActivePrototypeFrameId("");
      return;
    }
    setActivePrototypeFrameId((current) => current || firstFrame);
  }, [run?.artifacts?.prototype?.frames]);

  useEffect(() => {
    const handoff = toHandoffPayload(run);
    if (!handoff || !outputRef.current) return;
    outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [run?.id, run?.phase]);

  const selectedCategory = useMemo(
    () =>
      ateamWorkflowCategories.find((item) => item.value === category) ||
      ateamWorkflowCategories[0],
    [category]
  );
  const handoff = toHandoffPayload(run);
  const packReady = Boolean(run?.artifacts?.prototype?.frames?.length);
  const packApproved = String(run?.approvals?.pack?.status || "").toLowerCase() === "approved";
  const workflowReady = Boolean(handoff && (packApproved || run?.phase === "handoff"));
  const activePrototypeFrame =
    run?.artifacts?.prototype?.frames?.find((frame) => frame.id === activePrototypeFrameId) ||
    run?.artifacts?.prototype?.frames?.[0] ||
    null;
  const stepIndex = getStepIndex(run, workflowReady, busy);
  const compactScreens = (run?.artifacts?.mockup?.screens || []).slice(0, 3);
  const compactDocSections = (run?.artifacts?.doc?.sections || []).slice(0, 3);
  const nextSteps = (handoff?.nextSteps || run?.artifacts?.nextSteps || []).slice(0, 3);
  const operatorOfficeHref = run?.id
    ? `/ateam/operator/office?workflowRunId=${encodeURIComponent(run.id)}&shell=workflow`
    : "/ateam/operator/office?shell=workflow";
  const operatorFactoryHref = run?.id
    ? `/ateam/operator/factory?workflowRunId=${encodeURIComponent(run.id)}&shell=workflow`
    : "/ateam/operator/factory?shell=workflow";

  async function syncRun(nextRun: WorkflowRun) {
    setRun(nextRun);
    setIdea(nextRun.idea || "");
    setCategory((nextRun.category as WorkflowCategoryValue) || "auto");
    setAnswers(buildEmptyAnswers(nextRun));
    if (nextRun.id && nextRun.id !== runId) {
      router.replace(`/ateam?run=${encodeURIComponent(nextRun.id)}`);
    }
  }

  function resetFlow() {
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
    router.replace("/ateam");
  }

  function toggleVoiceCapture() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
        return;
      }
      setError("");
      setNotice("Voice capture is on. Drop the rough idea naturally.");
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setError("Voice capture could not start in this browser. Type the rough idea instead.");
    }
  }

  async function handleStartRun() {
    setError("");
    setNotice("");

    if (workflowServiceState !== "ready") {
      setError(
        "ATEAM fast pass is not connected in this environment yet. Run the local ATEAM server or use Start a Project."
      );
      return;
    }

    if (idea.trim().length < 12) {
      setError("Drop a little more context so ATEAM can shape a believable first pass.");
      return;
    }

    setBusy("starting");
    setProcessingStageIndex(0);

    try {
      await wait(180);
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>("/api/ateam/workflow/runs", {
        method: "POST",
        body: JSON.stringify({
          idea,
          category: category === "auto" ? "" : category
        })
      });
      setProcessingStageIndex(1);
      await wait(180);
      await syncRun(payload.run);
      setNotice("ATEAM pulled out the two missing pieces. Answer them and the pack will build automatically.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the ATEAM fast pass."
      );
    } finally {
      setBusy("idle");
      setProcessingStageIndex(-1);
    }
  }

  async function handleBuildPack() {
    if (!run) return;

    const missingAnswer = (run.questions || []).find((question) => !String(answers[question.id] || "").trim());
    if (missingAnswer) {
      setError("Answer the quick clarifiers so ATEAM can shape the first pass cleanly.");
      return;
    }

    setError("");
    setNotice("");
    setBusy("processing");

    try {
      setProcessingStageIndex(1);
      await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/answers`,
        {
          method: "POST",
          body: JSON.stringify({ answers })
        }
      );

      setProcessingStageIndex(2);
      await wait(180);
      await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            gate: "brief",
            decision: "approved"
          })
        }
      );

      setProcessingStageIndex(3);
      await wait(220);
      await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/generate-pack`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );

      setProcessingStageIndex(4);
      await wait(220);
      const handoffPayload = await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            gate: "pack",
            decision: "approved"
          })
        }
      );

      await syncRun(handoffPayload.run);
      setNotice("ATEAM shaped the brief, built the pack, and lined up the next move.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ATEAM could not finish the fast pass right now."
      );
    } finally {
      setBusy("idle");
      setProcessingStageIndex(-1);
    }
  }

  function handleContinueWithUnaLabs() {
    if (!handoff) {
      setError("The decision pack is not ready to send onward yet.");
      return;
    }
    clearAteamDemoHandoff();
    saveAteamWorkflowHandoff(handoff);
    router.push("/work-with-ftc");
  }

  return (
    <article className="container page-content ateam-page ateam-page--workflow">
      <section className="card ateam-workflow-hero-card ateam-fast-pass-hero">
        <div className="ateam-workflow-hero-copy">
          <p className="eyebrow">ATEAM inside Una Labs</p>
          <h1>Drop a rough idea. Leave with a quick decision pack.</h1>
          <p className="lead">
            ATEAM takes messy input, shapes the useful core, and turns it into a first-pass concept,
            build notes, and a clear next move with Una Labs.
          </p>
          <div className="ateam-fast-pass-pills" aria-label="ATEAM flow highlights">
            <span className="proof-tag">Raw idea in</span>
            <span className="proof-tag">Quick structure pass</span>
            <span className="proof-tag">Prototype direction out</span>
          </div>
        </div>

        <div className="ateam-workflow-hero-visual">
          <div className="ateam-conversion-preview">
            <div className="ateam-conversion-preview-mark" aria-hidden="true">
              <img src={ATEAM_BRAND_LOGO_PATH} alt="" width={56} height={56} />
            </div>
            <img
              src={ATEAM_MISSION_CONTROL_PREVIEW_PATH}
              alt="ATEAM Mission Control preview"
              className="ateam-conversion-preview-image"
            />
            <div className="ateam-conversion-preview-strip" aria-hidden="true">
              {conversionTunnel.slice(0, 4).map((stage) => (
                <span key={stage.key}>{stage.label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="ateam-workflow-layout">
        <div className="ateam-workflow-main">
          <section className="card ateam-workflow-step-card">
            <div className="ateam-workflow-step-head">
              <div>
                <p className="card-kicker">Fast pass</p>
                <h2>Start with the rough idea</h2>
                <p className="muted">
                  Keep it natural. One paragraph is enough. If you know the lane already, set it.
                  If not, leave it on auto.
                </p>
              </div>
              <span className="status-pill">
                {workflowServiceState === "ready"
                  ? "Live"
                  : workflowServiceState === "checking"
                    ? "Checking"
                    : "Unavailable"}
              </span>
            </div>

            <div className="ateam-workflow-step-rail" aria-label="ATEAM fast-pass stages">
              {ateamWorkflowSteps.map((step, index) => {
                const isComplete = workflowReady ? true : index < stepIndex;
                const isActive = workflowReady ? index === ateamWorkflowSteps.length - 1 : index === stepIndex;
                return (
                  <div
                    key={step.key}
                    className={`ateam-workflow-step${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
                  >
                    <strong>{step.label}</strong>
                    <span>{step.detail}</span>
                  </div>
                );
              })}
            </div>

            {error ? <p className="ateam-demo-error">{error}</p> : null}
            {notice ? <p className="ateam-demo-hint">{notice}</p> : null}

            <div className="ateam-fast-pass-intake">
              <label className="ateam-demo-field" htmlFor="ateam-idea-input">
                <span>Drop your rough idea</span>
                <textarea
                  id="ateam-idea-input"
                  rows={7}
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="Example: I want a WhatsApp-first system that helps food vendors take orders, route them to staff, and show status back clearly."
                />
              </label>

              <div className="ateam-fast-pass-toolbar">
                <div className="ateam-category-strip" aria-label="Optional lane selection">
                  {ateamWorkflowCategories.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`ateam-category-chip${category === item.value ? " is-active" : ""}`}
                      onClick={() => setCategory(item.value)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </button>
                  ))}
                </div>

                <div className="ateam-fast-pass-actions">
                  {supportsVoice ? (
                    <button type="button" className="btn btn-secondary" onClick={toggleVoiceCapture}>
                      {isListening ? "Stop voice capture" : "Speak the idea"}
                    </button>
                  ) : null}
                  {run ? (
                    <button type="button" className="btn btn-secondary" onClick={resetFlow}>
                      Start fresh
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStartRun}
                    disabled={busy === "starting" || busy === "processing"}
                  >
                    {busy === "starting" ? "Opening fast pass..." : "Start ATEAM fast pass"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {run && !workflowReady && run.questions?.length ? (
            <section className="card ateam-workflow-step-card">
              <div className="ateam-workflow-step-head">
                <div>
                  <p className="card-kicker">Quick clarifiers</p>
                  <h2>Answer the last two gaps</h2>
                  <p className="muted">
                    Keep these short. ATEAM only needs enough to shape a believable first pass.
                  </p>
                </div>
                <span className="status-pill">{run.questions.length} prompts</span>
              </div>

              <div className="ateam-workflow-question-list">
                {run.questions.map((question) => (
                  <label key={question.id} className="ateam-demo-field" htmlFor={`question-${question.id}`}>
                    <span>{question.prompt}</span>
                    <textarea
                      id={`question-${question.id}`}
                      rows={4}
                      value={answers[question.id] || ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value
                        }))
                      }
                      placeholder={question.placeholder}
                    />
                    {question.hint ? <small className="ateam-workflow-field-hint">{question.hint}</small> : null}
                  </label>
                ))}
              </div>

              <div className="ateam-workflow-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBuildPack}
                  disabled={busy === "processing" || busy === "starting"}
                >
                  {busy === "processing" ? "Building pack..." : "Build the decision pack"}
                </button>
              </div>
            </section>
          ) : null}

          {busy === "starting" || busy === "processing" ? (
            <section className="card ateam-workflow-step-card">
              <div className="ateam-workflow-step-head">
                <div>
                  <p className="card-kicker">Conversion tunnel</p>
                  <h2>ATEAM is shaping the first pass</h2>
                  <p className="muted">
                    Short enough to feel quick. Visible enough to feel real.
                  </p>
                </div>
                <span className="status-pill">
                  {conversionTunnel[Math.max(processingStageIndex, 0)]?.label || "Working"}
                </span>
              </div>

              <div className="ateam-conversion-tunnel" aria-live="polite">
                {conversionTunnel.map((stage, index) => {
                  const isActive = index === Math.max(processingStageIndex, 0);
                  const isComplete = index < processingStageIndex;
                  return (
                    <div
                      key={stage.key}
                      className={`ateam-conversion-node${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
                    >
                      <strong>{stage.label}</strong>
                      <span>{stage.detail}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {workflowReady && run ? (
            <section ref={outputRef} className="card ateam-workflow-step-card ateam-result-package">
              <div className="ateam-workflow-step-head">
                <div>
                  <p className="card-kicker">Decision pack</p>
                  <h2>{run.brief?.title || "ATEAM result"}</h2>
                  <p className="muted">{run.brief?.summary}</p>
                </div>
                <span className="status-pill">{getQuickVerdict(run)}</span>
              </div>

              <div className="ateam-workflow-brief-grid">
                <article className="ateam-workflow-brief-panel">
                  <p className="ateam-workflow-brief-label">Recommended move</p>
                  <h3>{run.brief?.recommendedLane || run.recommendedLane}</h3>
                  <p>{run.brief?.recommendedDirection}</p>
                  <p className="muted">{run.brief?.decisionNote}</p>
                </article>
                <article className="ateam-workflow-brief-panel">
                  <p className="ateam-workflow-brief-label">Likely user value</p>
                  <h3>{run.brief?.audience || "Primary audience"}</h3>
                  <p>{run.brief?.likelyUserValue}</p>
                  <ul className="ateam-brief-list">
                    {(run.brief?.goals || []).slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>

              <div className="ateam-workflow-pack-grid">
                <article className="ateam-workflow-pack-panel">
                  <p className="ateam-workflow-brief-label">Visual concept</p>
                  <h3>{run.artifacts?.mockup?.title || "Concept pack"}</h3>
                  <p>{run.artifacts?.mockup?.summary}</p>
                  <div className="ateam-workflow-screen-grid">
                    {compactScreens.map((screen) => (
                      <div key={screen.id} className="ateam-workflow-screen-card">
                        <strong>{screen.title}</strong>
                        <p>{screen.caption}</p>
                        <ul>
                          {screen.highlights.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="ateam-workflow-pack-panel">
                  <p className="ateam-workflow-brief-label">Quick prototype</p>
                  <h3>{run.artifacts?.prototype?.title || "Prototype direction"}</h3>
                  <div className="ateam-workflow-prototype-shell">
                    <div className="ateam-workflow-prototype-tabs" role="tablist" aria-label="Prototype frames">
                      {(run.artifacts?.prototype?.frames || []).map((frame) => (
                        <button
                          key={frame.id}
                          type="button"
                          className={`ateam-workflow-prototype-tab${activePrototypeFrame?.id === frame.id ? " is-active" : ""}`}
                          onClick={() => setActivePrototypeFrameId(frame.id)}
                        >
                          {frame.title}
                        </button>
                      ))}
                    </div>

                    {activePrototypeFrame ? (
                      <div className="ateam-workflow-prototype-stage">
                        <div className="ateam-workflow-prototype-window">
                          <div className="ateam-workflow-prototype-window-bar" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="ateam-workflow-prototype-window-body">
                            <h4>{activePrototypeFrame.title}</h4>
                            <p>{activePrototypeFrame.purpose}</p>
                            <ul className="ateam-brief-list">
                              {activePrototypeFrame.interactions.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="ateam-workflow-prototype-actions">
                      {(run.artifacts?.prototype?.stack || []).map((item) => (
                        <span key={item} className="proof-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </div>

              <div className="ateam-workflow-pack-grid">
                <article className="ateam-workflow-pack-panel">
                  <p className="ateam-workflow-brief-label">Build watch</p>
                  <h3>{run.artifacts?.smoke?.summary || "Quick QA view"}</h3>
                  <div className="ateam-workflow-smoke-list">
                    {(run.artifacts?.smoke?.checks || []).map((check) => (
                      <div key={check.label} className="ateam-workflow-smoke-item">
                        <span>{check.result}</span>
                        <strong>{check.label}</strong>
                        <p>{check.note}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="ateam-workflow-pack-panel">
                  <p className="ateam-workflow-brief-label">Next move</p>
                  <h3>Continue with Una Labs or open the real lab view</h3>
                  <div className="ateam-workflow-doc-grid">
                    {compactDocSections.map((section) => (
                      <div key={section.title} className="ateam-workflow-doc-section">
                        <strong>{section.title}</strong>
                        <ul>
                          {section.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <ul className="ateam-demo-list">
                    {nextSteps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <div className="ateam-workflow-actions">
                    <button type="button" className="btn btn-primary" onClick={handleContinueWithUnaLabs}>
                      Continue with Una Labs
                    </button>
                    {operatorEnabled ? (
                      <Link href={operatorOfficeHref} prefetch={false} className="btn btn-secondary">
                        Open real lab view
                      </Link>
                    ) : null}
                  </div>
                </article>
              </div>
            </section>
          ) : (
            <section className="card ateam-workflow-step-card">
              <div className="ateam-workflow-step-head">
                <div>
                  <p className="card-kicker">What comes out</p>
                  <h2>A quick decision package, not a fake story about intelligence.</h2>
                  <p className="muted">
                    Once ATEAM runs, this panel will show the idea summary, likely user value,
                    prototype direction, build notes, and the next move with Una Labs.
                  </p>
                </div>
                <span className="status-pill">Waiting</span>
              </div>
              <div className="ateam-output-card">
                <p>
                  Expect a first-pass read on what the product is, who it helps, what to build
                  first, what systems matter, and whether it looks worth moving forward.
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className="ateam-workflow-sidebar">
          <section className="card ateam-workflow-sidebar-card">
            <p className="card-kicker">Run status</p>
            <h3>{workflowReady ? "Decision pack ready" : run ? "Run in progress" : "No run yet"}</h3>
            <div className="ateam-workflow-sidebar-meta">
              <div>
                <span>Phase</span>
                <strong>{run ? formatWorkflowPhaseLabel(run.phase) : "Waiting for idea"}</strong>
              </div>
              <div>
                <span>Lane</span>
                <strong>{run?.recommendedLane || selectedCategory.label}</strong>
              </div>
              <div>
                <span>Run ID</span>
                <strong>{run?.id || "--"}</strong>
              </div>
            </div>
          </section>

          <section className="card ateam-workflow-sidebar-card">
            <p className="card-kicker">Real lab view</p>
            <h3>ATEAM still connects to the actual local runtime.</h3>
            <p className="muted">
              The public fast pass stays focused. The real Office and Factory views stay available
              through the local/operator route when Una Labs is running locally.
            </p>
            {operatorEnabled ? (
              <div className="ateam-workflow-actions">
                <Link href={operatorOfficeHref} prefetch={false} className="btn btn-secondary">
                  Open Office
                </Link>
                <Link href={operatorFactoryHref} prefetch={false} className="btn btn-secondary">
                  Open Factory
                </Link>
              </div>
            ) : (
              <p className="muted">
                The live operator view is available when Una Labs is opened locally with the ATEAM
                runtime on port 3000.
              </p>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
