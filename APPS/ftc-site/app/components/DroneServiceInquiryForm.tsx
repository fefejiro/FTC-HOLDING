"use client";

import { FormEvent, useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";

type SubmitState = "idle" | "submitting" | "success" | "error";

const serviceOptions = [
  "Real Estate Aerial Photography",
  "Roof & Property Inspection Support",
  "Business Marketing Footage",
  "Construction / Site Progress Documentation",
  "Other / Not sure yet"
] as const;

export default function DroneServiceInquiryForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const startedAtRef = useRef<number>(Date.now());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const serviceType = String(formData.get("serviceType") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const projectDetails = String(formData.get("projectDetails") || "").trim();

    const payload = {
      name,
      email,
      projectIdea:
        `Drone service inquiry\n` +
        `Service Type: ${serviceType}\n` +
        `Location: ${location}\n` +
        `Project Details: ${projectDetails}`,
      budgetRange: "not-sure-yet",
      timeline: "",
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
        throw new Error(body.message || "Unable to submit drone service request.");
      }

      setSubmitState("success");
      setMessage(body.message || "Thanks. Una Labs received your drone service request.");
      trackEvent("drone_service_request_success", {
        service_type: serviceType || "not-specified"
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
      trackEvent("drone_service_request_error");
    }
  }

  return (
    <form className="intake-form drone-inquiry-form" onSubmit={onSubmit} noValidate>
      <div className="drone-form-grid">
        <label>
          <span>Name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            minLength={2}
            required
          />
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
          <span>Service Type</span>
          <select name="serviceType" defaultValue="" className="dark-select" required>
            <option value="" disabled>
              Select a service
            </option>
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Location</span>
          <input
            type="text"
            name="location"
            autoComplete="street-address"
            placeholder="City, neighborhood, or property address"
            required
          />
        </label>
      </div>

      <label className="drone-form-full">
        <span>Project Details</span>
        <textarea
          name="projectDetails"
          rows={6}
          minLength={20}
          required
          placeholder={
            "Tell us what you need, where the property or site is located, and the kind of footage or inspection support you are looking for."
          }
        />
      </label>

      <label className="hp-field" aria-hidden="true">
        Company Website
        <input type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting..." : "Request Drone Service"}
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
