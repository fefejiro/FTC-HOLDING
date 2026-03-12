"use client";

import { FormEvent, useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function WorkIntakeForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const startedAtRef = useRef<number>(Date.now());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: "Website lead",
      email: String(formData.get("email") || "").trim(),
      projectIdea: String(formData.get("projectIdea") || "").trim(),
      budgetRange: String(formData.get("budgetRange") || "not-sure-yet"),
      timeline: String(formData.get("timeline") || "").trim(),
      companyWebsite: String(formData.get("companyWebsite") || "").trim(),
      startedAt: startedAtRef.current
    };

    setSubmitState("submitting");
    setMessage("");

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
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Unable to submit project intake.");
      }

      setSubmitState("success");
      setMessage(body.message || "Thanks, your project intake has been received.");
      trackEvent("lead_submit_success", {
        budget_range: payload.budgetRange,
        timeline: payload.timeline || "not-specified"
      });
      form.reset();
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

  return (
    <form className="intake-form" onSubmit={onSubmit} noValidate>
      <label>
        <span>Project Idea</span>
        <textarea
          name="projectIdea"
          rows={6}
          required
          minLength={20}
          placeholder={
            "Example:\n- I want to build a mobile app\n- I need AI automation for my business\n- I want a tool similar to X"
          }
        />
      </label>
      <label>
        <span>Budget</span>
        <select name="budgetRange" defaultValue="not-sure-yet">
          <option value="0-1000">$0 - $1,000</option>
          <option value="1000-2500">$1,000 - $2,500</option>
          <option value="2500-5000">$2,500 - $5,000</option>
          <option value="5000-10000">$5,000 - $10,000</option>
          <option value="10000-plus">$10,000+</option>
          <option value="not-sure-yet">Not sure yet</option>
        </select>
        <span className="field-help">Typical early builds range between $1k - $5k.</span>
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
        <select name="timeline" defaultValue="">
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
        {submitState === "submitting" ? "Submitting..." : "Start My Project"}
      </button>
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
