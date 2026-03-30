export const dynamic = "force-static";

import type { CSSProperties } from "react";
import Link from "next/link";
import { polarAnchorLaunch } from "../../../lib/recentWork";

export const metadata = {
  title: `${polarAnchorLaunch.tileTitle} | Client Launch`,
  description: "Live website and quote system launch for a freight forwarding business."
};

const setupNow = [
  "Freight and vehicle-shipping service structure",
  "Quote path tuned for high-intent logistics inquiries",
  "Launch-ready messaging for cargo, customs, and shipping coordination"
] as const;

function getBrandStyle() {
  return {
    "--launch-accent": polarAnchorLaunch.brand.accent,
    "--launch-accent-soft": polarAnchorLaunch.brand.accentSoft,
    "--launch-accent-glow": polarAnchorLaunch.brand.accentGlow,
    "--launch-accent-surface": polarAnchorLaunch.brand.accentSurface
  } as CSSProperties;
}

export default function PolarAnchorCaseStudy() {
  return (
    <article className="container page-content case-study">
      <section className="card case-study-brand-hero" style={getBrandStyle()}>
        <div className="case-study-brand-lockup">
          <div className="client-launch-brand-mark case-study-brand-mark" aria-hidden="true">
            {polarAnchorLaunch.brand.mark}
          </div>
          <div className="case-study-brand-copy">
            <p className="eyebrow">Client Launch</p>
            <h1>{polarAnchorLaunch.tileTitle}</h1>
            <span className="status-pill">{polarAnchorLaunch.status}</span>
            <p className="lead">{polarAnchorLaunch.subtitle}</p>
          </div>
        </div>

        <div className="case-study-brand-actions">
          <a
            className="btn btn-secondary"
            href={polarAnchorLaunch.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Polar Anchor
          </a>
        </div>
      </section>

      <section className="case-study-section">
        <h2>Snapshot</h2>
        <div className="cards-grid cards-grid-3 overview-grid">
          <div className="card overview-card">
            <p className="eyebrow">Service lane</p>
            <h3>{polarAnchorLaunch.service}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Best-fit offer</p>
            <h3>{polarAnchorLaunch.offerProof.label}</h3>
            <p className="muted">{polarAnchorLaunch.offerProof.rationale}</p>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Current focus</p>
            <h3>{polarAnchorLaunch.phase?.label || "Live"}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Next milestone</p>
            <h3>Quote form optimization</h3>
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
          {(polarAnchorLaunch.currentFocus ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Next milestone</h2>
        <ul className="case-study-list">
          {(polarAnchorLaunch.nextMilestone ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Need a similar operator-led build path?</h2>
            <p className="muted">
              Una Labs can scope a website and quote system, then carry it through delivery,
              iteration, and handoff.
            </p>
          </div>
          <div className="product-actions">
            <Link
              href={`/work-with-ftc?offer=${polarAnchorLaunch.offerProof.value}`}
              className="btn btn-primary"
              data-analytics-event="start_project_click"
              data-analytics-location="case_study"
              data-analytics-label="polar-anchor"
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
