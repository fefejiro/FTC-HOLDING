export const dynamic = "force-static";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ogTradesAcademyLaunch } from "../../../lib/recentWork";

export const metadata = {
  title: `${ogTradesAcademyLaunch.tileTitle} | Client Launch`,
  description: "Premium education website and lead system launch for a forex trading academy."
};

const launchProof = [
  "Branded education microsite with course, resources, community, and contact pages",
  "Embedded YouTube catalog used as on-site authority content",
  "First-party enrollment form and dedicated lead endpoint for course inquiries"
] as const;

function getBrandStyle() {
  return {
    "--launch-accent": ogTradesAcademyLaunch.brand.accent,
    "--launch-accent-soft": ogTradesAcademyLaunch.brand.accentSoft,
    "--launch-accent-glow": ogTradesAcademyLaunch.brand.accentGlow,
    "--launch-accent-surface": ogTradesAcademyLaunch.brand.accentSurface
  } as CSSProperties;
}

export default function OgTradesAcademyCaseStudy() {
  return (
    <article className="container page-content case-study">
      <section className="card case-study-brand-hero" style={getBrandStyle()}>
        <div className="case-study-brand-lockup">
          <div className="client-launch-brand-mark case-study-brand-mark" aria-hidden="true">
            {ogTradesAcademyLaunch.brand.mark}
          </div>
          <div className="case-study-brand-copy">
            <p className="eyebrow">Client Launch</p>
            <h1>{ogTradesAcademyLaunch.tileTitle}</h1>
            <span className="status-pill">{ogTradesAcademyLaunch.status}</span>
            <p className="lead">{ogTradesAcademyLaunch.subtitle}</p>
          </div>
        </div>

        <div className="case-study-brand-actions">
          <a className="btn btn-secondary" href={ogTradesAcademyLaunch.websiteUrl} target="_blank" rel="noopener noreferrer">
            Visit the site
          </a>
        </div>
      </section>

      <section className="case-study-section">
        <h2>Snapshot</h2>
        <div className="cards-grid cards-grid-3 overview-grid">
          <div className="card overview-card">
            <p className="eyebrow">Service lane</p>
            <h3>{ogTradesAcademyLaunch.service}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Best-fit offer</p>
            <h3>{ogTradesAcademyLaunch.offerProof.label}</h3>
            <p className="muted">{ogTradesAcademyLaunch.offerProof.rationale}</p>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Current focus</p>
            <h3>{ogTradesAcademyLaunch.phase?.label || "Live"}</h3>
          </div>
          <div className="card overview-card">
            <p className="eyebrow">Next milestone</p>
            <h3>Email automation hookup</h3>
          </div>
        </div>
      </section>

      <section className="case-study-section">
        <h2>What this launch proves</h2>
        <ul className="case-study-list">
          {launchProof.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Current focus</h2>
        <ul className="case-study-list">
          {(ogTradesAcademyLaunch.currentFocus ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Next milestone</h2>
        <ul className="case-study-list">
          {(ogTradesAcademyLaunch.nextMilestone ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Need a premium content and conversion site for your offer?</h2>
            <p className="muted">
              Una Labs can take a creator or education brand from scattered links into a structured website, lead system, and growth-ready content stack.
            </p>
          </div>
          <div className="product-actions">
            <Link href={`/work-with-ftc?offer=${ogTradesAcademyLaunch.offerProof.value}`} className="btn btn-primary">
              Start a similar project
            </Link>
            <Link href="/work" className="btn btn-secondary">
              Back to Client Launches
            </Link>
          </div>
        </article>
      </section>
    </article>
  );
}

