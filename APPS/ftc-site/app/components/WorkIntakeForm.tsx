"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";
import type { AteamDemoHandoffPayload } from "../../lib/ateamHandoff";
import { clearAteamDemoHandoff, loadAteamDemoHandoff } from "../../lib/ateamHandoff";

type SubmitState = "idle" | "submitting" | "success" | "error";

type AteamDemoOutput = {
  summary: string;
  recommendedDirection: string;
  phases: string[];
  stack: string[];
  deliverables: string[];
  nextSteps: string[];
};

export default function WorkIntakeForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [projectIdea, setProjectIdea] = useState("");
  const [prefill, setPrefill] = useState<AteamDemoHandoffPayload<AteamDemoOutput> | null>(null);
  const [successSummary, setSuccessSummary] = useState<{
    requestId: string;
    email: string;
    projectIdea: string;
    budgetRange: string;
    timeline: string;
    confirmationSent?: boolean;
  } | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const handoff = loadAteamDemoHandoff<AteamDemoOutput>();
    if (!handoff) return;
    setPrefill(handoff);
    setProjectIdea((existing) => (existing ? existing : handoff.idea || ""));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const trimmedIdea = String(projectIdea || "").trim();
    if (trimmedIdea.length < 20) {
      setSubmitState("error");
      setMessage("Add a bit more detail so we can scope the fastest next step (20+ characters).");
      trackEvent("lead_submit_error", { reason: "client_validation_projectIdea" });
      return;
    }

    const payload = {
      name: "Website lead",
      email: String(formData.get("email") || "").trim(),
      projectIdea: trimmedIdea,
      budgetRange: String(formData.get("budgetRange") || "not-sure-yet"),
      timeline: String(formData.get("timeline") || "").trim(),
      companyWebsite: String(formData.get("companyWebsite") || "").trim(),
      startedAt: startedAtRef.current,
      ateamDemo: prefill
        ? {
            idea: prefill.idea,
            category: {
              value: prefill.categoryValue,
              label: prefill.categoryLabel
            },
            output: prefill.output
          }
        : undefined
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
          projectIdea: payload.projectIdea,
          budgetRange: payload.budgetRange,
          timeline: payload.timeline,
          confirmationSent: body.confirmationSent
        });
      }
      trackEvent("lead_submit_success", {
        budget_range: payload.budgetRange,
        timeline: payload.timeline || "not-specified"
      });
      // Clear ATEAM handoff once we have a successful submission.
      if (prefill) {
        clearAteamDemoHandoff();
        setPrefill(null);
      }
      form.reset();
      setProjectIdea("");
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
          </div>
          <div className="intake-success-brief">
            <p className="intake-success-label">Summary</p>
            <p>{successSummary.projectIdea}</p>
          </div>
          {successSummary.confirmationSent ? (
            <p className="muted">Confirmation email sent.</p>
          ) : null}
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
      <label>
        <span>What do you need help with?</span>
        {prefill ? (
          <div className="intake-prefill-note">
            Prefilled from your ATEAM demo. Edit anything before submitting.
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
          name="projectIdea"
          rows={6}
          required
          minLength={20}
          value={projectIdea}
          onChange={(event) => setProjectIdea(event.target.value)}
          placeholder={
            "Example:\n- I want to build a mobile app\n- I need AI automation for my business\n- I want a tool similar to X"
          }
        />
      </label>
      {prefill ? (
        <details className="ateam-brief-details">
          <summary>ATEAM demo brief attached</summary>
          <div className="ateam-brief-body">
            <p className="muted">Category: {prefill.categoryLabel}</p>
            <div className="ateam-brief-grid">
              <div>
                <p className="ateam-brief-title">Summary</p>
                <p>{prefill.output?.summary}</p>
                <p className="muted">{prefill.output?.recommendedDirection}</p>
              </div>
              <div>
                <p className="ateam-brief-title">Phases</p>
                <ul className="ateam-brief-list">
                  {(prefill.output?.phases ?? []).slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="ateam-brief-title">Deliverables</p>
                <ul className="ateam-brief-list">
                  {(prefill.output?.deliverables ?? []).slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="ateam-brief-title">Suggested stack</p>
                <ul className="ateam-brief-list">
                  {(prefill.output?.stack ?? []).slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </details>
      ) : null}
      <label>
        <span>Budget</span>
        <select name="budgetRange" defaultValue="not-sure-yet" className="dark-select">
          <option value="not-sure-yet">Not sure yet</option>
          <option value="0-1000">$0 - $1,000</option>
          <option value="1000-2500">$1,000 - $2,500</option>
          <option value="2500-5000">$2,500 - $5,000</option>
          <option value="5000-10000">$5,000 - $10,000</option>
          <option value="10000-plus">$10,000+</option>
        </select>
        <span className="field-help">Fast setup work often starts with a scoped lead system or website improvement.</span>
      </label>
      <label>
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </label>
      <label>
        <span>Timeline (optional)</span>
        <select name="timeline" defaultValue="" className="dark-select">
          <option value="">Not sure yet</option>
          <option value="2-4-weeks">2-4 weeks</option>
          <option value="4-8-weeks">4-8 weeks</option>
          <option value="8-12-weeks">8-12 weeks</option>
          <option value="12-weeks-plus">12+ weeks</option>
        </select>
      </label>
      <label className="hp-field" aria-hidden="true">
        Company Website
        <input type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting..." : "Submit project request"}
      </button>

      <div className="intake-next-steps">
        <p className="intake-next-steps-title">What happens after you submit:</p>
        <ol className="intake-next-steps-list">
          <li>We review your request quickly (typically within 1 business day).</li>
          <li>We reply with a scoped next step, timeline, and any clarifying questions.</li>
          <li>If it is a fit, we move into setup or a short kickoff call.</li>
        </ol>
        <p className="intake-alt-contact">
          Prefer a quick conversation?{" "}
          <Link href="/connect" prefetch={false} className="inline-link">
            Contact us directly.
          </Link>
        </p>
      </div>

      {message ? (
        <p
          className={submitState === "error" ? "form-feedback error" : "form-feedback success"}
          role={submitState === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
