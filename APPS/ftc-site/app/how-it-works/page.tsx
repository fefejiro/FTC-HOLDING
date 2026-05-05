import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "How It Works | Una Labs",
  description:
    "See how Una Labs takes a rough request through structured intake, a scoped proposal, and governed delivery — all within a transparent, documented process.",
  alternates: {
    canonical: "https://unalabs.cloud/how-it-works"
  }
};

const STEPS = [
  {
    num: "01",
    label: "Submit a rough request",
    detail:
      "No intake form templates. No discovery call required to begin. Describe the problem or idea in plain language — ATEAM structures it from there."
  },
  {
    num: "02",
    label: "Receive a scoped brief",
    detail:
      "Within 48 hours, your rough input becomes a structured brief with a recommended direction, execution lane, and first-pass scope. You see it before committing budget."
  },
  {
    num: "03",
    label: "Review the proposal and pay a deposit",
    detail:
      "One clear proposal. Agree to the terms, pay a deposit through Stripe, and work begins. Nothing moves without your explicit sign-off."
  },
  {
    num: "04",
    label: "Delivery with approval gates",
    detail:
      "Governed execution with checkpoints throughout. Every output is documented, client-approved, and handed off in a format you actually own."
  }
];

const FAQS = [
  {
    q: "Do I need to have everything figured out before submitting?",
    a: "No. That's the point of the intake step. Submit the rough version — ATEAM extracts structure from it so you don't have to."
  },
  {
    q: "What if the proposal doesn't match what I expected?",
    a: "You're not charged anything until you explicitly agree to the proposal and pay a deposit. If the scope isn't right, we adjust it before anything moves."
  },
  {
    q: "How long does the scoping step take?",
    a: "Typically 48 hours from when the request is submitted. Complex projects may take slightly longer — we'll tell you upfront."
  },
  {
    q: "What counts as an approval gate?",
    a: "Each gate is a documented checkpoint where you review and sign off before the next phase begins. Nothing proceeds on assumptions."
  },
  {
    q: "What does handoff-ready output mean?",
    a: "Every engagement ends with documented deliverables — screenshots, writeups, access credentials, and completion records. You own the output, not just a finished task."
  },
  {
    q: "What payment methods are accepted?",
    a: "Deposits and invoices are collected through Stripe. All major cards accepted. Receipts provided automatically."
  }
];

export default function HowItWorksPage() {
  return (
    <div className="main-shell hiw-page">

      {/* ── HERO ── */}
      <section className="section section-hero">
        <div className="container">
          <div className="hiw-hero">
            <p className="eyebrow">How Una Labs works</p>
            <h1>Rough input in. Documented delivery out.</h1>
            <p className="lead">
              Every engagement follows the same four-step path — intake, scope, proposal, delivery.
              No assumptions, no ambiguity, no chasing.
            </p>
            <div className="hiw-hero-cta-row">
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Submit a request
              </Link>
              <Link href="/work" prefetch={false} className="btn btn-secondary">
                See delivery proof
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-STEP FLOW ── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">The process</p>
            <h2>Four steps. Nothing skipped.</h2>
          </div>

          <ol className="hiw-steps" aria-label="How it works — four steps">
            {STEPS.map((step) => (
              <li key={step.num} className="hiw-step">
                <div className="hiw-step-num" aria-hidden="true">{step.num}</div>
                <div className="hiw-step-body">
                  <h3>{step.label}</h3>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── ATEAM ENGINE ── */}
      <section className="section">
        <div className="container">
          <div className="card hiw-engine-card">
            <div className="hiw-engine-copy">
              <p className="eyebrow">Powered by ATEAM</p>
              <h2>The engine behind every engagement</h2>
              <p>
                ATEAM is not a separate product you go to. It is the internal workflow engine that
                structures intake, generates scoping briefs, governs approvals, manages documents,
                and tracks delivery across every Una Labs engagement.
              </p>
              <p className="hiw-engine-note">
                When you submit a request, ATEAM handles the structuring. When you receive a
                proposal, ATEAM has already routed the request to the right execution lane.
                You interact with Una Labs — ATEAM works behind it.
              </p>
            </div>
            <div className="hiw-engine-bullets-block">
              <ul className="hiw-engine-bullets">
                <li>Intake routes automatically to the right execution lane</li>
                <li>Scope, brief, and proposal generated from your request</li>
                <li>Approval gates keep work visible before money moves</li>
                <li>Delivery tracked through to handoff-ready output</li>
                <li>Every approval documented with timestamps</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Common questions</p>
            <h2>Things people ask before starting</h2>
          </div>

          <div className="hiw-faq-grid">
            {FAQS.map((faq) => (
              <div key={faq.q} className="card hiw-faq-card">
                <strong className="hiw-faq-q">{faq.q}</strong>
                <p className="hiw-faq-a">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="section">
        <div className="container">
          <article className="card final-cta-card">
            <div>
              <p className="eyebrow">Start here</p>
              <h2>Describe what you need. We scope the next move.</h2>
              <p className="muted">
                No account needed. No upfront commitment. Submit a rough request and receive a
                scoped brief with a recommended direction within 48 hours.
              </p>
            </div>
            <div className="product-actions final-cta-actions">
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Start your request
              </Link>
              <Link href="/pricing" prefetch={false} className="btn btn-secondary">
                View pricing
              </Link>
            </div>
          </article>
        </div>
      </section>

    </div>
  );
}
