export const runtime = "edge";

import type { Metadata } from "next";
import SummaryClient from "./SummaryClient";

export const metadata: Metadata = {
  title: "Review Your Project | Una Labs",
  description: "Review your project brief and choose a payment plan to get started.",
  robots: { index: false }
};

export default function SummaryPage() {
  return (
    <div className="summary-page main-shell">
      <section className="section section-hero">
        <div className="container">
          <div className="summary-hero">
            <p className="eyebrow">Step 2 of 3 — Review &amp; pay</p>
            <h1>Here's your project brief.</h1>
            <p className="lead">
              Review the summary below. If everything looks right, choose a payment plan to proceed.
            </p>
            <div className="build-hero-steps">
              <div className="build-step build-step--done">
                <span className="build-step-num">✓</span>
                <span>Intake</span>
              </div>
              <span className="build-step-sep">→</span>
              <div className="build-step build-step--active">
                <span className="build-step-num">2</span>
                <span>Summary</span>
              </div>
              <span className="build-step-sep">→</span>
              <div className="build-step">
                <span className="build-step-num">3</span>
                <span>Payment</span>
              </div>
              <span className="build-step-sep">→</span>
              <div className="build-step">
                <span className="build-step-num">4</span>
                <span>Build starts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SummaryClient />
        </div>
      </section>
    </div>
  );
}
