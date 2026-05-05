"use client";

import { FormEvent, useRef, useState } from "react";
import { trackEvent } from "../../../lib/analytics";

type SubmitState = "idle" | "submitting" | "success" | "error";

const interestOptions = [
  { value: "8-week-beginner-forex-course", label: "8 Week Beginner Forex Course" },
  { value: "community-access", label: "Community access" },
  { value: "free-resources", label: "Free resources" },
  { value: "not-sure-yet", label: "Not sure yet" }
] as const;

const experienceOptions = [
  { value: "brand-new", label: "Brand new to forex" },
  { value: "learning-basics", label: "Learning the basics" },
  { value: "demo-trading", label: "Practicing on demo" },
  { value: "live-trading", label: "Starting to trade live" }
] as const;

const goalOptions = [
  { value: "build-foundation", label: "Build a strong foundation" },
  { value: "improve-risk-management", label: "Improve risk management" },
  { value: "learn-a-repeatable-strategy", label: "Learn a repeatable strategy" },
  { value: "gain-consistency", label: "Gain more consistency" }
] as const;

const timelineOptions = [
  { value: "ready-now", label: "Ready now" },
  { value: "this-month", label: "This month" },
  { value: "next-month", label: "Next month" },
  { value: "just-looking", label: "Just exploring" }
] as const;

export default function OgTradesEnrollmentForm() {
  const startedAtRef = useRef<number>(Date.now());
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      interest: String(formData.get("interest") || "not-sure-yet").trim(),
      experienceLevel: String(formData.get("experienceLevel") || "brand-new").trim(),
      primaryGoal: String(formData.get("primaryGoal") || "build-foundation").trim(),
      timeline: String(formData.get("timeline") || "just-looking").trim(),
      notes: String(formData.get("notes") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      startedAt: startedAtRef.current
    };

    setSubmitState("submitting");
    setMessage("");
    setRequestId("");

    trackEvent("og_trades_lead_attempt", {
      interest: payload.interest,
      experience_level: payload.experienceLevel,
      primary_goal: payload.primaryGoal,
      timeline: payload.timeline
    });

    try {
      const response = await fetch("/api/og-trades-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        requestId?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Unable to submit your request right now.");
      }

      setSubmitState("success");
      setMessage(body.message || "Request received.");
      setRequestId(String(body.requestId || ""));
      form.reset();
      startedAtRef.current = Date.now();

      trackEvent("og_trades_lead_success", {
        interest: payload.interest,
        experience_level: payload.experienceLevel,
        primary_goal: payload.primaryGoal
      });
    } catch (error) {
      setSubmitState("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to submit your request right now."
      );
      trackEvent("og_trades_lead_error");
    }
  }

  return (
    <form className="og-form" onSubmit={onSubmit} noValidate>
      <div className="og-form-grid">
        <label>
          <span>Name</span>
          <input type="text" name="name" placeholder="Your name" required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" name="email" placeholder="you@example.com" required />
        </label>
      </div>

      <div className="og-form-grid">
        <label>
          <span>What are you interested in?</span>
          <select name="interest" defaultValue="8-week-beginner-forex-course" className="dark-select">
            {interestOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Experience level</span>
          <select name="experienceLevel" defaultValue="brand-new" className="dark-select">
            {experienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="og-form-grid">
        <label>
          <span>Main goal</span>
          <select name="primaryGoal" defaultValue="build-foundation" className="dark-select">
            {goalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>When do you want to start?</span>
          <select name="timeline" defaultValue="ready-now" className="dark-select">
            {timelineOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Anything we should know?</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Tell us what you want help with, what you are stuck on, or which part of trading feels hardest right now."
        />
      </label>

      <label className="hp-field" aria-hidden="true">
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting..." : "Request enrollment details"}
      </button>

      {message ? (
        <p className={`intake-message ${submitState === "error" ? "error" : "success"}`}>
          {message}
          {requestId ? ` Reference: ${requestId}` : ""}
        </p>
      ) : null}
    </form>
  );
}

