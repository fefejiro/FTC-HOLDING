"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type IntakeData = {
  idea: string;
  features: string;
  users: string;
  timeline: string;
  references: string;
  email: string;
  name: string;
};

const TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-month", label: "Within 1 month" },
  { value: "1-3-months", label: "1–3 months" },
  { value: "3-plus-months", label: "3+ months" },
  { value: "flexible", label: "Flexible" }
];

export default function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState<IntakeData>({
    idea: "",
    features: "",
    users: "",
    timeline: "",
    references: "",
    email: "",
    name: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof IntakeData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.idea.trim() || !form.features.trim() || !form.users.trim() || !form.email.trim() || !form.name.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const intakeId = `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const summary = {
        intakeId,
        name: form.name.trim(),
        email: form.email.trim(),
        idea: form.idea.trim(),
        features: form.features.trim(),
        users: form.users.trim(),
        timeline: form.timeline || "flexible",
        references: form.references.trim()
      };

      sessionStorage.setItem("una_intake", JSON.stringify(summary));

      router.push("/start/summary");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit} noValidate>
      <div className="intake-field-group">
        <div className="intake-field">
          <label htmlFor="name" className="intake-label">
            Your name <span className="intake-required">*</span>
          </label>
          <input
            id="name"
            type="text"
            className="intake-input"
            placeholder="Mike Efiuvwere"
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
            autoCapitalize="words"
          />
        </div>

        <div className="intake-field">
          <label htmlFor="email" className="intake-label">
            Email address <span className="intake-required">*</span>
          </label>
          <input
            id="email"
            type="email"
            className="intake-input"
            placeholder="you@yourcompany.com"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            inputMode="email"
          />
        </div>
      </div>

      <div className="intake-field">
        <label htmlFor="idea" className="intake-label">
          Describe your project idea <span className="intake-required">*</span>
        </label>
        <p className="intake-hint">What does it do? What problem does it solve?</p>
        <textarea
          id="idea"
          className="intake-textarea"
          placeholder="e.g. A mobile app that helps independent truck drivers track loads, calculate profit per trip, and invoice clients from the road."
          rows={4}
          value={form.idea}
          onChange={set("idea")}
          enterKeyHint="next"
        />
      </div>

      <div className="intake-field">
        <label htmlFor="features" className="intake-label">
          Key features for Version 1 <span className="intake-required">*</span>
        </label>
        <p className="intake-hint">List the core things it needs to do — one per line is fine.</p>
        <textarea
          id="features"
          className="intake-textarea"
          placeholder={"- Load tracking with pickup/drop off\n- Trip profit calculator\n- PDF invoice generator\n- Basic client list"}
          rows={5}
          value={form.features}
          onChange={set("features")}
          enterKeyHint="next"
        />
      </div>

      <div className="intake-field">
        <label htmlFor="users" className="intake-label">
          Who are your target users? <span className="intake-required">*</span>
        </label>
        <p className="intake-hint">Be specific — not just &quot;everyone.&quot;</p>
        <input
          id="users"
          type="text"
          className="intake-input"
          placeholder="e.g. Independent owner-operator truck drivers in Canada and the US"
          value={form.users}
          onChange={set("users")}
          enterKeyHint="next"
        />
      </div>

      <div className="intake-field">
        <label htmlFor="timeline" className="intake-label">
          Preferred timeline
        </label>
        <select
          id="timeline"
          className="intake-select"
          value={form.timeline}
          onChange={set("timeline")}
        >
          <option value="">Select a timeline</option>
          {TIMELINES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="intake-field">
        <label htmlFor="references" className="intake-label">
          Reference examples <span className="intake-optional">(optional)</span>
        </label>
        <p className="intake-hint">Apps, sites, or products you want to feel like — or compete with.</p>
        <textarea
          id="references"
          className="intake-textarea"
          placeholder="e.g. Truckstop.com for the load board, Wave for the invoicing feel"
          rows={3}
          value={form.references}
          onChange={set("references")}
          enterKeyHint="done"
        />
      </div>

      {error ? <p className="intake-error">{error}</p> : null}

      <button type="submit" className="btn btn-primary intake-submit" disabled={submitting}>
        {submitting ? "Processing…" : "Review My Summary"}
      </button>

      <p className="intake-submit-note">
        No payment yet. You&apos;ll review everything before choosing a plan.
      </p>
    </form>
  );
}
