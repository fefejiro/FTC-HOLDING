export const dynamic = "force-static";

import type { CSSProperties } from "react";
import Link from "next/link";
import { gardenCleanersLaunch } from "../../../lib/recentWork";

export const metadata = {
  title: `${gardenCleanersLaunch.tileTitle} | Client Launch`,
  description: "Live website and booking-path launch for a cleaning services business."
};

const setupNow = [
  "Service packaging for residential and commercial cleaning",
  "Booking and quote path clarity for recurring and move-in/out work",
  "Local SEO structure for Oshawa and Durham Region expansion"
] as const;

function getBrandStyle() {
  return {
    "--launch-accent": gardenCleanersLaunch.brand.accent,
    "--launch-accent-soft": gardenCleanersLaunch.brand.accentSoft,
    "--launch-accent-glow": gardenCleanersLaunch.brand.accentGlow,
    "--launch-accent-surface": gardenCleanersLaunch.brand.accentSurface
  } as CSSProperties;
}

export default function GardenCleanersCaseStudy() {
  return (
    <article className="container page-content case-study">
      <section className="card case-study-brand-hero" style={getBrandStyle()}>
        <div className="case-study-brand-lockup">
          <div className="client-launch-brand-mark case-study-brand-mark" aria-hidden="true">
            {gardenCleanersLaunch.brand.mark}
          </div>
          <div className="case-study-brand-copy">
            <p className="eyebrow">Client Launch</p>
            <h1>{gardenCleanersLaunch.tileTitle}</h1>
            <span className="status-pill">{gardenCleanersLaunch.status}</span>
            <p className="lead">{gardenCleanersLaunch.subtitle}</p>
          </div>
        </div>

        <div className="case-study-brand-actions">
          <a
            className="btn btn-secondary"
            href={gardenCleanersLaunch.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Garden Cleaners
          </a>
        </div>
      </section>

      <section className="case-study-section">
        <h2>Snapshot</h2>
        <div className="cards-grid cards-grid-3 overview-grid">
          <div className="card overview-card">
            <p className="eyebrow">Service lane</p>
            <h3>{gardenCleanersLaunch.service}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Best-fit offer</p>
            <h3>{gardenCleanersLaunch.offerProof.label}</h3>
            <p className="muted">{gardenCleanersLaunch.offerProof.rationale}</p>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Current focus</p>
            <h3>{gardenCleanersLaunch.phase?.label || "Live"}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Next milestone</p>
            <h3>Recurring booking path</h3>
          </div>
        </div>
      </section>

      <section className="case-study-section">
        <h2>What this launch proves</h2>
        <ul className="case-study-list">
          {setupNow.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Current focus</h2>
        <ul className="case-study-list">
          {(gardenCleanersLaunch.currentFocus ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Next milestone</h2>
        <ul className="case-study-list">
          {(gardenCleanersLaunch.nextMilestone ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Need a similar local lead and booking setup?</h2>
            <p className="muted">
              Una Labs can scope the right booking path, service packaging, and growth-ready setup
              before the build widens.
            </p>
          </div>
          <div className="product-actions">
            <Link
              href={`/work-with-ftc?offer=${gardenCleanersLaunch.offerProof.value}`}
              className="btn btn-primary"
              data-analytics-event="start_project_click"
              data-analytics-location="case_study"
              data-analytics-label="garden-cleaners"
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
