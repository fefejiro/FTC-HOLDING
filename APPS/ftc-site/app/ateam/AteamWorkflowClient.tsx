"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ATEAM_BRAND_LOGO_PATH,
  ATEAM_MISSION_CONTROL_PREVIEW_PATH
} from "../../lib/ateamEmbed";
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

  const runId = String(searchParams.get("run") || "").trim();

  useEffect(() => {
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

  const briefReady = Boolean(run?.brief?.summary);
  const briefApproved = String(run?.approvals?.brief?.status || "").toLowerCase() === "approved";
  const packReady = Boolean(run?.artifacts?.prototype?.frames?.length);
  const packApproved = String(run?.approvals?.pack?.status || "").toLowerCase() === "approved";
  const operatorHref = run?.links?.projectId
    ? `/ateam/operator/projects?workflowRunId=${encodeURIComponent(run.id)}`
    : "/ateam/operator/projects";
  const activePrototypeFrame =
    run?.artifacts?.prototype?.frames?.find((frame) => frame.id === activePrototypeFrameId) ||
    run?.artifacts?.prototype?.frames?.[0] ||
    null;

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
      setNotice("ATEAM opened a workflow run and generated the first follow-up questions.");
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
      const payload = await requestJson<{ ok: true; run: WorkflowRun }>(
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/answers`,
        {
          method: "POST",
          body: JSON.stringify({ answers })
        }
      );
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
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            gate: "brief",
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
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/generate-pack`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );
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
        `/api/ateam/workflow/runs/${encodeURIComponent(run.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            gate: "pack",
            decision
          })
        }
      );
      await syncRun(payload.run);
      setNotice(
        decision === "approved"
          ? "Pack approved. You can now carry this run straight into Una Labs intake."
          : "Pack sent back for another pass. Adjust the scope or regenerate once the brief is tighter."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record the pack decision."
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
            <p className="eyebrow">Public to operator workflow</p>
            <h1>ATEAM now runs a real intake-to-handoff pass inside Una Labs.</h1>
            <p className="lead">
              Start with one idea. ATEAM will ask focused follow-ups, shape the brief, wait for
              human approval, generate a prototype pack, and carry that run into Una Labs intake.
            </p>
          </div>
        </div>

        <section className="card ateam-workflow-hero-card">
          <div className="ateam-workflow-hero-copy">
            <p className="card-kicker">How this run works</p>
            <h2>Public workflow in front. Operator Mission Control behind it.</h2>
            <ul className="ateam-hero-list">
              <li>The public route no longer depends on localhost.</li>
              <li>Brief approval and pack approval stay human-gated.</li>
              <li>Approved runs create real operator work inside Projects, Office, Pipeline, and Factory.</li>
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
                  <p className="card-kicker">Workflow map</p>
                  <h2>Move one idea from intake to handoff</h2>
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
                  disabled={busy !== "idle" && busy !== "loading"}
                >
                  {busy === "starting" ? "Starting run..." : run ? "Restart run from this idea" : "Start ATEAM workflow"}
                </button>
              </div>
            </section>

            {run?.questions?.length ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Step 2</p>
                    <h2>Answer ATEAM's follow-up questions</h2>
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
                    {busy === "answers" ? "Building brief..." : "Build the brief"}
                  </button>
                </div>
              </section>
            ) : null}

            {briefReady ? (
              <section className="card ateam-workflow-step-card">
                <div className="ateam-workflow-step-head">
                  <div>
                    <p className="card-kicker">Step 3</p>
                    <h2>Review the generated brief</h2>
                  </div>
                  <span className="ateam-demo-pill">{run?.brief?.recommendedLane || run?.recommendedLane}</span>
                </div>
                <div className="ateam-workflow-brief-grid">
                  <article className="ateam-workflow-brief-panel">
                    <p className="ateam-workflow-brief-label">Summary</p>
                    <h3>{run?.brief?.title || run?.title}</h3>
                    <p>{run?.brief?.summary}</p>
                    <p className="muted">Audience: {run?.brief?.audience}</p>
                  </article>
                  <article className="ateam-workflow-brief-panel">
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
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                </div>
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

            {run?.links?.workItemIds?.length ? (
              <section className="card ateam-workflow-sidebar-card">
                <p className="card-kicker">Operator linkage</p>
                <p className="muted">
                  {run.links.workItemIds.length} work item{run.links.workItemIds.length === 1 ? "" : "s"} already created in the operator system.
                </p>
                <Link href={operatorHref} prefetch={false} className="btn btn-secondary">
                  Open Projects / Factory
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </article>
  );
}
