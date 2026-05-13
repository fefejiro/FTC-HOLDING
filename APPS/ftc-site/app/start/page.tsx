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
              Fill this out and we&apos;ll generate a structured summary of your project.
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
          <div className="build-mobile-intro card">
            <p className="build-mobile-intro-label">How this works</p>
            <div className="build-mobile-intro-grid">
              <div className="build-mobile-intro-item">
                <strong>Tell us the core idea</strong>
                <p>Keep it practical. What are you building and who is it for?</p>
              </div>
              <div className="build-mobile-intro-item">
                <strong>Review the generated brief</strong>
                <p>We turn your answers into a clean summary before any payment happens.</p>
              </div>
              <div className="build-mobile-intro-item">
                <strong>Choose deposit or full payment</strong>
                <p>Secure Stripe checkout. No card details stored on our side.</p>
              </div>
            </div>
          </div>

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
                  <strong>$3,999 CAD</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
