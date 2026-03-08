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
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      projectIdea: String(formData.get("projectIdea") || "").trim(),
      budgetRange: String(formData.get("budgetRange") || "under-5k"),
      timeline: String(formData.get("timeline") || "2-6-weeks"),
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
        timeline: payload.timeline
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
        Name
        <input type="text" name="name" autoComplete="name" required minLength={2} />
      </label>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Project Idea
        <textarea name="projectIdea" rows={5} required minLength={20} />
      </label>
      <label>
        Budget Range
        <select name="budgetRange" defaultValue="under-5k">
          <option value="under-5k">Under $5k</option>
          <option value="5k-15k">$5k - $15k</option>
          <option value="15k-50k">$15k - $50k</option>
          <option value="50k-plus">$50k+</option>
        </select>
      </label>
      <label>
        Timeline
        <select name="timeline" defaultValue="2-6-weeks">
          <option value="2-6-weeks">2-6 weeks</option>
          <option value="6-12-weeks">6-12 weeks</option>
          <option value="12-weeks-plus">12+ weeks</option>
        </select>
      </label>
      <label className="hp-field" aria-hidden="true">
        Company Website
        <input type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting..." : "Submit Intake"}
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

