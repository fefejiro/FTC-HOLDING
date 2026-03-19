"use client";

import Link from "next/link";
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
        <span>What do you need help with?</span>
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
        {submitState === "submitting" ? "Submitting..." : "Request My Setup"}
      </button>

      <div className="intake-next-steps">
        <p className="intake-next-steps-title">What happens after you submit:</p>
        <ol className="intake-next-steps-list">
          <li>We review your request.</li>
          <li>We reply with a scoped next step or clarifying questions.</li>
          <li>If it is a fit, we move quickly into setup or a short call.</li>
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
