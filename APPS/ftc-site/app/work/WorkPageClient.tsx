"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { clientLaunches } from "../../lib/recentWork";

function getLaunchBrandStyle(accent?: string, accentSoft?: string, accentGlow?: string, accentSurface?: string) {
  return {
    "--launch-accent": accent || "#6ed4ff",
    "--launch-accent-soft": accentSoft || "rgba(110, 212, 255, 0.16)",
    "--launch-accent-glow": accentGlow || "rgba(110, 212, 255, 0.24)",
    "--launch-accent-surface": accentSurface || "linear-gradient(180deg, rgba(110, 212, 255, 0.18), rgba(110, 212, 255, 0.04))"
  } as CSSProperties;
}

export default function WorkPageClient() {
  const [featuredLaunch, ...additionalLaunches] = Array.from(clientLaunches);

  return (
    <div className="container page-content client-launches-page">
      <section className="client-launches-hero">
        <p className="eyebrow">Client Launches</p>
        <h1>Live delivery snapshots, with the client identity carried through the work.</h1>
        <p className="page-intro">
          Client Launches shows real onboarding and setup work in progress. Products stays reserved
          for Una Labs-owned tools like PeacePad, SayWetin, and ATEAM.
        </p>
      </section>

      {featuredLaunch ? (
        <article
          className="card client-launch-card client-launch-card--featured client-launch-card--brand"
          style={getLaunchBrandStyle(
            featuredLaunch.brand.accent,
            featuredLaunch.brand.accentSoft,
            featuredLaunch.brand.accentGlow,
            featuredLaunch.brand.accentSurface
          )}
        >
          <div className="client-launch-brand-bar">
            <div className="client-launch-brand-lockup">
              <div className="client-launch-brand-mark" aria-hidden="true">
                {featuredLaunch.brand.mark}
              </div>
              <div className="client-launch-brand-copy">
                <p className="eyebrow">Live client launch</p>
                <h2>{featuredLaunch.brand.wordmark}</h2>
                <p className="muted">{featuredLaunch.subtitle}</p>
              </div>
            </div>
            <div className="client-launch-brand-meta">
              <p className="status-pill">{featuredLaunch.status}</p>
              <a
                href={featuredLaunch.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-link"
              >
                Visit live site
              </a>
            </div>
          </div>

          <div className="featured-launch-head">
            <div>
              <p className="client-launch-service">{featuredLaunch.service}</p>
              <p className="client-launch-summary">{featuredLaunch.summary}</p>
            </div>
            <div className="proof-tags" aria-label={`${featuredLaunch.tileTitle} tags`}>
              {featuredLaunch.tags.map((tag) => (
                <span key={tag} className="proof-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="featured-launch-grid">
            <div className="client-launch-signal">
              <p className="client-launch-signal-title">Current focus</p>
              <ul className="client-launch-signal-list">
                {(featuredLaunch.currentFocus ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="client-launch-signal">
              <p className="client-launch-signal-title">Next milestone</p>
              <ul className="client-launch-signal-list">
                {(featuredLaunch.nextMilestone ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="client-launch-actions">
            <Link href={`/work/${featuredLaunch.slug}`} prefetch={false} className="btn btn-secondary">
              View onboarding snapshot
            </Link>
            <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
              Start a similar project
            </Link>
          </div>
        </article>
      ) : null}

      {additionalLaunches.length > 0 ? (
        <section className="client-launches-grid-section">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Also live</p>
            <h2>More client launches</h2>
            <p>Live websites and lead systems built for clients and actively serving their markets.</p>
          </div>
          <div className="cards-grid cards-grid-2 client-launches-grid">
            {additionalLaunches.map((launch) => (
              <article
                key={launch.slug}
                className="card client-launch-card client-launch-card--brand"
                style={getLaunchBrandStyle(
                  launch.brand.accent,
                  launch.brand.accentSoft,
                  launch.brand.accentGlow,
                  launch.brand.accentSurface
                )}
              >
                <div className="client-launch-brand-bar">
                  <div className="client-launch-brand-lockup">
                    <div className="client-launch-brand-mark" aria-hidden="true">
                      {launch.brand.mark}
                    </div>
                    <div className="client-launch-brand-copy">
                      <h3>{launch.brand.wordmark}</h3>
                      <p className="muted">{launch.subtitle}</p>
                    </div>
                  </div>
                  <p className="status-pill">{launch.status}</p>
                </div>

                <p className="client-launch-service">{launch.service}</p>
                <p className="client-launch-summary">{launch.summary}</p>

                <div className="proof-tags" aria-label={`${launch.tileTitle} tags`}>
                  {launch.tags.map((tag) => (
                    <span key={tag} className="proof-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="featured-launch-grid">
                  <div className="client-launch-signal">
                    <p className="client-launch-signal-title">Current focus</p>
                    <ul className="client-launch-signal-list">
                      {(launch.currentFocus ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="client-launch-signal">
                    <p className="client-launch-signal-title">Next milestone</p>
                    <ul className="client-launch-signal-list">
                      {(launch.nextMilestone ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="client-launch-actions">
                  <a
                    href={launch.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Visit live site
                  </a>
                  <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                    Start a similar project
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Need a launch path like this for your own business?</h2>
          <p className="muted">
            Una Labs can scope the shortest credible setup for your website, lead path, or
            AI-assisted workflow.
          </p>
        </div>
        <div className="product-actions">
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a Project
          </Link>
          <Link href="/ateam" prefetch={false} className="btn btn-secondary">
            Open ATEAM
          </Link>
        </div>
      </article>
    </div>
  );
}
