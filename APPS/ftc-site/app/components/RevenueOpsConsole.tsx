"use client";

import { FormEvent, useMemo, useState } from "react";
import { engagementOffers } from "../../lib/engagementOffers";

type PipelineStage =
  | "lead_qualified"
  | "call_booked"
  | "proposal_sent"
  | "project_closed_won"
  | "project_closed_lost";

type SubmitState = "idle" | "submitting" | "success" | "error";

const pipelineStageOptions: { value: PipelineStage; label: string; hint: string }[] = [
  {
    value: "lead_qualified",
    label: "Lead qualified",
    hint: "Use when the request is a real fit for Una Labs and worth active follow-up."
  },
  {
    value: "call_booked",
    label: "Call booked",
    hint: "Use when a real kickoff, scope, or fit call is scheduled."
  },
  {
    value: "proposal_sent",
    label: "Proposal sent",
    hint: "Use when the buyer has received the scoped offer or commercial next step."
  },
  {
    value: "project_closed_won",
    label: "Project closed won",
    hint: "Use when the buyer commits and the work moves into active delivery."
  },
  {
    value: "project_closed_lost",
    label: "Project closed lost",
    hint: "Use when the opportunity is no longer active or is clearly not moving forward."
  }
];

const quickGuide = [
  {
    title: "Same-day check",
    items: [
      "Did new request IDs come in from ATEAM or direct intake?",
      "Was each real-fit request marked qualified within 24 hours?",
      "Did any high-intent lead stall without a clear next move?"
    ]
  },
  {
    title: "Weekly review",
    items: [
      "Which source produced the highest-quality leads: direct or ATEAM?",
      "Which offer gets selected most often before projects close won?",
      "Where is the biggest drop: qualified -> booked or proposal -> won?"
    ]
  },
  {
    title: "What to fix next",
    items: [
      "Tighten the offer with the weakest win rate.",
      "Strengthen the proof layer where the best leads are hesitating.",
      "Shorten the time between request submit and qualification decision."
    ]
  }
] as const;

export default function RevenueOpsConsole() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [recordedStage, setRecordedStage] = useState<PipelineStage>("lead_qualified");

  const selectedStage = useMemo(
    () => pipelineStageOptions.find((option) => option.value === recordedStage),
    [recordedStage]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const requestId = String(formData.get("requestId") || "").trim();
    const eventType = String(formData.get("eventType") || "lead_qualified").trim() as PipelineStage;

    if (requestId.length < 8) {
      setSubmitState("error");
      setMessage("Add a valid request ID before recording a pipeline stage.");
      return;
    }

    setSubmitState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/intake/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requestId,
          eventType,
          owner: String(formData.get("owner") || "").trim(),
          notes: String(formData.get("notes") || "").trim(),
          value: String(formData.get("value") || "").trim(),
          engagementType: String(formData.get("engagementType") || "").trim(),
          leadSource: String(formData.get("leadSource") || "").trim(),
          bookedFor: String(formData.get("bookedFor") || "").trim(),
          proposalId: String(formData.get("proposalId") || "").trim()
        })
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Unable to record pipeline stage.");
      }

      setSubmitState("success");
      setMessage(body.message || "Pipeline stage recorded.");
      form.reset();
      setRecordedStage("lead_qualified");
    } catch (error) {
      setSubmitState("error");
      setMessage(
        error instanceof Error ? error.message : "Pipeline update failed. Please retry."
      );
    }
  }

  return (
    <div className="revenue-ops-console">
      <section className="card revenue-ops-panel revenue-ops-panel-strong">
        <div className="revenue-ops-head">
          <div>
            <p className="eyebrow">Internal revenue ops</p>
            <h2>Record the downstream stage, not just the lead.</h2>
          </div>
          <p className="muted">
            Use the lead request ID from intake success or your webhook automation. This keeps
            funnel analytics connected to actual commercial movement.
          </p>
        </div>

        <form className="revenue-ops-form" onSubmit={onSubmit}>
          <div className="revenue-ops-grid">
            <label>
              <span>Request ID</span>
              <input type="text" name="requestId" placeholder="UL-20260330-ABC123" required />
            </label>
            <label>
              <span>Pipeline stage</span>
              <select
                name="eventType"
                value={recordedStage}
                onChange={(event) => setRecordedStage(event.target.value as PipelineStage)}
              >
                {pipelineStageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="field-help">{selectedStage?.hint}</span>
            </label>
          </div>

          <div className="revenue-ops-grid revenue-ops-grid-4">
            <label>
              <span>Owner</span>
              <input type="text" name="owner" placeholder="Mike" />
            </label>
            <label>
              <span>Lead source</span>
              <select name="leadSource" defaultValue="">
                <option value="">Not set</option>
                <option value="direct">Direct intake</option>
                <option value="ateam_workflow">ATEAM workflow</option>
                <option value="ateam_demo">ATEAM demo</option>
              </select>
            </label>
            <label>
              <span>Offer</span>
              <select name="engagementType" defaultValue="">
                <option value="">Not set</option>
                {engagementOffers.map((offer) => (
                  <option key={offer.value} value={offer.value}>
                    {offer.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Value</span>
              <input type="number" name="value" min="0" step="1" placeholder="2500" />
            </label>
          </div>

          <div className="revenue-ops-grid revenue-ops-grid-3">
            <label>
              <span>Booked for</span>
              <input type="text" name="bookedFor" placeholder="2026-04-02 2:30 PM ET" />
            </label>
            <label>
              <span>Proposal reference</span>
              <input type="text" name="proposalId" placeholder="PROP-014" />
            </label>
            <label>
              <span>Notes</span>
              <input
                type="text"
                name="notes"
                placeholder="Qualified after ATEAM handoff review."
              />
            </label>
          </div>

          <div className="revenue-ops-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitState === "submitting"}
            >
              {submitState === "submitting" ? "Recording..." : "Record pipeline stage"}
            </button>
            <p className={`revenue-ops-message ${submitState}`}>{message}</p>
          </div>
        </form>
      </section>

      <section className="revenue-ops-guide-grid">
        {quickGuide.map((group) => (
          <article key={group.title} className="card revenue-ops-panel">
            <p className="eyebrow">{group.title}</p>
            <ul className="feature-list compact-feature-list mission-control-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
