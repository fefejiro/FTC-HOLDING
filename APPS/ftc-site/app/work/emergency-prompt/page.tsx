import Link from "next/link";
import { emergencyPromptCaseStudy } from "../../../lib/recentWork";

export const metadata = {
  title: `${emergencyPromptCaseStudy.tileTitle} | Client Launch`,
  description: "Live onboarding snapshot for a local-service lead engine setup."
};

const setupNow = [
  "Service clarity and offer framing",
  "Local search structure for high-intent discovery",
  "Lead capture path from visit to inbound call"
] as const;

export default function EmergencyPromptCaseStudy() {
  return (
    <article className="container page-content case-study">
      <p className="eyebrow">Client Launch</p>
      <h1>{emergencyPromptCaseStudy.tileTitle}</h1>
      <span className="status-pill">{emergencyPromptCaseStudy.status}</span>
      <p className="lead">{emergencyPromptCaseStudy.subtitle}</p>

      <section className="case-study-section">
        <h2>Snapshot</h2>
        <div className="cards-grid cards-grid-3 overview-grid">
          <div className="card overview-card">
            <p className="eyebrow">Service lane</p>
            <h3>{emergencyPromptCaseStudy.service}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Current focus</p>
            <h3>Phase 1 setup</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Next milestone</p>
            <h3>Launch-ready homepage draft</h3>
          </div>
        </div>
      </section>

      <section className="case-study-section">
        <h2>What is being set up now</h2>
        <ul className="case-study-list">
          {setupNow.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Current focus</h2>
        <ul className="case-study-list">
          {(emergencyPromptCaseStudy.currentFocus ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Next milestone</h2>
        <ul className="case-study-list">
          {(emergencyPromptCaseStudy.nextMilestone ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>External links</h2>
        <div className="hero-actions">
          <a
            className="btn btn-secondary"
            href={emergencyPromptCaseStudy.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Emergency Prompt
          </a>
          <a
            className="btn btn-secondary"
            href={emergencyPromptCaseStudy.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View YouTube channel
          </a>
        </div>
      </section>

      <section className="case-study-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Want a similar setup for your business?</h2>
            <p className="muted">
              Una Labs can scope a fast delivery path for a website, lead engine, or AI-assisted
              workflow that needs to become real quickly.
            </p>
          </div>
          <div className="product-actions">
            <Link
              href="/work-with-ftc"
              className="btn btn-primary"
              data-analytics-event="start_project_click"
              data-analytics-location="case_study"
              data-analytics-label="emergency-prompt"
            >
              Start a similar project
            </Link>
            <Link
              href="/work"
              className="btn btn-secondary"
              data-analytics-event="view_work_click"
              data-analytics-location="case_study"
            >
              Back to Client Launches
            </Link>
          </div>
        </article>
      </section>
    </article>
  );
}
