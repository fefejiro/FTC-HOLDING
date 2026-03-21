import Link from "next/link";
import {
  emergencyPromptCaseStudy,
  emergencyPromptHasPermission
} from "../../../lib/recentWork";

export const metadata = {
  title: `${emergencyPromptCaseStudy.tileTitle} | Una Labs Work`,
  description: "Lead engine setup case study focused on local intent and inbound conversions."
};

const phaseOneDeliverables = [
  "YouTube channel setup",
  "Asset intake pipeline (Drive)",
  "First uploads (2–3 videos)",
  "Title, description, keywords optimized for local intent",
  "Clear call-to-action and contact placement"
];

const phaseTwoNextSteps = [
  "Consistent posting cadence",
  "Thumbnail standardization",
  "Local search optimization improvements",
  "Conversion tracking plan"
];

export default function EmergencyPromptCaseStudy() {
  return (
    <article className="container page-content case-study">
      <p className="eyebrow">Recent Work</p>
      <h1>{emergencyPromptCaseStudy.tileTitle}</h1>
      <span className="status-pill">{emergencyPromptCaseStudy.status}</span>
      <p className="lead">{emergencyPromptCaseStudy.subtitle}</p>

      <section className="case-study-section">
        <h2>Overview</h2>
        <div className="cards-grid cards-grid-3 overview-grid">
          <div className="card overview-card">
            <p className="eyebrow">Client</p>
            <h3>{emergencyPromptCaseStudy.clientName}</h3>
            {!emergencyPromptHasPermission ? (
              <p className="muted">Permission pending for public attribution.</p>
            ) : null}
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Service</p>
            <h3>{emergencyPromptCaseStudy.service}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Status</p>
            <h3>{emergencyPromptCaseStudy.status}</h3>
          </div>
        </div>
      </section>

      <section className="case-study-section">
        <h2>The problem</h2>
        <p>
          Spending on clicks with weak call conversion and low visibility on what is
          actually working.
        </p>
      </section>

      <section className="case-study-section">
        <h2>What we delivered (Phase 1)</h2>
        <ul className="case-study-list">
          {phaseOneDeliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Next steps (Phase 2)</h2>
        <ul className="case-study-list">
          {phaseTwoNextSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Link out</h2>
        {emergencyPromptHasPermission ? (
          <a
            className="btn btn-secondary"
            href={emergencyPromptCaseStudy.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Emergency Prompt
          </a>
        ) : (
          <p className="muted">
            External link available after client permission is confirmed.
          </p>
        )}
      </section>

      <section className="case-study-section">
        <h2>Build Something Similar</h2>
        <p className="muted">
          Want a lead engine that keeps attribution, calls, and conversions visible?
          Una Labs can scope a fast setup path.
        </p>
        <div className="hero-actions">
          <Link
            href="/work-with-ftc"
            className="btn btn-primary"
            data-analytics-event="start_project_click"
            data-analytics-location="case_study"
            data-analytics-label="emergency-prompt"
          >
            Start a Project
          </Link>
          <Link
            href="/work"
            className="btn btn-secondary"
            data-analytics-event="view_work_click"
            data-analytics-location="case_study"
          >
            Back to Work
          </Link>
        </div>
      </section>
    </article>
  );
}
