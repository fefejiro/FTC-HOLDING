"use client";

import { FormEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gardenFrequencies, gardenPropertyTypes, gardenServiceOptions } from "../../../lib/gardenCleaners";
import { trackEvent } from "../../../lib/analytics";
import type { GardenFormSource, GardenQuotePayload } from "../../../lib/gardenContracts";

type SubmitState = "idle" | "submitting" | "success" | "error";

type GardenQuoteFormProps = {
  source?: GardenFormSource;
};

export default function GardenQuoteForm({ source = "quote_page" }: GardenQuoteFormProps) {
  const searchParams = useSearchParams();
  const selectedRegion = String(searchParams.get("region") || "").trim();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const startedAtRef = useRef<number>(Date.now());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload: GardenQuotePayload = {
      fullName: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      propertyType: String(formData.get("propertyType") || "").trim(),
      serviceNeeded: String(formData.get("serviceNeeded") || "").trim(),
      preferredDate: String(formData.get("preferredDate") || "").trim(),
      frequency: String(formData.get("frequency") || "").trim(),
      region: String(formData.get("region") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      startedAt: startedAtRef.current
    };

    setSubmitState("submitting");
    setMessage("");

    trackEvent("garden_quote_submit_attempt", {
      location: `${source}_form`,
      label: "submit_attempt",
      source,
      propertyType: payload.propertyType,
      serviceNeeded: payload.serviceNeeded,
      frequency: payload.frequency
    });

    try {
      const response = await fetch("/api/garden-cleaners-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Unable to submit quote request.");
      }

      setSubmitState("success");
      setMessage(body.message || "Thanks. Your quote request has been received.");
      trackEvent("garden_quote_submit_success", {
        location: `${source}_form`,
        label: "submit_success",
        source,
        propertyType: payload.propertyType,
        serviceNeeded: payload.serviceNeeded,
        frequency: payload.frequency
      });
      form.reset();
      startedAtRef.current = Date.now();
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Submission failed. Please try again in a few minutes.");
      trackEvent("garden_quote_submit_error", {
        location: `${source}_form`,
        label: "submit_error",
        source,
        propertyType: payload.propertyType,
        serviceNeeded: payload.serviceNeeded,
        frequency: payload.frequency,
        errorCode: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return (
    <form className="intake-form garden-quote-form" onSubmit={onSubmit} noValidate>
      <label>
        <span>Full Name</span>
        <input type="text" name="fullName" autoComplete="name" required minLength={2} placeholder="Jane Doe" />
      </label>
      <label>
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      <label>
        <span>Phone</span>
        <input type="tel" name="phone" autoComplete="tel" required placeholder="(905) 000-0000" />
      </label>
      <label>
        <span>Property Type</span>
        <select name="propertyType" defaultValue="" className="dark-select" required>
          <option value="">Select property type</option>
          {gardenPropertyTypes.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Service Needed</span>
        <select name="serviceNeeded" defaultValue="" className="dark-select" required>
          <option value="">Select a service</option>
          {gardenServiceOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Preferred Date</span>
        <input type="date" name="preferredDate" required />
      </label>
      <label>
        <span>Frequency</span>
        <select name="frequency" defaultValue="" className="dark-select" required>
          <option value="">Select frequency</option>
          {gardenFrequencies.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="garden-quote-form-message">
        <span>Message</span>
        <textarea name="message" rows={5} required minLength={20} placeholder="Tell us about the property, timing, and anything we should know." />
      </label>
      {selectedRegion ? (
        <label>
          <span>Service Region</span>
          <input type="text" name="region" value={selectedRegion} readOnly />
        </label>
      ) : (
        <input type="hidden" name="region" value="" />
      )}
      <label className="hp-field" aria-hidden="true">
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting..." : "Request Quote"}
      </button>
      {message ? (
        <p className={submitState === "error" ? "form-feedback error" : "form-feedback success"} role={submitState === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
