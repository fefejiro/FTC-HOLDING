"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type IntakeSummary = {
  intakeId: string;
  name: string;
  email: string;
  idea: string;
  features: string;
  users: string;
  timeline: string;
  references: string;
};

const TIMELINE_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  "1-month": "Within 1 month",
  "1-3-months": "1–3 months",
  "3-plus-months": "3+ months",
  flexible: "Flexible"
};

export default function SummaryClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("una_intake");
    if (!raw) {
      router.replace("/start");
      return;
    }
    try {
      setSummary(JSON.parse(raw));
    } catch {
      router.replace("/start");
    }
  }, [router]);

  const handlePay = async (plan: "full" | "deposit") => {
    if (!summary) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: summary.email,
          plan,
          intake_id: summary.intakeId
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to create checkout session.");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!summary) {
    return (
      <div className="summary-loading">
        <p>Loading your project summary…</p>
      </div>
    );
  }

  const featureLines = summary.features
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="summary-layout">
      <div className="summary-main">
        <div className="card summary-mobile-intro-card">
          <p className="summary-mobile-intro-label">Quick check before payment</p>
          <div className="summary-mobile-intro-grid">
            <div className="summary-mobile-intro-item">
              <strong>Is the scope right?</strong>
              <p>Make sure this reflects the Version 1 you actually want built first.</p>
            </div>
            <div className="summary-mobile-intro-item">
              <strong>Need to fix anything?</strong>
              <p>Use edit intake before paying. This should feel accurate and usable.</p>
            </div>
            <div className="summary-mobile-intro-item">
              <strong>Then choose your plan</strong>
              <p>Deposit reserves your slot. Full payment starts the build immediately.</p>
            </div>
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-card-header">
            <p className="eyebrow">Your project brief</p>
            <h2>{summary.name}'s Project</h2>
            <p className="summary-email">{summary.email}</p>
          </div>

          <div className="summary-sections">
            <div className="summary-section">
              <h3 className="summary-section-title">Project idea</h3>
              <p className="summary-section-body">{summary.idea}</p>
            </div>

            <div className="summary-section">
              <h3 className="summary-section-title">Key features — Version 1</h3>
              <ul className="summary-feature-list">
                {featureLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="summary-section-row">
              <div className="summary-section">
                <h3 className="summary-section-title">Target users</h3>
                <p className="summary-section-body">{summary.users}</p>
              </div>

              <div className="summary-section">
                <h3 className="summary-section-title">Timeline</h3>
                <p className="summary-section-body">
                  {TIMELINE_LABELS[summary.timeline] || summary.timeline}
                </p>
              </div>
            </div>

            {summary.references ? (
              <div className="summary-section">
                <h3 className="summary-section-title">Reference examples</h3>
                <p className="summary-section-body">{summary.references}</p>
              </div>
            ) : null}
          </div>

          <div className="summary-edit-row">
            <button
              type="button"
              className="summary-edit-btn"
              onClick={() => router.push("/start")}
            >
              ← Edit intake
            </button>
          </div>
        </div>
      </div>

      <aside className="summary-payment-col">
        <div className="card summary-payment-card">
          <p className="eyebrow">Choose your plan</p>
          <h3>Ready to lock this in?</h3>
          <p className="summary-payment-sub">
            Payment goes through Stripe. Secure checkout — no card stored here.
          </p>

          <div className="summary-plan-cards">
            <div className="summary-plan-card summary-plan-card--deposit">
              <div className="summary-plan-header">
                <p className="summary-plan-name">Deposit</p>
                <p className="summary-plan-price">$999 <span>USD</span></p>
              </div>
              <p className="summary-plan-desc">
                Lock in your spot and kick off the intake process. Remaining $3,000 due before build starts.
              </p>
              <button
                type="button"
                className="btn btn-secondary summary-pay-btn"
                onClick={() => handlePay("deposit")}
                disabled={loading}
              >
                {loading ? "Redirecting…" : "Pay Deposit — $999"}
              </button>
            </div>

            <div className="summary-plan-card summary-plan-card--full">
              <div className="summary-plan-badge">Best value</div>
              <div className="summary-plan-header">
                <p className="summary-plan-name">Pay in Full</p>
                <p className="summary-plan-price">$3,999 <span>USD</span></p>
              </div>
              <p className="summary-plan-desc">
                Full payment upfront. Build starts immediately after payment confirmation.
              </p>
              <button
                type="button"
                className="btn btn-primary summary-pay-btn"
                onClick={() => handlePay("full")}
                disabled={loading}
              >
                {loading ? "Redirecting…" : "Pay in Full — $3,999"}
              </button>
            </div>
          </div>

          {error ? <p className="summary-error">{error}</p> : null}

          <p className="summary-stripe-note">
            Powered by Stripe. Your payment is processed securely.
          </p>
        </div>

        <div className="card summary-what-next-card">
          <h3>What happens after payment?</h3>
          <ol className="summary-what-next-list">
            <li>You land on a confirmation page</li>
            <li>We send a project kickoff email within 24 hours</li>
            <li>Admin is notified with your full project brief</li>
            <li>Build begins on schedule</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
