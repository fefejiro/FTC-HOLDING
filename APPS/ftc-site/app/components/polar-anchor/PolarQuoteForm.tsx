"use client";

import { FormEvent, useRef, useState } from "react";
import {
  polarServiceOptions,
  polarShipmentTypes,
  polarTimelineOptions
} from "../../../lib/polarAnchor";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function PolarQuoteForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const startedAtRef = useRef<number>(Date.now());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      fullName: String(formData.get("fullName") || "").trim(),
      companyName: String(formData.get("companyName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      shipmentType: String(formData.get("shipmentType") || "").trim(),
      serviceNeeded: String(formData.get("serviceNeeded") || "").trim(),
      origin: String(formData.get("origin") || "").trim(),
      destination: String(formData.get("destination") || "").trim(),
      preferredDate: String(formData.get("preferredDate") || "").trim(),
      preferredTimeline: String(formData.get("preferredTimeline") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      startedAt: startedAtRef.current
    };

    setSubmitState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/polar-anchor-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.message || "Unable to submit quote request.");
      }

      setSubmitState("success");
      setMessage(body.message || "Thanks. Your quote request has been received.");
      form.reset();
      startedAtRef.current = Date.now();
    } catch (error) {
      setSubmitState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Submission failed. Please try again in a few minutes."
      );
    }
  }

  return (
    <form className="intake-form polar-quote-form" onSubmit={onSubmit} noValidate>
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
        <input type="tel" name="phone" autoComplete="tel" required placeholder="+1 (647) 000-0000" />
      </label>
      <label>
        <span>Company Name</span>
        <input
          type="text"
          name="companyName"
          autoComplete="organization"
          required
          minLength={2}
          placeholder="Northern Trade Co."
        />
      </label>
      <label>
        <span>Shipment Type</span>
        <select name="shipmentType" defaultValue="" className="dark-select" required>
          <option value="">Select shipment type</option>
          {polarShipmentTypes.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Service Needed</span>
        <select name="serviceNeeded" defaultValue="" className="dark-select" required>
          <option value="">Select a service</option>
          {polarServiceOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Origin</span>
        <input type="text" name="origin" required minLength={2} placeholder="Shanghai" />
      </label>
      <label>
        <span>Destination</span>
        <input type="text" name="destination" required minLength={2} placeholder="Toronto" />
      </label>
      <label>
        <span>Preferred Date</span>
        <input type="date" name="preferredDate" required />
      </label>
      <label>
        <span>Preferred Timeline</span>
        <select name="preferredTimeline" defaultValue="" className="dark-select" required>
          <option value="">Select timeline</option>
          {polarTimelineOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="polar-quote-form-message">
        <span>Message</span>
        <textarea
          name="message"
          rows={5}
          required
          minLength={20}
          placeholder="Tell us what you are shipping, the route, timing, and any customs, warehousing, or handling needs."
        />
      </label>
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
