"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "../../lib/analytics";
import type { AteamDemoHandoffPayload, AteamWorkflowHandoffPayload } from "../../lib/ateamHandoff";
import {
  clearAteamDemoHandoff,
  clearAteamWorkflowHandoff,
  loadAteamDemoHandoff,
  loadAteamWorkflowHandoff
} from "../../lib/ateamHandoff";

type SubmitState = "idle" | "submitting" | "success" | "error";

type AteamDemoOutput = {
  summary: string;
  recommendedLane?: string;
  recommendedDirection: string;
  phases: string[];
  stack: string[];
  deliverables: string[];
  nextSteps: string[];
};

type PrefillState =
  | { kind: "workflow"; value: AteamWorkflowHandoffPayload }
  | { kind: "demo"; value: AteamDemoHandoffPayload<AteamDemoOutput> }
  | null;

const projectTypeOptions = [
  "Fast Website Launch",
  "Local Services Lead Engine",
  "AI Workflow / Product Direction",
  "Product / App Build Path",
  "Internal Tool / Ops System",
  "Not sure yet"
] as const;

function buildDemoPrefilledBrief(prefill: AteamDemoHandoffPayload<AteamDemoOutput>) {
  const lines = [
    `Idea: ${prefill.idea}`,
    `Lane: ${prefill.output?.recommendedLane ?? prefill.categoryLabel}`,
    `Summary: ${prefill.output?.summary ?? ""}`,
    `Direction: ${prefill.output?.recommendedDirection ?? ""}`,
    `Deliverables: ${(prefill.output?.deliverables ?? []).slice(0, 3).join(", ")}`
  ];

  return lines.join("\n").trim();
}

function buildWorkflowPrefilledBrief(prefill: AteamWorkflowHandoffPayload) {
  const lines = [
    `Idea: ${prefill.idea}`,
    `ATEAM run: ${prefill.runId}`,
    `Lane: ${prefill.recommendedLane}`,
    `Quick read: ${prefill.brief.quickVerdict || "Go for a scoped first pass"}`,
    `Summary: ${prefill.brief.summary}`,
    `Primary goal: ${prefill.brief.primaryGoal}`,
    `Likely value: ${prefill.brief.likelyUserValue || ""}`,
    `Recommended direction: ${prefill.brief.recommendedDirection || ""}`,
    `Output pack: ${prefill.artifacts.mockupTitle}; ${prefill.artifacts.prototypeTitle}.`,
    `Next step: ${(prefill.nextSteps ?? [])[0] || "Review the pack and decide the fastest scoped next move."}`
  ];

  return lines.join("\n").trim();
}

export default function WorkIntakeForm() {
  const searchParams = useSearchParams();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [projectBrief, setProjectBrief] = useState("");
  const [projectType, setProjectType] = useState<string>("Not sure yet");
  const [prefill, setPrefill] = useState<PrefillState>(null);
  const [successSummary, setSuccessSummary] = useState<{
    requestId: string;
    email: string;
    projectName: string;
    projectBrief: string;
    projectType: string;
    budgetRange: string;
    timeline: string;
    confirmationSent?: boolean;
  } | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const isWorkflowPrefill = prefill?.kind === "workflow";
  const isAteamRoute = String(searchParams.get("from") || "").trim().toLowerCase() === "ateam";
  const useWorkflowFastPass = isWorkflowPrefill && isAteamRoute;

  useEffect(() => {
    const workflowHandoff = loadAteamWorkflowHandoff();
    if (workflowHandoff) {
      setPrefill({ kind: "workflow", value: workflowHandoff });
      setProjectType(workflowHandoff.recommendedLane || workflowHandoff.categoryLabel || "Not sure yet");
      setProjectBrief((existing) => (existing ? existing : buildWorkflowPrefilledBrief(workflowHandoff)));
      return;
    }

    const demoHandoff = loadAteamDemoHandoff<AteamDemoOutput>();
    if (!demoHandoff) return;
    setPrefill({ kind: "demo", value: demoHandoff });
    setProjectType(demoHandoff.output?.recommendedLane ?? demoHandoff.categoryLabel ?? "Not sure yet");
    setProjectBrief((existing) => (existing ? existing : buildDemoPrefilledBrief(demoHandoff)));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const trimmedBrief = String(projectBrief || "").trim();
    const projectName = String(formData.get("projectName") || "").trim();
    const trimmedProjectType = String(projectType || "Not sure yet").trim();

    if (trimmedBrief.length < 20) {
      setSubmitState("error");
      setMessage("Add a bit more detail so we can scope the fastest next step (20+ characters).");
      trackEvent("lead_submit_error", { reason: "client_validation_projectBrief" });
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      projectName,
      projectType: trimmedProjectType,
      projectIdea: trimmedBrief,
      budgetRange: String(formData.get("budgetRange") || "not-sure-yet"),
      timeline: String(formData.get("timeline") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      companyWebsite: String(formData.get("companyWebsite") || "").trim(),
      startedAt: startedAtRef.current,
      ateamDemo:
        prefill?.kind === "demo"
          ? {
              idea: prefill.value.idea,
              category: {
                value: prefill.value.categoryValue,
                label: prefill.value.categoryLabel
              },
              output: prefill.value.output
            }
          : undefined,
      ateamWorkflow: prefill?.kind === "workflow" ? prefill.value : undefined
    };

    setSubmitState("submitting");
    setMessage("");
    setSuccessSummary(null);

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        requestId?: string;
        confirmationSent?: boolean;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Unable to submit project intake.");
      }

      setSubmitState("success");
      setMessage(body.message || "Thanks, your project intake has been received.");
      const requestId = String(body.requestId || "").trim();
      if (requestId) {
        setSuccessSummary({
          requestId,
          email: payload.email,
          projectName: payload.projectName,
          projectBrief: payload.projectIdea,
          projectType: payload.projectType,
          budgetRange: payload.budgetRange,
          timeline: payload.timeline,
          confirmationSent: body.confirmationSent
        });
      }
      trackEvent("lead_submit_success", {
        project_type: payload.projectType || "not-specified",
        budget_range: payload.budgetRange,
        timeline: payload.timeline || "not-specified"
      });

      if (prefill) {
        if (prefill.kind === "workflow") {
          clearAteamWorkflowHandoff();
        } else {
          clearAteamDemoHandoff();
        }
        setPrefill(null);
      }

      form.reset();
      setProjectBrief("");
      setProjectType("Not sure yet");
      startedAtRef.current = Date.now();
    } catch (error) {
      setSubmitState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Submission failed. Please try again in a few minutes."
      );
      trackEvent("lead_submit_error");
    }
  }

  if (submitState === "success" && successSummary) {
    return (
      <div className="intake-success" role="status" aria-live="polite">
        <div className="intake-success-card">
          <p className="eyebrow">Request received</p>
          <h3>Una Labs has your project brief.</h3>
          <p className="muted">Expected reply: within 1 business day.</p>
          <div className="intake-success-meta">
            <div>
              <span className="intake-success-label">Reference</span>
              <span className="intake-success-value">{successSummary.requestId}</span>
            </div>
            <div>
              <span className="intake-success-label">Email</span>
              <span className="intake-success-value">{successSummary.email}</span>
            </div>
            <div>
              <span className="intake-success-label">Project type</span>
              <span className="intake-success-value">{successSummary.projectType}</span>
            </div>
            <div>
              <span className="intake-success-label">Budget</span>
              <span className="intake-success-value">{successSummary.budgetRange}</span>
            </div>
          </div>
          <div className="intake-success-brief">
            <p className="intake-success-label">Submitted summary</p>
            <p>
              {successSummary.projectName ? `${successSummary.projectName}: ` : ""}
              {successSummary.projectBrief}
            </p>
          </div>
          {successSummary.confirmationSent ? (
            <p className="muted">Confirmation email sent.</p>
          ) : (
            <p className="muted">
              Need to add context before we reply? Email{" "}
              <a href="mailto:hello@unalabs.cloud" className="inline-link">
                hello@unalabs.cloud
              </a>
              .
            </p>
          )}
          <div className="intake-success-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubmitState("idle");
                setMessage("");
                setSuccessSummary(null);
                startedAtRef.current = Date.now();
              }}
            >
              Submit another request
            </button>
            <Link href="/work" prefetch={false} className="btn btn-secondary">
              View Client Launches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="intake-form" onSubmit={onSubmit} noValidate>
      <div className="intake-form-grid">
        <label>
          <span>Name</span>
          <input type="text" name="name" autoComplete="name" placeholder="Your name" />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="hello@company.com"
            required
          />
        </label>
        {!isWorkflowPrefill ? (
          <>
            <label>
              <span>Company or project name</span>
              <input
                type="text"
                name="projectName"
                autoComplete="organization"
                placeholder="Business name, product, or project title"
              />
            </label>
            <label>
              <span>Project type</span>
              <select
                name="projectType"
                value={projectType}
                onChange={(event) => setProjectType(event.target.value)}
                className="dark-select"
              >
                {projectTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      {isWorkflowPrefill && prefill?.kind === "workflow" ? (
        <div className="intake-prefill-card">
          <div className="intake-prefill-card-head">
            <div>
              <p className="card-kicker">{useWorkflowFastPass ? "ATEAM handoff attached" : "ATEAM fast pass attached"}</p>
              <h3>{prefill.value.recommendedLane}</h3>
              <p className="muted">
                {prefill.value.brief.quickVerdict || "Go for a scoped first pass"}.
                {" "}
                {prefill.value.brief.recommendedDirection || prefill.value.brief.summary}
              </p>
              {useWorkflowFastPass ? (
                <p className="muted">No need to rewrite the idea. ATEAM already attached the brief and output pack.</p>
              ) : null}
            </div>
            <button
              type="button"
              className="intake-prefill-clear"
              onClick={() => {
                clearAteamWorkflowHandoff();
                setPrefill(null);
              }}
            >
              Clear
            </button>
          </div>

          <div className="intake-prefill-chip-row" aria-label="Attached ATEAM pack summary">
            <span className="intake-prefill-chip">{prefill.value.categoryLabel}</span>
            <span className="intake-prefill-chip">{prefill.value.artifacts.mockupTitle}</span>
            <span className="intake-prefill-chip">{prefill.value.artifacts.prototypeTitle}</span>
          </div>
        </div>
      ) : null}

      {!isWorkflowPrefill ? (
        <div className="intake-field-group">
          <label htmlFor="project-brief">
            <span>Project brief</span>
          </label>
          {prefill && prefill.kind === "demo" ? (
            <div className="intake-prefill-note">
              ATEAM demo output is attached. Edit anything before submitting.
              <button
                type="button"
                className="intake-prefill-clear"
                onClick={() => {
                  clearAteamDemoHandoff();
                  setPrefill(null);
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
          <textarea
            id="project-brief"
            name="projectIdea"
            rows={8}
            required
            minLength={20}
            value={projectBrief}
            onChange={(event) => setProjectBrief(event.target.value)}
            placeholder="Describe the project, what success looks like, and anything that should happen next."
          />
        </div>
      ) : (
        <>
          <input type="hidden" name="projectType" value={projectType} />
          <input
            type="hidden"
            name="projectName"
            value={prefill?.value.brief.title || prefill?.value.recommendedLane || "ATEAM handoff"}
          />
          {useWorkflowFastPass ? (
            <input type="hidden" name="projectIdea" value={projectBrief} />
          ) : null}
          <details className="ateam-brief-details" open={!useWorkflowFastPass}>
            <summary>{useWorkflowFastPass ? "Review or edit attached ATEAM brief" : "Review attached ATEAM pack"}</summary>
            <div className="ateam-brief-body">
              <p className="muted">
                Run: {prefill?.value.runId} / Category: {prefill?.value.categoryLabel} / Lane:{" "}
                {prefill?.value.recommendedLane}
              </p>
              <div className="ateam-brief-grid">
                <div>
                  <p className="ateam-brief-title">Quick read</p>
                  <p>{prefill?.value.brief.summary}</p>
                  <p className="muted">{prefill?.value.brief.likelyUserValue}</p>
                </div>
                <div>
                  <p className="ateam-brief-title">Generated pack</p>
                  <ul className="ateam-brief-list">
                    <li>{prefill?.value.artifacts.mockupTitle}</li>
                    <li>{prefill?.value.artifacts.prototypeTitle}</li>
                    <li>{prefill?.value.artifacts.docTitle}</li>
                  </ul>
                </div>
              </div>

              {useWorkflowFastPass ? (
                <div className="intake-prefill-note">
                  The ATEAM brief will be sent automatically. Only open this if you want to adjust the wording before submission.
                  <label className="intake-workflow-edit" htmlFor="project-brief">
                    <span>Edit attached brief</span>
                  </label>
                  <textarea
                    id="project-brief"
                    name="projectIdeaEdit"
                    rows={6}
                    value={projectBrief}
                    onChange={(event) => setProjectBrief(event.target.value)}
                    placeholder="ATEAM prefilled this brief. Tweak anything before sending."
                  />
                </div>
              ) : (
                <>
                  <label className="intake-workflow-edit" htmlFor="project-brief">
                    <span>Edit attached brief if needed</span>
                  </label>
                  <textarea
                    id="project-brief"
                    name="projectIdea"
                    rows={6}
                    required
                    minLength={20}
                    value={projectBrief}
                    onChange={(event) => setProjectBrief(event.target.value)}
                    placeholder="ATEAM prefilled this brief. Tweak anything before sending."
                  />
                </>
              )}
            </div>
          </details>

          <details className="ateam-brief-details">
            <summary>{useWorkflowFastPass ? "Add optional timeline, budget, or notes" : "Add project name, timeline, budget, or notes"}</summary>
            <div className="ateam-brief-body">
              <div className="intake-form-grid">
                {useWorkflowFastPass ? null : (
                  <label>
                    <span>Company or project name</span>
                    <input
                      type="text"
                      name="projectName"
                      autoComplete="organization"
                      placeholder="Optional project or company name"
                    />
                  </label>
                )}
                <label>
                  <span>Timeline</span>
                  <select name="timeline" defaultValue="" className="dark-select">
                    <option value="">Not sure yet</option>
                    <option value="2-4-weeks">2-4 weeks</option>
                    <option value="4-8-weeks">4-8 weeks</option>
                    <option value="8-12-weeks">8-12 weeks</option>
                    <option value="12-weeks-plus">12+ weeks</option>
                  </select>
                </label>
                <label>
                  <span>Budget range</span>
                  <select name="budgetRange" defaultValue="not-sure-yet" className="dark-select">
                    <option value="not-sure-yet">Not sure yet</option>
                    <option value="0-1000">$0 - $1,000</option>
                    <option value="1000-2500">$1,000 - $2,500</option>
                    <option value="2500-5000">$2,500 - $5,000</option>
                    <option value="5000-10000">$5,000 - $10,000</option>
                    <option value="10000-plus">$10,000+</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Optional notes</span>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Anything else we should know about urgency, approvals, constraints, or existing systems?"
                />
              </label>
            </div>
          </details>
        </>
      )}

      {!isWorkflowPrefill ? (
        <>
          <div className="intake-form-grid">
            <label>
              <span>Timeline</span>
              <select name="timeline" defaultValue="" className="dark-select">
                <option value="">Not sure yet</option>
                <option value="2-4-weeks">2-4 weeks</option>
                <option value="4-8-weeks">4-8 weeks</option>
                <option value="8-12-weeks">8-12 weeks</option>
                <option value="12-weeks-plus">12+ weeks</option>
              </select>
            </label>
            <label>
              <span>Budget range</span>
              <select name="budgetRange" defaultValue="not-sure-yet" className="dark-select">
                <option value="not-sure-yet">Not sure yet</option>
                <option value="0-1000">$0 - $1,000</option>
                <option value="1000-2500">$1,000 - $2,500</option>
                <option value="2500-5000">$2,500 - $5,000</option>
                <option value="5000-10000">$5,000 - $10,000</option>
                <option value="10000-plus">$10,000+</option>
              </select>
              <span className="field-help">
                Small, sharply scoped launches often start with a credible phase-one build.
              </span>
            </label>
          </div>

          <label>
            <span>Optional notes</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Anything else we should know about urgency, constraints, approvals, or existing tools?"
            />
          </label>
        </>
      ) : null}

      <label className="hp-field" aria-hidden="true">
        Company Website
        <input type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting"
          ? "Submitting..."
          : isWorkflowPrefill
            ? useWorkflowFastPass
              ? "Send ATEAM handoff"
              : "Continue with Una Labs"
            : "Submit project request"}
      </button>

      <div className="intake-next-steps">
        <p className="intake-next-steps-title">What happens after you submit:</p>
        <ol className="intake-next-steps-list">
          <li>We review the request and attached context, usually within 1 business day.</li>
          <li>We reply with a scoped next step, recommended phase one, and any clarifying questions.</li>
          <li>If the fit is right, we move into setup or a short kickoff call.</li>
        </ol>
        <p className="intake-alt-contact">
          Prefer direct email?{" "}
          <a href="mailto:hello@unalabs.cloud" className="inline-link">
            hello@unalabs.cloud
          </a>
        </p>
      </div>

      {message ? (
        <p className={`intake-message ${submitState === "error" ? "error" : "success"}`}>{message}</p>
      ) : null}
    </form>
  );
}
