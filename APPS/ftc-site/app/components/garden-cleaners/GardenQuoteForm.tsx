"use client";

import { FormEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gardenFrequencies, gardenPropertyTypes, gardenServiceOptions, gardenAddOns } from "../../../lib/gardenCleaners";
import { trackEvent } from "../../../lib/analytics";
import type { GardenFormSource, GardenQuotePayload } from "../../../lib/gardenContracts";

type SubmitState = "idle" | "submitting" | "success" | "error";

type GardenQuoteFormProps = {
  source?: GardenFormSource;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GardenQuoteForm({ source = "quote_page" }: GardenQuoteFormProps) {
  const searchParams = useSearchParams();
  const selectedRegion = String(searchParams.get("region") || "").trim();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [serviceNeeded, setServiceNeeded] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  function toggleAddOn(addon: string) {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(addon)) next.delete(addon);
      else next.add(addon);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload: GardenQuotePayload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: String(formData.get("address") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      postalCode: String(formData.get("postalCode") || "").trim(),
      propertyType: propertyType.trim(),
      serviceNeeded: serviceNeeded.trim(),
      preferredDate: String(formData.get("preferredDate") || "").trim(),
      preferredTime: String(formData.get("preferredTime") || "").trim(),
      frequency: String(formData.get("frequency") || "").trim(),
      region: String(formData.get("region") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      startedAt: startedAtRef.current,
      addOns: selectedAddOns.size > 0 ? Array.from(selectedAddOns) : undefined,
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
      setStep(1);
      setStepError("");
      setFullName("");
      setEmail("");
      setPhone("");
      setPropertyType("");
      setServiceNeeded("");
      setSelectedAddOns(new Set());
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

  function continueToStepTwo() {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setStepError("Please enter your full name.");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setStepError("Please enter a valid email address.");
      return;
    }
    if (trimmedPhone.length < 7 || trimmedPhone.length > 40) {
      setStepError("Please enter a valid phone number.");
      return;
    }
    if (!propertyType) {
      setStepError("Please select a property type.");
      return;
    }
    if (!serviceNeeded) {
      setStepError("Please select the service needed.");
      return;
    }

    setStepError("");
    setStep(2);
  }

  return (
    <form ref={formRef} className="intake-form garden-quote-form" onSubmit={onSubmit} noValidate>
      <div className="garden-quote-progress" aria-label="Quote progress">
        <div className={`garden-quote-step ${step === 1 ? "is-active" : "is-complete"}`}>1. Quick details</div>
        <div className={`garden-quote-step ${step === 2 ? "is-active" : ""}`}>2. Service details</div>
      </div>

      {step === 1 ? (
        <>
          <p className="muted" style={{ marginTop: -4 }}>Step 1 takes about 20 seconds.</p>
          <div className="intake-form-grid">
            <label>
              <span>Full Name</span>
              <input
                type="text"
                autoComplete="name"
                required
                minLength={2}
                placeholder="Jane Doe"
                value={fullName}
                onChange={(event) => setFullName(event.currentTarget.value)}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                type="tel"
                autoComplete="tel"
                required
                placeholder="+1 289 200 0631"
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
              />
            </label>
            <label>
              <span>Property Type</span>
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.currentTarget.value)}
                className="dark-select"
                required
              >
                <option value="">Select property type</option>
                {gardenPropertyTypes.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="intake-form-span-2">
              <span>Service Needed</span>
              <select
                value={serviceNeeded}
                onChange={(event) => setServiceNeeded(event.currentTarget.value)}
                className="dark-select"
                required
              >
                <option value="">Select a service</option>
                {gardenServiceOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          {stepError ? <p className="form-feedback error" role="alert">{stepError}</p> : null}
          <div className="garden-quote-step-actions">
            <button type="button" className="btn btn-primary" onClick={continueToStepTwo}>Continue</button>
          </div>
        </>
      ) : (
        <>
          <div className="garden-quote-summary">
            <p><strong>{fullName}</strong> · {email} · {phone}</p>
            <p>{propertyType} · {serviceNeeded}{selectedRegion ? ` · ${selectedRegion}` : ""}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Edit quick details</button>
          </div>

          <div className="intake-form-grid">
            <label className="intake-form-span-2">
              <span>Service Address</span>
              <input type="text" name="address" autoComplete="street-address" required minLength={5} placeholder="123 Main Street" />
            </label>
            <label>
              <span>City</span>
              <input type="text" name="city" autoComplete="address-level2" required placeholder="Oshawa" />
            </label>
            <label>
              <span>Postal Code</span>
              <input type="text" name="postalCode" autoComplete="postal-code" placeholder="A1A 1A1" />
            </label>
            <label>
              <span>Preferred Date</span>
              <input type="date" name="preferredDate" required />
            </label>
            <label>
              <span>Preferred Time</span>
              <select name="preferredTime" defaultValue="" className="dark-select">
                <option value="">Any time</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
              </select>
            </label>
            <label className="intake-form-span-2">
              <span>Frequency</span>
              <select name="frequency" defaultValue="" className="dark-select" required>
                <option value="">Select frequency</option>
                {gardenFrequencies.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="garden-quote-form-message">
            <span>Message</span>
            <textarea name="message" rows={4} required minLength={20} placeholder="Tell us about the property, timing, and anything we should know." />
          </label>

          {/* Add-ons */}
          <fieldset className="garden-addons-fieldset">
            <legend>Add-ons (optional)</legend>
            <div className="garden-addons-grid">
              {gardenAddOns.map((addon) => (
                <label key={addon} className="garden-addon-check">
                  <input
                    type="checkbox"
                    checked={selectedAddOns.has(addon)}
                    onChange={() => toggleAddOn(addon)}
                  />
                  {addon}
                </label>
              ))}
            </div>
          </fieldset>

          {selectedRegion ? (
            <label>
              <span>Service Region</span>
              <input type="text" name="region" value={selectedRegion} readOnly />
            </label>
          ) : (
            <input type="hidden" name="region" value="" />
          )}
        </>
      )}

      <input type="hidden" name="fullName" value={fullName} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="propertyType" value={propertyType} />
      <input type="hidden" name="serviceNeeded" value={serviceNeeded} />

      <label className="hp-field" aria-hidden="true">
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>

      {submitState === "success" ? (
        <div className="garden-quote-success-banner" role="status">
          <span className="garden-quote-success-icon" aria-hidden="true">✅</span>
          <div>
            <strong>Quote request sent!</strong>
            <p>{message}</p>
          </div>
        </div>
      ) : (
        <>
          {step === 2 ? (
            <div className="garden-quote-step-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={submitState === "submitting"}>
                {submitState === "submitting" ? "Submitting..." : "Request Quote"}
              </button>
            </div>
          ) : null}
          {message && submitState === "error" ? (
            <p className="form-feedback error" role="alert">{message}</p>
          ) : null}
        </>
      )}
    </form>
  );
}
