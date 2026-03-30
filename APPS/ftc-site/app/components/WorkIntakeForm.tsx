"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";
import type { AteamDemoHandoffPayload, AteamWorkflowHandoffPayload } from "../../lib/ateamHandoff";
import { engagementOffers } from "../../lib/engagementOffers";
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

const engagementTypeOptions = [
  ...engagementOffers.map((offer) => ({ value: offer.value, label: offer.title })),
  { value: "not-sure-yet", label: "Not sure yet" }
] as const;

const businessTypeOptions = [
  { value: "local-services-business", label: "Local service business" },
  { value: "startup-founder-led", label: "Startup / founder-led" },
  { value: "internal-operations-team", label: "Internal operations team" },
  { value: "product-team", label: "Product team" },
  { value: "other", label: "Other" }
] as const;

const mainGoalOptions = [
  { value: "get-more-leads", label: "Get more leads" },
  { value: "launch-something-fast", label: "Launch something fast" },
  { value: "clarify-product-direction", label: "Clarify the product direction" },
  { value: "fix-a-workflow", label: "Fix a workflow or internal process" },
  { value: "improve-operations-visibility", label: "Improve operations visibility" },
  { value: "other", label: "Other" }
] as const;

const urgencyOptions = [
  { value: "need-direction-this-week", label: "Need direction this week" },
  { value: "need-movement-this-month", label: "Need movement this month" },
  { value: "planning-next-quarter", label: "Planning next quarter" },
  { value: "just-exploring", label: "Just exploring" }
] as const;

const buyerReadinessOptions = [
  { value: "ready-to-start-after-scope", label: "Ready to start after scope" },
  { value: "need-help-deciding-approach", label: "Need help deciding approach" },
  { value: "need-internal-alignment-first", label: "Need internal alignment first" }
] as const;

const timelineOptions = [
  { value: "", label: "Not sure yet" },
  { value: "2-4-weeks", label: "2-4 weeks" },
  { value: "4-8-weeks", label: "4-8 weeks" },
  { value: "8-12-weeks", label: "8-12 weeks" },
  { value: "12-weeks-plus", label: "12+ weeks" }
] as const;

const budgetOptions = [
  { value: "not-sure-yet", label: "Not sure yet" },
  { value: "0-1000", label: "$0 - $1,000" },
  { value: "1000-2500", label: "$1,000 - $2,500" },
  { value: "2500-5000", label: "$2,500 - $5,000" },
  { value: "5000-10000", label: "$5,000 - $10,000" },
  { value: "10000-plus", label: "$10,000+" }
] as const;

function getOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

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

type WorkIntakeFormProps = {
  initialEngagementType?: string;
};

export default function WorkIntakeForm({
  initialEngagementType = "not-sure-yet"
}: WorkIntakeFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [projectBrief, setProjectBrief] = useState("");
  const [projectType, setProjectType] = useState<string>("Not sure yet");
  const [prefill, setPrefill] = useState<PrefillState>(null);
  const [prefillChecked, setPrefillChecked] = useState(false);
  const [successSummary, setSuccessSummary] = useState<{
    requestId: string;
    email: string;
    projectName: string;
    projectBrief: string;
    projectType: string;
    engagementType: string;
    urgency: string;
    confirmationSent?: boolean;
  } | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const hasTrackedViewRef = useRef(false);
  const isWorkflowPrefill = prefill?.kind === "workflow";

  useEffect(() => {
    const workflowHandoff = loadAteamWorkflowHandoff();
    if (workflowHandoff) {
      setPrefill({ kind: "workflow", value: workflowHandoff });
      setProjectType(workflowHandoff.recommendedLane || workflowHandoff.categoryLabel || "Not sure yet");
      setProjectBrief((existing) => (existing ? existing : buildWorkflowPrefilledBrief(workflowHandoff)));
      setPrefillChecked(true);
      return;
    }

    const demoHandoff = loadAteamDemoHandoff<AteamDemoOutput>();
    if (!demoHandoff) {
      setPrefillChecked(true);
      return;
    }
    setPrefill({ kind: "demo", value: demoHandoff });
    setProjectType(demoHandoff.output?.recommendedLane ?? demoHandoff.categoryLabel ?? "Not sure yet");
    setProjectBrief((existing) => (existing ? existing : buildDemoPrefilledBrief(demoHandoff)));
    setPrefillChecked(true);
  }, []);

  useEffect(() => {
    if (!prefillChecked || hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackEvent("intake_form_view", {
      source:
        prefill?.kind === "workflow"
          ? "ateam_workflow"
          : prefill?.kind === "demo"
            ? "ateam_demo"
            : "direct",
      project_type: projectType || "not-specified",
    });
  }, [prefillChecked, prefill, projectType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const trimmedBrief = String(projectBrief || "").trim();
    const projectName = String(formData.get("projectName") || "").trim();
    const trimmedProjectType = String(projectType || "Not sure yet").trim();
    const engagementType = String(formData.get("engagementType") || "not-sure-yet").trim();
    const businessType = String(formData.get("businessType") || "other").trim();
    const mainGoal = String(formData.get("mainGoal") || "other").trim();
    const urgency = String(formData.get("urgency") || "just-exploring").trim();
    const buyerReadiness = String(formData.get("buyerReadiness") || "need-help-deciding-approach").trim();

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
      engagementType,
      businessType,
      mainGoal,
      urgency,
      buyerReadiness,
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

    trackEvent("lead_submit_attempt", {
      source:
        prefill?.kind === "workflow"
          ? "ateam_workflow"
          : prefill?.kind === "demo"
            ? "ateam_demo"
            : "direct",
      project_type: payload.projectType || "not-specified",
      engagement_type: payload.engagementType,
      business_type: payload.businessType,
      main_goal: payload.mainGoal,
      urgency: payload.urgency,
      buyer_readiness: payload.buyerReadiness,
      budget_range: payload.budgetRange,
      timeline: payload.timeline || "not-specified"
    });

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
          engagementType: getOptionLabel(engagementTypeOptions, payload.engagementType),
          urgency: getOptionLabel(urgencyOptions, payload.urgency),
          confirmationSent: body.confirmationSent
        });
      }
      trackEvent("lead_submit_success", {
        source:
          prefill?.kind === "workflow"
            ? "ateam_workflow"
            : prefill?.kind === "demo"
              ? "ateam_demo"
              : "direct",
        project_type: payload.projectType || "not-specified",
        engagement_type: payload.engagementType,
        business_type: payload.businessType,
        main_goal: payload.mainGoal,
        urgency: payload.urgency,
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
      trackEvent("lead_submit_error", {
        source:
          prefill?.kind === "workflow"
            ? "ateam_workflow"
            : prefill?.kind === "demo"
              ? "ateam_demo"
              : "direct",
        project_type: payload.projectType || "not-specified",
        engagement_type: payload.engagementType,
      });
    }
  }

  if (submitState === "success" && successSummary) {
    return (
      <div className="intake-success" role="status" aria-live="polite">
        <div className="intake-success-card">
          <p className="eyebrow">Request received</p>
          <h3>Una Labs has your setup brief.</h3>
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
              <span className="intake-success-label">Offer</span>
              <span className="intake-success-value">{successSummary.engagementType}</span>
            </div>
            <div>
              <span className="intake-success-label">Urgency</span>
              <span className="intake-success-value">{successSummary.urgency}</span>
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
      <div className="intake-form-intro">
        <p className="intake-form-intro-title">This is not a generic inquiry form.</p>
        <p>
          We use this request to decide the shortest credible path: scoped first pass,
          prototype direction sprint, or build execution.
        </p>
      </div>

      {isWorkflowPrefill && prefill?.kind === "workflow" ? (
        <div className="intake-prefill-card">
          <div className="intake-prefill-card-head">
            <div>
              <p className="card-kicker">ATEAM handoff attached</p>
              <h3>{prefill.value.recommendedLane}</h3>
              <p className="muted">
                {prefill.value.brief.quickVerdict || "Go for a scoped first pass"}.{" "}
                {prefill.value.brief.recommendedDirection || prefill.value.brief.summary}
              </p>
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
      </div>

      <div className="intake-form-grid">
        <label>
          <span>What do you need most right now?</span>
          <select name="engagementType" defaultValue={initialEngagementType} className="dark-select">
            {engagementTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>What kind of business or team is this?</span>
          <select name="businessType" defaultValue="other" className="dark-select">
            {businessTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="intake-form-grid">
        <label>
          <span>What outcome matters most?</span>
          <select name="mainGoal" defaultValue="other" className="dark-select">
            {mainGoalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>How ready are you to move?</span>
          <select name="buyerReadiness" defaultValue="need-help-deciding-approach" className="dark-select">
            {buyerReadinessOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="intake-form-grid">
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
          <span>Best-fit lane</span>
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
          <span className="field-help">Use this if you already know which kind of system you need.</span>
        </label>
      </div>

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
        {isWorkflowPrefill ? (
          <div className="intake-prefill-note">
            The ATEAM brief is already attached. Tighten it only if you want to improve the wording.
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
          placeholder="Describe the project, what success looks like, and what should happen next."
        />
      </div>

      {isWorkflowPrefill && prefill?.kind === "workflow" ? (
        <details className="ateam-brief-details">
          <summary>Review attached ATEAM pack</summary>
          <div className="ateam-brief-body">
            <p className="muted">
              Run: {prefill.value.runId} / Category: {prefill.value.categoryLabel} / Lane:{" "}
              {prefill.value.recommendedLane}
            </p>
            <div className="ateam-brief-grid">
              <div>
                <p className="ateam-brief-title">Quick read</p>
                <p>{prefill.value.brief.summary}</p>
                <p className="muted">{prefill.value.brief.likelyUserValue}</p>
              </div>
              <div>
                <p className="ateam-brief-title">Generated pack</p>
                <ul className="ateam-brief-list">
                  <li>{prefill.value.artifacts.mockupTitle}</li>
                  <li>{prefill.value.artifacts.prototypeTitle}</li>
                  <li>{prefill.value.artifacts.docTitle}</li>
                </ul>
              </div>
            </div>
          </div>
        </details>
      ) : null}

      <div className="intake-form-grid intake-form-grid--triple">
        <label>
          <span>Budget range</span>
          <select name="budgetRange" defaultValue="not-sure-yet" className="dark-select">
            {budgetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="field-help">
            Small, sharply scoped launches often start with a credible phase-one build.
          </span>
        </label>
        <label>
          <span>Timeline</span>
          <select name="timeline" defaultValue="" className="dark-select">
            {timelineOptions.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>How urgent is this?</span>
          <select name="urgency" defaultValue="just-exploring" className="dark-select">
            {urgencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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

      <label className="hp-field" aria-hidden="true">
        Company Website
        <input type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting"
          ? "Submitting..."
          : isWorkflowPrefill
            ? "Continue with Una Labs"
            : "Submit project request"}
      </button>

      <div className="intake-next-steps">
        <p className="intake-next-steps-title">What happens after you submit</p>
        <ol className="intake-next-steps-list">
          <li>We review the request and any attached ATEAM context, usually within 1 business day.</li>
          <li>We reply with the shortest credible next move, offer fit, and any missing clarifiers.</li>
          <li>If the fit is right, we move into a scoped first pass, a short kickoff call, or build setup.</li>
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
