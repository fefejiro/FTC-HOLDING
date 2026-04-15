export const runtime = "edge";

import type { Metadata } from "next";
import IntakeForm from "./IntakeForm";

export const metadata: Metadata = {
  title: "Start Your Build | Una Labs",
  description:
    "Tell us about your project. We'll scope it, confirm fit, and get your Version 1 shipped in one month.",
  alternates: {
    canonical: "https://unalabs.cloud/start"
  }
};

export default function BuildPage() {
  return (
    <div className="build-page main-shell">
      <section className="section section-hero">
        <div className="container">
          <div className="build-hero">
            <p className="eyebrow">App Development Package — Starting at $3,999</p>
            <h1>Tell us about your project.</h1>
            <p className="lead">
              Fill this out and we'll generate a structured summary of your project.
              Then you choose how to proceed — deposit or pay in full.
            </p>
            <div className="build-hero-steps">
              <div className="build-step build-step--active">
                <span className="build-step-num">1</span>
                <span>Intake</span>
              </div>
              <span className="build-step-sep">→</span>
              <div className="build-step">
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
          <div className="build-layout">
            <div className="build-form-col">
              <div className="card build-form-card">
                <IntakeForm />
              </div>
            </div>

            <aside className="build-sidebar">
              <div className="card build-sidebar-card">
                <h3>What happens next?</h3>
                <ol className="build-next-steps">
                  <li>
                    <strong>You review your summary</strong>
                    <p>We generate a structured project brief from your answers.</p>
                  </li>
                  <li>
                    <strong>You choose a payment plan</strong>
                    <p>Pay $999 deposit to start, or $3,999 to go all in.</p>
                  </li>
                  <li>
                    <strong>Stripe handles payment</strong>
                    <p>Secure checkout. No card stored on our end.</p>
                  </li>
                  <li>
                    <strong>Build starts</strong>
                    <p>You get a kickoff message within 24 hours of payment.</p>
                  </li>
                </ol>
              </div>

              <div className="card build-sidebar-card build-package-summary">
                <p className="build-sidebar-label">Your package</p>
                <p className="build-sidebar-package">App Development Package</p>
                <ul className="build-sidebar-includes">
                  <li>1-month focused build (Version 1)</li>
                  <li>1 month complimentary support</li>
                  <li>Production deployment</li>
                  <li>Founder-direct communication</li>
                </ul>
                <div className="build-sidebar-price">
                  <span>Starting at</span>
                  <strong>$3,999 USD</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
