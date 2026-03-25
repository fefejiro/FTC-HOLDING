"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ATEAM_BRAND_LOGO_PATH,
  ATEAM_MISSION_CONTROL_PREVIEW_PATH
} from "../../lib/ateamEmbed";
<<<<<<< HEAD
=======
import { isAteamOperatorEnabled } from "../../lib/ateamOperator";
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
import {
  ateamWorkflowCategories,
  ateamWorkflowSteps,
  formatWorkflowPhaseLabel,
  type WorkflowRun
} from "../../lib/ateamWorkflow";
import {
  clearAteamDemoHandoff,
  type AteamWorkflowHandoffPayload,
  saveAteamWorkflowHandoff
} from "../../lib/ateamHandoff";

type BusyState = "idle" | "starting" | "answers" | "brief" | "pack" | "handoff" | "loading";
<<<<<<< HEAD
=======
type WorkflowServiceState = "checking" | "ready" | "unavailable";
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b

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

export default function AteamWorkflowClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<(typeof ateamWorkflowCategories)[number]["value"]>("website");
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activePrototypeFrameId, setActivePrototypeFrameId] = useState("");
<<<<<<< HEAD
=======
  const [workflowServiceState, setWorkflowServiceState] = useState<WorkflowServiceState>("checking");
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b

  const runId = String(searchParams.get("run") || "").trim();

  useEffect(() => {
<<<<<<< HEAD
=======
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
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
    if (!runId) return;
    let cancelled = false;
    setBusy("loading");
    requestJson<{ ok: true; run: WorkflowRun }>(`/api/ateam/workflow/runs/${encodeURIComponent(runId)}`)
      .then((payload) => {
        if (cancelled) return;
        setRun(payload.run);
        setIdea(payload.run.idea || "");
        setCategory((payload.run.category as (typeof ateamWorkflowCategories)[number]["value"]) || "website");
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

  const selectedCategory = useMemo(
    () => ateamWorkflowCategories.find((item) => item.value === category) || ateamWorkflowCategories[0],
    [category]
  );

<<<<<<< HEAD
  const briefReady = Boolean(run?.brief?.summary);
  const briefApproved = String(run?.approvals?.brief?.status || "").toLowerCase() === "approved";
  const packReady = Boolean(run?.artifacts?.prototype?.frames?.length);
  const packApproved = String(run?.approvals?.pack?.status || "").toLowerCase() === "approved";
  const operatorHref = run?.links?.projectId
    ? `/ateam/operator/projects?workflowRunId=${encodeURIComponent(run.id)}`
    : "/ateam/operator/projects";
=======
  const operatorEnabled = isAteamOperatorEnabled();
  const packReady = Boolean(run?.artifacts?.prototype?.frames?.length);
  const packApproved = String(run?.approvals?.pack?.status || "").toLowerCase() === "approved";
  const workflowReady = packApproved && Number(run?.handoff?.version || 0) === 2;
  const operatorHref = run?.id
    ? `/ateam/operator/office?workflowRunId=${encodeURIComponent(run.id)}&shell=workflow`
    : "/ateam/operator/office?shell=workflow";
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
  const activePrototypeFrame =
    run?.artifacts?.prototype?.frames?.find((frame) => frame.id === activePrototypeFrameId) ||
    run?.artifacts?.prototype?.frames?.[0] ||
    null;
<<<<<<< HEAD
=======
  const compactMockupScreens = (run?.artifacts?.mockup?.screens || []).slice(0, 3);
  const compactNextSteps = (run?.handoff?.nextSteps || run?.artifacts?.nextSteps || []).slice(0, 3);
  const hasQuestions = Boolean(run?.questions?.length);
  const quickQuestionLabel = run?.questions?.length === 1 ? "1 quick answer" : `${run?.questions?.length || 0} quick answers`;
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b

  async function syncRun(nextRun: WorkflowRun) {
    setRun(nextRun);
    setIdea(nextRun.idea || "");
    setCategory((nextRun.category as (typeof ateamWorkflowCategories)[number]["value"]) || "website");
    setAnswers(buildEmptyAnswers(nextRun));
    if (nextRun.id && nextRun.id !== runId) {
      router.replace(`/ateam?run=${encodeURIComponent(nextRun.id)}`);
    }
  }

  async function handleStartRun() {
    setError("");
    setNotice("");
<<<<<<< HEAD
=======
    if (workflowServiceState !== "ready") {
      setError("ATEAM fast pass is not connected on this environment yet. Use Start a Project while the hosted workflow service is being wired.");
      return;
    }
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
    if (idea.trim().length < 12) {
      setError("Share a bit more detail so ATEAM can shape a believable first pass.");
      return;
    }

    setBusy("starting");
    try {
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>("/api/ateam/workflow/runs", {
        method: "POST",
        body: JSON.stringify({
          idea,
          category
        })
      });
      await syncRun(payload.run);
<<<<<<< HEAD
      setNotice("ATEAM opened a workflow run and generated the first follow-up questions.");
=======
      setNotice("ATEAM opened the run and asked for the last quick clarifiers.");
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the ATEAM workflow run."
      );
    } finally {
      setBusy("idle");
    }
  }

  async function handleSubmitAnswers() {
    if (!run) return;
    setError("");
    setNotice("");
    setBusy("answers");
    try {
<<<<<<< HEAD
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>(
=======
      const answersPayload = await requestJson<{ ok: true; run: WorkflowRun }>(
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/answers`,
        {
          method: "POST",
          body: JSON.stringify({ answers })
        }
      );
<<<<<<< HEAD
      await syncRun(payload.run);
      setNotice("Brief ready. Review it, then approve the lane and scope.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save workflow answers."
      );
    } finally {
      setBusy("idle");
    }
  }

  async function handleBriefDecision(decision: "approved" | "rejected") {
    if (!run) return;
    setError("");
    setNotice("");
    setBusy("brief");
    try {
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>(
=======
      await syncRun(answersPayload.run);

      setBusy("brief");
      const briefPayload = await requestJson<{ ok: true; run: WorkflowRun }>(
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            gate: "brief",
<<<<<<< HEAD
            decision
          })
        }
      );
      await syncRun(payload.run);
      setNotice(
        decision === "approved"
          ? "Brief approved. Operator work is now linked into Projects, Office, Pipeline, and Factory."
          : "Brief sent back to analysis. Update the answers and tighten the scope."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record the brief decision."
      );
    } finally {
      setBusy("idle");
    }
  }

  async function handleGeneratePack() {
    if (!run) return;
    setError("");
    setNotice("");
    setBusy("pack");
    try {
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>(
=======
            decision: "approved"
          })
        }
      );
      await syncRun(briefPayload.run);

      setBusy("pack");
      const packPayload = await requestJson<{ ok: true; run: WorkflowRun }>(
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/generate-pack`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );
<<<<<<< HEAD
      await syncRun(payload.run);
      setNotice("Prototype pack generated. Review the concept screens, clickable flow, smoke summary, and operator note.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate the ATEAM pack."
      );
    } finally {
      setBusy("idle");
    }
  }

  async function handlePackDecision(decision: "approved" | "rejected") {
    if (!run) return;
    setError("");
    setNotice("");
    setBusy("handoff");
    try {
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>(
=======
      await syncRun(packPayload.run);

      setBusy("handoff");
      const handoffPayload = await requestJson<{ ok: true; run: WorkflowRun }>(
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            gate: "pack",
<<<<<<< HEAD
            decision
          })
        }
      );
      await syncRun(payload.run);
      setNotice(
        decision === "approved"
          ? "Pack approved. You can now carry this run straight into Una Labs intake."
          : "Pack sent back for another pass. Adjust the scope or regenerate once the brief is tighter."
=======
            decision: "approved"
          })
        }
      );
      await syncRun(handoffPayload.run);
      setNotice(
        operatorEnabled
          ? "ATEAM fast pass is ready. Review the output, send it to Una Labs, or open the operator workflow."
          : "ATEAM fast pass is ready. Review the output and send it to Una Labs."
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
<<<<<<< HEAD
          : "Unable to record the pack decision."
=======
          : "Unable to save workflow answers."
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
      );
    } finally {
      setBusy("idle");
    }
  }

  function handleContinueToIntake() {
    if (!run?.handoff || Number(run.handoff.version || 0) !== 2) return;
    clearAteamDemoHandoff();
    saveAteamWorkflowHandoff(run.handoff as AteamWorkflowHandoffPayload);
  }

  return (
    <article className="container page-content ateam-page ateam-page--workflow">
      <section className="ateam-section ateam-section--hero">
        <div className="ateam-hero-topline">
          <div className="ateam-hero-mark" aria-hidden="true">
            <img src={ATEAM_BRAND_LOGO_PATH} alt="" width={64} height={64} />
          </div>
          <div className="ateam-hero-heading">
<<<<<<< HEAD
            <p className="eyebrow">Public to operator workflow</p>
            <h1>ATEAM now runs a real intake-to-handoff pass inside Una Labs.</h1>
            <p className="lead">
              Start with one idea. ATEAM will ask focused follow-ups, shape the brief, wait for
              human approval, generate a prototype pack, and carry that run into Una Labs intake.
=======
            <p className="eyebrow">ATEAM fast pass</p>
            <h1>Type one idea. ATEAM turns it into a quick output.</h1>
            <p className="lead">
              Keep it tight. Give ATEAM the idea, answer a couple of clarifiers, and get a compact
              brief, concept direction, and the fastest next move.
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
            </p>
          </div>
        </div>

        <section className="card ateam-workflow-hero-card">
          <div className="ateam-workflow-hero-copy">
<<<<<<< HEAD
            <p className="card-kicker">How this run works</p>
            <h2>Public workflow in front. Operator Mission Control behind it.</h2>
            <ul className="ateam-hero-list">
              <li>The public route no longer depends on localhost.</li>
              <li>Brief approval and pack approval stay human-gated.</li>
              <li>Approved runs create real operator work inside Projects, Office, Pipeline, and Factory.</li>
=======
            <p className="card-kicker">What happens</p>
            <h2>Public input in front. Office and Factory behind it.</h2>
            <ul className="ateam-hero-list">
              <li>ATEAM asks only the shortest clarifiers it needs.</li>
              <li>The brief and pack are built automatically in one fast pass.</li>
              <li>
                {operatorEnabled
                  ? "Operator follow-through stays linked in Office, Team, Factory, and Pipeline."
                  : "Operator follow-through stays inside the internal ATEAM operator system."}
              </li>
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
            </ul>
          </div>
          <div className="ateam-workflow-hero-visual">
            <img
              src={ATEAM_MISSION_CONTROL_PREVIEW_PATH}
              alt="ATEAM Mission Control preview"
              className="ateam-live-summary-image"
            />
          </div>
        </section>

        <div className="ateam-workflow-layout">
          <div className="ateam-workflow-main">
            <section className="card ateam-workflow-step-card">
              <div className="ateam-workflow-step-head">
                <div>
<<<<<<< HEAD
                  <p className="card-kicker">Workflow map</p>
                  <h2>Move one idea from intake to handoff</h2>
=======
                  <p className="card-kicker">Fast path</p>
                  <h2>Move one idea from prompt to output</h2>
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                </div>
                <span className="ateam-demo-pill">
                  {run ? formatWorkflowPhaseLabel(run.phase) : "Not started"}
                </span>
              </div>
              <div className="ateam-workflow-step-rail" aria-label="ATEAM workflow steps">
                {ateamWorkflowSteps.map((step) => {
                  const isActive =
                    (!run && step.key === "idea") ||
                    (run &&
<<<<<<< HEAD
                      ((step.key === "analysis" && !briefReady) ||
                        (step.key === "brief" && briefReady && !briefApproved) ||
                        (step.key === "pack" && briefApproved && !packApproved) ||
                        (step.key === "handoff" && packApproved)));
                  const isComplete =
                    (step.key === "idea" && Boolean(run)) ||
                    (step.key === "analysis" && briefReady) ||
                    (step.key === "brief" && briefApproved) ||
                    (step.key === "pack" && packReady) ||
                    (step.key === "handoff" && packApproved);
=======
                      ((step.key === "analysis" && hasQuestions && !workflowReady) ||
                        (step.key === "brief" && !hasQuestions && !workflowReady) ||
                        (step.key === "pack" && workflowReady)));
                  const isComplete =
                    (step.key === "idea" && Boolean(run)) ||
                    (step.key === "analysis" && Boolean(run?.brief?.summary)) ||
                    (step.key === "brief" && packReady) ||
                    (step.key === "pack" && workflowReady);
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                  return (
                    <div
                      key={step.key}
                      className={`ateam-workflow-step ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
                    >
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card ateam-workflow-step-card">
              <div className="ateam-workflow-step-head">
                <div>
                  <p className="card-kicker">Step 1</p>
                  <h2>Start with the idea</h2>
                </div>
              </div>
<<<<<<< HEAD
=======
              {workflowServiceState === "unavailable" ? (
                <div className="ateam-workflow-offline-note" role="status">
                  Hosted ATEAM workflow is not connected on this environment yet. You can still send the idea straight to Una Labs.
                </div>
              ) : null}
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
              <div className="ateam-workflow-form-grid">
                <label className="ateam-demo-field">
                  <span>Idea prompt</span>
                  <textarea
                    value={idea}
                    onChange={(event) => setIdea(event.target.value)}
                    placeholder="Example: Build a WhatsApp-first vendor ticketing flow that captures requests, routes staff, and shows status back to the customer."
                    rows={5}
                  />
                </label>
                <label className="ateam-demo-field">
                  <span>Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                    {ateamWorkflowCategories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="ateam-workflow-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartRun}
<<<<<<< HEAD
                  disabled={busy !== "idle" && busy !== "loading"}
                >
                  {busy === "starting" ? "Starting run..." : run ? "Restart run from this idea" : "Start ATEAM workflow"}
                </button>
=======
                  disabled={workflowServiceState !== "ready" || (busy !== "idle" && busy !== "loading")}
                >
                  {workflowServiceState === "checking"
                    ? "Checking ATEAM..."
                    : workflowServiceState === "unavailable"
                      ? "Fast pass coming online"
                      : busy === "starting"
                        ? "Starting..."
                        : run
                          ? "Restart fast pass"
                          : "Start fast pass"}
                </button>
                {workflowServiceState === "unavailable" ? (
                  <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                    Start a Project
                  </Link>
                ) : null}
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
              </div>
            </section>

            {run?.questions?.length ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Step 2</p>
<<<<<<< HEAD
                    <h2>Answer ATEAM's follow-up questions</h2>
=======
                    <h2>Answer {quickQuestionLabel}</h2>
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                  </div>
                </div>
                <div className="ateam-workflow-question-list">
                  {run.questions.map((question) => (
                    <label key={question.id} className="ateam-demo-field">
                      <span>{question.prompt}</span>
                      <textarea
                        rows={3}
                        value={answers[question.id] || ""}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value
                          }))
                        }
                        placeholder={question.placeholder || question.hint || ""}
                      />
                      {question.hint ? <small className="ateam-workflow-field-hint">{question.hint}</small> : null}
                    </label>
                  ))}
                </div>
                <div className="ateam-workflow-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitAnswers}
                    disabled={!run || busy !== "idle" || !run.questions.every((question) => String(answers[question.id] || "").trim())}
                  >
<<<<<<< HEAD
                    {busy === "answers" ? "Building brief..." : "Build the brief"}
=======
                    {busy === "answers" || busy === "brief" || busy === "pack" || busy === "handoff"
                      ? "Building fast pass..."
                      : "Build fast pass"}
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                  </button>
                </div>
              </section>
            ) : null}

<<<<<<< HEAD
            {briefReady ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Step 3</p>
                    <h2>Review the generated brief</h2>
                  </div>
                  <span className="ateam-demo-pill">{run?.brief?.recommendedLane || run?.recommendedLane}</span>
=======
            {run && !workflowReady && !hasQuestions ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">ATEAM is working</p>
                    <h2>Office is shaping the brief. Factory is packaging the output.</h2>
                  </div>
                </div>
                <p className="muted">
                  ATEAM is auto-running the brief, pack, and handoff so you do not have to click
                  through every operator gate manually.
                </p>
              </section>
            ) : null}

            {workflowReady ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Output</p>
                    <h2>ATEAM fast pass ready</h2>
                  </div>
                  <span className="ateam-demo-pill">{run?.recommendedLane || run?.brief?.recommendedLane}</span>
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                </div>
                <div className="ateam-workflow-brief-grid">
                  <article className="ateam-workflow-brief-panel">
                    <p className="ateam-workflow-brief-label">Summary</p>
                    <h3>{run?.brief?.title || run?.title}</h3>
                    <p>{run?.brief?.summary}</p>
                    <p className="muted">Audience: {run?.brief?.audience}</p>
                  </article>
                  <article className="ateam-workflow-brief-panel">
<<<<<<< HEAD
                    <p className="ateam-workflow-brief-label">Goals</p>
                    <ul className="ateam-demo-list">
                      {(run?.brief?.goals || []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="ateam-workflow-brief-panel">
                    <p className="ateam-workflow-brief-label">Constraints</p>
                    <ul className="ateam-demo-list">
                      {(run?.brief?.constraints || []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="ateam-workflow-brief-panel">
                    <p className="ateam-workflow-brief-label">Success criteria</p>
                    <ul className="ateam-demo-list">
                      {(run?.brief?.successCriteria || []).map((item) => (
=======
                    <p className="ateam-workflow-brief-label">First move</p>
                    <ul className="ateam-demo-list">
                      {compactNextSteps.map((item) => (
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                </div>
<<<<<<< HEAD
                <div className="ateam-workflow-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleBriefDecision("approved")}
                    disabled={busy !== "idle" || briefApproved}
                  >
                    {busy === "brief" ? "Saving..." : briefApproved ? "Brief approved" : "Approve brief"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleBriefDecision("rejected")}
                    disabled={busy !== "idle"}
                  >
                    Send back to analysis
                  </button>
                </div>
              </section>
            ) : null}

            {briefApproved ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Step 4</p>
                    <h2>Generate and review the pack</h2>
                  </div>
                </div>
                {!packReady ? (
                  <>
                    <p className="muted">
                      Generate the Figma-looking concept screens, the clickable prototype route,
                      the smoke summary, and the operator note from this approved brief.
                    </p>
                    <div className="ateam-workflow-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleGeneratePack}
                        disabled={busy !== "idle"}
                      >
                        {busy === "pack" ? "Generating pack..." : "Generate prototype pack"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ateam-workflow-pack-grid">
                      <article className="ateam-workflow-pack-panel">
                        <p className="ateam-workflow-brief-label">Mockup</p>
                        <h3>{run?.artifacts?.mockup?.title}</h3>
                        <p>{run?.artifacts?.mockup?.summary}</p>
                        <div className="ateam-workflow-screen-grid">
                          {(run?.artifacts?.mockup?.screens || []).map((screen) => (
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
                        <p className="ateam-workflow-brief-label">Clickable prototype</p>
=======
                <div className="ateam-workflow-screen-grid">
                  {compactMockupScreens.map((screen) => (
                    <div key={screen.id} className="ateam-workflow-screen-card">
                      <strong>{screen.title}</strong>
                      <p>{screen.caption}</p>
                    </div>
                  ))}
                </div>
                <div className="ateam-workflow-actions">
                  <Link
                    href="/work-with-ftc?from=ateam"
                    prefetch={false}
                    className="btn btn-primary"
                    onClick={handleContinueToIntake}
                  >
                    Send to Una Labs
                  </Link>
                  {operatorEnabled ? (
                    <Link href={operatorHref} prefetch={false} className="btn btn-secondary">
                      Open operator workflow
                    </Link>
                  ) : null}
                </div>
                <details className="ateam-brief-details">
                  <summary>View full pack</summary>
                  <div className="ateam-brief-body">
                    <div className="ateam-workflow-pack-grid">
                      <article className="ateam-workflow-pack-panel">
                        <p className="ateam-workflow-brief-label">Prototype</p>
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                        <h3>{run?.artifacts?.prototype?.title}</h3>
                        <p>{run?.artifacts?.prototype?.summary}</p>
                        <div className="ateam-workflow-prototype-shell">
                          <div className="ateam-workflow-prototype-tabs">
                            {(run?.artifacts?.prototype?.frames || []).map((frame) => (
                              <button
                                key={frame.id}
                                type="button"
                                className={`ateam-workflow-prototype-tab ${activePrototypeFrame?.id === frame.id ? "is-active" : ""}`}
                                onClick={() => setActivePrototypeFrameId(frame.id)}
                              >
                                {frame.title}
                              </button>
                            ))}
                          </div>
                          {activePrototypeFrame ? (
                            <div className="ateam-workflow-prototype-stage">
                              <div className="ateam-workflow-prototype-window">
                                <div className="ateam-workflow-prototype-window-bar">
                                  <span />
                                  <span />
                                  <span />
                                </div>
                                <div className="ateam-workflow-prototype-window-body">
                                  <p className="card-kicker">{activePrototypeFrame.title}</p>
                                  <h4>{run?.brief?.title || run?.title}</h4>
                                  <p>{activePrototypeFrame.purpose}</p>
                                  <div className="ateam-workflow-prototype-actions">
                                    {activePrototypeFrame.interactions.map((interaction) => (
                                      <button key={interaction} type="button" className="btn btn-secondary">
                                        {interaction}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </article>

                      <article className="ateam-workflow-pack-panel">
                        <p className="ateam-workflow-brief-label">Smoke summary</p>
                        <h3>{run?.artifacts?.smoke?.status?.replaceAll("_", " ")}</h3>
                        <p>{run?.artifacts?.smoke?.summary}</p>
                        <div className="ateam-workflow-smoke-list">
                          {(run?.artifacts?.smoke?.checks || []).map((check) => (
                            <div key={check.label} className="ateam-workflow-smoke-item">
                              <strong>{check.label}</strong>
                              <span>{check.result}</span>
                              <p>{check.note}</p>
                            </div>
                          ))}
                        </div>
                      </article>
<<<<<<< HEAD

                      <article className="ateam-workflow-pack-panel">
                        <p className="ateam-workflow-brief-label">Operator note</p>
                        <h3>{run?.artifacts?.doc?.title}</h3>
                        <p>{run?.artifacts?.doc?.summary}</p>
                        <div className="ateam-workflow-doc-grid">
                          {(run?.artifacts?.doc?.sections || []).map((section) => (
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
                      </article>
                    </div>

                    <div className="ateam-workflow-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handlePackDecision("approved")}
                        disabled={busy !== "idle" || packApproved}
                      >
                        {busy === "handoff" ? "Saving..." : packApproved ? "Pack approved" : "Approve pack"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handlePackDecision("rejected")}
                        disabled={busy !== "idle"}
                      >
                        Send back for revision
                      </button>
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {packApproved ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Step 5</p>
                    <h2>Carry the run into Una Labs</h2>
                  </div>
                </div>
                <p className="muted">
                  This keeps the exact run, brief, generated pack, and next steps attached to the
                  project request form.
                </p>
                <div className="ateam-workflow-actions">
                  <Link
                    href="/work-with-ftc?from=ateam"
                    prefetch={false}
                    className="btn btn-primary"
                    onClick={handleContinueToIntake}
                  >
                    Send to Una Labs
                  </Link>
                  <Link href={operatorHref} prefetch={false} className="btn btn-secondary">
                    Open operator Mission Control
                  </Link>
                </div>
=======
                    </div>
                  </div>
                </details>
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
              </section>
            ) : null}

            {error ? <p className="ateam-demo-error">{error}</p> : null}
            {notice ? <p className="form-feedback success">{notice}</p> : null}
          </div>

          <aside className="ateam-workflow-sidebar">
            <section className="card ateam-workflow-sidebar-card">
              <p className="card-kicker">Run status</p>
              <h3>{run?.brief?.title || "No run yet"}</h3>
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
                  <span>Run id</span>
                  <strong>{run?.id || "--"}</strong>
                </div>
              </div>
            </section>

            {run?.risks?.length ? (
              <section className="card ateam-workflow-sidebar-card">
                <p className="card-kicker">Risk watch</p>
                <ul className="ateam-demo-list">
                  {run.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

<<<<<<< HEAD
            {run?.links?.workItemIds?.length ? (
=======
            {operatorEnabled && run?.links?.workItemIds?.length ? (
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
              <section className="card ateam-workflow-sidebar-card">
                <p className="card-kicker">Operator linkage</p>
                <p className="muted">
                  {run.links.workItemIds.length} work item{run.links.workItemIds.length === 1 ? "" : "s"} already created in the operator system.
                </p>
                <Link href={operatorHref} prefetch={false} className="btn btn-secondary">
<<<<<<< HEAD
                  Open Projects / Factory
=======
                  Open Office / Team / Factory / Pipeline
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </article>
  );
}
