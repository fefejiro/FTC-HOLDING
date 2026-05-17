"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { clientLaunches } from "../../lib/recentWork";
import { engagementOffers } from "../../lib/engagementOffers";

function getLaunchBrandStyle(accent?: string, accentSoft?: string, accentGlow?: string, accentSurface?: string) {
  return {
    "--launch-accent": accent || "#6ed4ff",
    "--launch-accent-soft": accentSoft || "rgba(110, 212, 255, 0.16)",
    "--launch-accent-glow": accentGlow || "rgba(110, 212, 255, 0.24)",
    "--launch-accent-surface": accentSurface || "linear-gradient(180deg, rgba(110, 212, 255, 0.18), rgba(110, 212, 255, 0.04))"
  } as CSSProperties;
}

function PhaseBar({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="wl-phase-bar" aria-label={`Phase ${current} of ${total}: ${label}`}>
      <div className="wl-phase-track">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`wl-phase-pip${i < current ? " wl-phase-pip--done" : i === current - 1 ? " wl-phase-pip--active" : ""}`}
          />
        ))}
      </div>
      <span className="wl-phase-label">{label} — Phase {current}/{total}</span>
    </div>
  );
}

export default function WorkPageClient() {
  const [featuredLaunch, ...additionalLaunches] = Array.from(clientLaunches);
  const launchesByOffer = new Map(clientLaunches.map((l) => [l.offerProof.value, l]));
  const totalLive = clientLaunches.filter((l) => String(l.status).toLowerCase().includes("live")).length;

  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <div className="container client-launches-page">

        {/* ── Hero ── */}
        <section className="wl-hero">
          <div className="wl-hero-copy">
            <p className="sunrise-kicker">Client Launches</p>
            <h1>Live delivery snapshots, kept separate from products.</h1>
            <p className="sunrise-lead">
              Every project below moved through structured intake, a clear scope decision, and governed
              delivery execution. This is the delivery side of the studio — not a portfolio, a live track record.
            </p>
          </div>
        <div className="wl-hero-stats" aria-label="Studio delivery stats">
          <div className="wl-stat">
            <span className="wl-stat-value">{clientLaunches.length}</span>
            <span className="wl-stat-label">Active launches</span>
          </div>
          <div className="wl-stat">
            <span className="wl-stat-value">{totalLive}</span>
            <span className="wl-stat-label">Live right now</span>
          </div>
          <div className="wl-stat">
            <span className="wl-stat-value">3</span>
            <span className="wl-stat-label">Offer tracks</span>
          </div>
          <div className="wl-stat">
            <span className="wl-stat-value">48h</span>
            <span className="wl-stat-label">Typical first reply</span>
          </div>
        </div>
      </section>

      {/* ── Offer map ── */}
      <section className="wl-offer-section" aria-label="Engagement offer paths">
        <div className="wl-section-head">
          <p className="eyebrow">Pick your path</p>
          <h2>Each track has a live reference point.</h2>
          <p className="wl-section-sub">
            Start with the offer that matches where you are. Each one links directly to a live project
            that came through the same path.
          </p>
        </div>
        <div className="wl-offer-grid">
          {engagementOffers.map((offer, i) => {
            const launch = launchesByOffer.get(offer.value);
            return (
              <article key={offer.value} className={`wl-offer-card${i === 1 ? " wl-offer-card--featured" : ""}`}>
                <div className="wl-offer-card-head">
                  <div className="wl-offer-track-badge">{offer.title}</div>
                  <p className="wl-offer-price">{offer.price}</p>
                </div>
                <p className="wl-offer-summary">{offer.summary}</p>
                <p className="wl-offer-ideal">
                  <span className="wl-offer-ideal-label">Best for</span> {offer.idealFor}
                </p>
                {launch ? (
                  <div className="wl-offer-example">
                    <div className="wl-offer-example-head">
                      <div
                        className="wl-offer-example-mark"
                        style={{ "--launch-accent": launch.brand.accent } as CSSProperties}
                      >
                        {launch.brand.mark}
                      </div>
                      <div>
                        <p className="wl-offer-example-kicker">Live reference</p>
                        <p className="wl-offer-example-name">{launch.brand.wordmark}</p>
                      </div>
                    </div>
                    <div className="proof-tags">
                      {launch.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="proof-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="wl-offer-actions">
                  {launch ? (
                    <Link href={`/work/${launch.slug}`} prefetch={false} className="btn btn-secondary wl-btn-sm">
                      View reference
                    </Link>
                  ) : null}
                  <Link
                    href={`/work-with-ftc?offer=${offer.value}`}
                    prefetch={false}
                    className={`btn wl-btn-sm${i === 1 ? " btn-primary" : " btn-secondary"}`}
                  >
                    Start this path →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="wl-divider" aria-hidden="true">
        <span className="wl-divider-label">Live launches</span>
      </div>

      {/* ── Featured launch ── */}
      {featuredLaunch ? (
        <article
          className="wl-launch-card wl-launch-card--featured"
          style={getLaunchBrandStyle(
            featuredLaunch.brand.accent,
            featuredLaunch.brand.accentSoft,
            featuredLaunch.brand.accentGlow,
            featuredLaunch.brand.accentSurface
          )}
        >
          <div className="wl-launch-header">
            <div className="wl-launch-brand">
              <div className="wl-launch-mark" aria-hidden="true">{featuredLaunch.brand.mark}</div>
              <div className="wl-launch-brand-copy">
                <div className="wl-launch-eyebrow">Featured launch</div>
                <h2 className="wl-launch-name">{featuredLaunch.brand.wordmark}</h2>
                <p className="wl-launch-subtitle">{featuredLaunch.subtitle}</p>
              </div>
            </div>
            <div className="wl-launch-header-right">
              <span className="wl-status-pill wl-status-pill--live">● Live</span>
              {featuredLaunch.lastUpdatedLabel ? (
                <span className="wl-update-label">{featuredLaunch.lastUpdatedLabel}</span>
              ) : null}
            </div>
          </div>

          <div className="wl-launch-service-row">
            <span className="wl-launch-service">{featuredLaunch.service}</span>
            <div className="proof-tags">
              {featuredLaunch.tags.map((tag) => (
                <span key={tag} className="proof-tag">{tag}</span>
              ))}
            </div>
          </div>

          <p className="wl-launch-summary">{featuredLaunch.summary}</p>

          {featuredLaunch.phase ? (
            <PhaseBar
              current={featuredLaunch.phase.current}
              total={featuredLaunch.phase.total}
              label={featuredLaunch.phase.label}
            />
          ) : null}

          <div className="wl-launch-signals">
            <div className="wl-signal-block">
              <p className="wl-signal-title">Current focus</p>
              <ul className="wl-signal-list">
                {(featuredLaunch.currentFocus ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="wl-signal-block">
              <p className="wl-signal-title">Next milestone</p>
              <ul className="wl-signal-list">
                {(featuredLaunch.nextMilestone ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="wl-signal-block wl-signal-offer">
              <p className="wl-signal-title">Engagement track</p>
              <span className="wl-offer-badge">{featuredLaunch.offerProof.label}</span>
              <p className="wl-signal-rationale">{featuredLaunch.offerProof.rationale}</p>
            </div>
          </div>

          <div className="wl-launch-actions">
            <Link href={`/work/${featuredLaunch.slug}`} prefetch={false} className="btn btn-secondary">
              View onboarding snapshot
            </Link>
            <a
              href={featuredLaunch.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Visit live site ↗
            </a>
            <Link
              href={`/work-with-ftc?offer=${featuredLaunch.offerProof.value}`}
              prefetch={false}
              className="btn btn-primary"
            >
              Start a similar project
            </Link>
          </div>
        </article>
      ) : null}

      {/* ── Additional launches ── */}
      {additionalLaunches.length > 0 ? (
        <section className="wl-grid-section">
          <div className="wl-section-head">
            <p className="eyebrow">Also live</p>
            <h2>More active launches</h2>
            <p className="wl-section-sub">
              Live systems in motion — each with a delivery track, current focus, and an open path to start something similar.
            </p>
          </div>
          <div className="wl-launches-grid">
            {additionalLaunches.map((launch) => (
              <article
                key={launch.slug}
                className="wl-launch-card"
                style={getLaunchBrandStyle(
                  launch.brand.accent,
                  launch.brand.accentSoft,
                  launch.brand.accentGlow,
                  launch.brand.accentSurface
                )}
              >
                <div className="wl-launch-header">
                  <div className="wl-launch-brand">
                    <div className="wl-launch-mark wl-launch-mark--sm" aria-hidden="true">{launch.brand.mark}</div>
                    <div className="wl-launch-brand-copy">
                      <h3 className="wl-launch-name">{launch.brand.wordmark}</h3>
                      <p className="wl-launch-subtitle">{launch.subtitle}</p>
                    </div>
                  </div>
                  <span className="wl-status-pill wl-status-pill--live">● Live</span>
                </div>

                <div className="wl-launch-service-row">
                  <span className="wl-launch-service">{launch.service}</span>
                  <div className="proof-tags">
                    {launch.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="proof-tag">{tag}</span>
                    ))}
                  </div>
                </div>

                <p className="wl-launch-summary">{launch.summary}</p>

                {launch.phase ? (
                  <PhaseBar
                    current={launch.phase.current}
                    total={launch.phase.total}
                    label={launch.phase.label}
                  />
                ) : null}

                <div className="wl-launch-signals wl-launch-signals--compact">
                  <div className="wl-signal-block">
                    <p className="wl-signal-title">Current focus</p>
                    <ul className="wl-signal-list">
                      {(launch.currentFocus ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="wl-signal-block">
                    <p className="wl-signal-title">Next milestone</p>
                    <ul className="wl-signal-list">
                      {(launch.nextMilestone ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="wl-offer-pill-row">
                  <span className="wl-offer-badge">{launch.offerProof.label}</span>
                  {launch.lastUpdatedLabel ? (
                    <span className="wl-update-label">{launch.lastUpdatedLabel}</span>
                  ) : null}
                </div>

                <div className="wl-launch-actions">
                  <Link href={`/work/${launch.slug}`} prefetch={false} className="btn btn-secondary">
                    View snapshot
                  </Link>
                  <a
                    href={launch.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Visit site ↗
                  </a>
                  <Link
                    href={`/work-with-ftc?offer=${launch.offerProof.value}`}
                    prefetch={false}
                    className="btn btn-primary"
                  >
                    Start similar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Final CTA ── */}
      <article className="wl-cta-card">
        <div className="wl-cta-copy">
          <p className="eyebrow">Next step</p>
          <h2>One of these looks like your situation?</h2>
          <p>
            Pick the matching offer track and send a request. Una Labs will reply with the
            shortest credible next move — usually within 48 hours.
          </p>
        </div>
        <div className="wl-cta-actions">
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a project
          </Link>
          <Link href="/pricing" prefetch={false} className="btn btn-secondary">
            View pricing
          </Link>
        </div>
      </article>
      </div>
    </div>
  );
}
