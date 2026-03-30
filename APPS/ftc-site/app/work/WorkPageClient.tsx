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

export default function WorkPageClient() {
  const [featuredLaunch, ...additionalLaunches] = Array.from(clientLaunches);
  const launchesByOffer = new Map(clientLaunches.map((launch) => [launch.offerProof.value, launch]));

  return (
    <div className="container page-content client-launches-page">
      <section className="client-launches-hero">
        <p className="eyebrow">Client Launches</p>
        <h1>Proof that Una Labs can scope and ship real systems.</h1>
        <p className="page-intro">
          Client Launches shows the delivery side of the studio: real onboarding, real operating
          context, and real systems in motion. Products stays reserved for Una Labs-owned tools
          like PeacePad, SayWetin, Dispatch, and ATEAM.
        </p>
      </section>

      <section className="client-launch-offer-map" aria-label="Offer proof map">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Choose the proof lane</p>
          <h2>Each offer already has a live reference point.</h2>
          <p>
            Start with the kind of commercial path you need, then inspect the closest launch
            snapshot before sending your own request.
          </p>
        </div>
        <div className="cards-grid cards-grid-3 client-launch-offer-grid">
          {engagementOffers.map((offer) => {
            const launch = launchesByOffer.get(offer.value);
            return (
              <article key={offer.value} className="card client-launch-offer-card">
                <div className="client-launch-offer-head">
                  <p className="status-pill">{offer.title}</p>
                  <p className="work-intake-offer-price">{offer.price}</p>
                </div>
                <p>{offer.summary}</p>
                <p className="muted">{offer.idealFor}</p>
                {launch ? (
                  <div className="client-launch-offer-example">
                    <p className="eyebrow">Live example</p>
                    <h3>{launch.brand.wordmark}</h3>
                    <p className="muted">{offer.proofPrompt}</p>
                    <div className="proof-tags" aria-label={`${launch.brand.wordmark} tags`}>
                      {launch.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="proof-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="client-launch-actions">
                      <Link href={`/work/${launch.slug}`} prefetch={false} className="btn btn-secondary">
                        View proof
                      </Link>
                      <Link
                        href={`/work-with-ftc?offer=${offer.value}`}
                        prefetch={false}
                        className="btn btn-primary"
                      >
                        Start this path
                      </Link>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
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
              <p className="muted">
                This is the kind of work Una Labs is built to do: take a rough operational or
                growth problem, scope it quickly, and move it into a live system.
              </p>
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
            <div className="client-launch-signal client-launch-offer-proof">
              <p className="client-launch-signal-title">Best-fit offer</p>
              <p className="client-launch-offer-label">{featuredLaunch.offerProof.label}</p>
              <p className="muted">{featuredLaunch.offerProof.rationale}</p>
            </div>
          </div>

          <div className="client-launch-actions">
            <Link href={`/work/${featuredLaunch.slug}`} prefetch={false} className="btn btn-secondary">
              View onboarding snapshot
            </Link>
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

      {additionalLaunches.length > 0 ? (
        <section className="client-launches-grid-section">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Also live</p>
            <h2>More client launches</h2>
            <p>Live websites, lead systems, and delivery tracks that show how Una Labs turns scoped work into operating reality.</p>
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

                <div className="client-launch-proof-inline">
                  <span className="client-launch-proof-pill">{launch.offerProof.label}</span>
                  <p className="muted">{launch.offerProof.rationale}</p>
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
                  <Link href={`/work/${launch.slug}`} prefetch={false} className="btn btn-secondary">
                    View launch snapshot
                  </Link>
                  <a
                    href={launch.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Visit live site
                  </a>
                  <Link
                    href={`/work-with-ftc?offer=${launch.offerProof.value}`}
                    prefetch={false}
                    className="btn btn-primary"
                  >
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
          <h2>Need proof, then a clear project path?</h2>
          <p className="muted">
            If one of these launches looks close to your situation, use the matching offer path
            and Una Labs will respond with the shortest credible next move.
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
