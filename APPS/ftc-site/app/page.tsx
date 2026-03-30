export const dynamic = "force-static";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { emergencyPromptCaseStudy } from "../lib/recentWork";
import { ATEAM_MISSION_CONTROL_PREVIEW_PATH } from "../lib/ateamEmbed";
import { ateamModeSupportPoints } from "../lib/ateamMode";
import AteamHomeWidget from "./components/AteamHomeWidget";
import ClientLogoStrip from "./components/ClientLogoStrip";

const productTiles = [
  {
    title: "PeacePad",
    description: "Pre-send communication safety with AI-assisted rewrite choices.",
    proof: "Live on Google Play",
    href: "/products/peacepad",
    image: "/images/brand/peacepad-directory-03-compose.png",
    alt: "PeacePad preview"
  },
  {
    title: "SayWetin",
    description: "Nigerian music and language context intelligence.",
    proof: "Live on Google Play",
    href: "/saywetin",
    image: "/images/brand/saywetin-og.png",
    alt: "SayWetin preview"
  },
  {
    title: "Dispatch",
    description: "Ottawa roadside intake, operator routing, and live incident watch.",
    proof: "Live on Una Labs",
    href: "/products/dispatch"
  }
] as const;

const whatHappensSteps = [
  {
    label: "Intake",
    title: "Share your idea",
    detail: "Drop a rough idea and your goal in plain language."
  },
  {
    label: "System",
    title: "ATEAM routes it",
    detail: "The system identifies lane, scope, and immediate next steps."
  },
  {
    label: "Work",
    title: "Visible execution",
    detail: "You can see progress and what is being prepared."
  },
  {
    label: "Output",
    title: "Decision-ready pack",
    detail: "You get a clear plan to approve and move into delivery."
  }
] as const;

export const metadata: Metadata = {
  title: "Una Labs - AI Build Lab | Fast Websites, Lead Systems & ATEAM Workflows",
  description:
    "Una Labs is an operator-led AI build lab delivering fast websites, lead automation, and ATEAM-guided workflows. Trusted by LCBO, Home Depot, and the Ontario Government.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="section section-hero fade-on-scroll">
        <div className="container">
          <section className="hero home-ateam-hero">
            <div className="home-ateam-hero-intro">
              <p className="eyebrow">Una Labs</p>
              <p className="hero-urgency-pill" aria-label="Delivery speed">
                <span aria-hidden="true">+</span>
                Ships in days, not months
              </p>
              <h1 className="hero-primary-title">
                Fast websites, lead systems, and AI-assisted workflows.
              </h1>
              <p className="lead hero-subtitle">
                ATEAM is live at the center of Una Labs. Drop a rough idea, get routed into a real
                build path, and move from intake to client-ready pack with clear visibility.
              </p>
            </div>
            <div className="home-ateam-hero-surface" aria-label="ATEAM live intake surface">
              <AteamHomeWidget />
            </div>
            <div className="home-ateam-hero-foot">
              <div className="hero-actions hero-cta-row">
                <Link href="/ateam" prefetch={false} className="btn btn-primary">
                  Run ATEAM
                </Link>
                <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                  Start a Project
                </Link>
                <a href="#client-launches" className="inline-link">
                  See Active Builds
                </a>
              </div>
              <ul className="home-ateam-hero-points" aria-label="Core value points">
                <li>Fast website launches with production-grade performance and SEO.</li>
                <li>Lead systems that turn calls, forms, and follow-up into outcomes.</li>
                <li>AI-assisted workflows that keep intake, routing, build, and pack connected.</li>
              </ul>
            </div>
          </section>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="what-happens">
        <div className="container">
          <article className="card ateam-preview-band ateam-flow-band">
            <div className="ateam-preview-band-copy">
              <p className="eyebrow">What happens next</p>
              <h2>What happens after you submit your idea</h2>
              <p className="muted ateam-preview-intro">
                ATEAM keeps this simple: it captures your input, routes the work, and returns a clear
                output you can act on.
              </p>
            </div>
            <div className="ateam-preview-band-steps" aria-label="Simple ATEAM flow">
              {whatHappensSteps.map((step) => (
                <div key={step.label} className="ateam-preview-band-step">
                  <p className="ateam-surface-eyebrow">{step.label}</p>
                  <strong>{step.title}</strong>
                  <span className="ateam-surface-caption">{step.detail}</span>
                </div>
              ))}
            </div>
            <div className="product-actions">
              <Link href="/ateam" prefetch={false} className="btn btn-primary">
                Open ATEAM
              </Link>
              <a href="#client-launches" className="btn btn-secondary">
                See live proof
              </a>
            </div>
          </article>
        </div>
      </section>

      <ClientLogoStrip />

      <section className="section fade-on-scroll anchor-offset" id="client-launches">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Proof</p>
            <h2>Proof from live launches</h2>
            <p>Real delivery activity from active client work.</p>
          </div>
          <article className="card featured-launch-card">
            <div className="live-activity-badge" role="status" aria-label="Live activity enabled">
              <span className="live-activity-dot" aria-hidden="true" />
              LIVE ACTIVITY
            </div>
            <div className="featured-launch-head">
              <div>
                <p className="status-pill">{emergencyPromptCaseStudy.status}</p>
                <h3>{emergencyPromptCaseStudy.tileTitle}</h3>
                <p className="muted">{emergencyPromptCaseStudy.service}</p>
                <div className="launch-timestamp-row" aria-label="Client launch timing">
                  <span>{emergencyPromptCaseStudy.startedLabel}</span>
                  <span>{emergencyPromptCaseStudy.lastUpdatedLabel}</span>
                </div>
              </div>
              <div className="proof-tags" aria-label="Emergency Prompt tags">
                {emergencyPromptCaseStudy.tags.map((tag) => (
                  <span key={tag} className="proof-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <p>{emergencyPromptCaseStudy.summary}</p>
            {emergencyPromptCaseStudy.phase ? (
              <div className="launch-progress-shell" aria-label="Current build phase">
                <div className="launch-progress-copy">
                  <p className="launch-progress-label">Build progress</p>
                  <p className="launch-progress-text">
                    Phase {emergencyPromptCaseStudy.phase.current} of {emergencyPromptCaseStudy.phase.total}:{" "}
                    {emergencyPromptCaseStudy.phase.label}
                  </p>
                </div>
                <div className="launch-progress-track" role="presentation">
                  <span
                    className="launch-progress-fill"
                    style={{
                      width: `${(emergencyPromptCaseStudy.phase.current / emergencyPromptCaseStudy.phase.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div className="featured-launch-grid">
              <div className="client-launch-signal">
                <p className="client-launch-signal-title">Current focus</p>
                <ul className="client-launch-signal-list">
                  {(emergencyPromptCaseStudy.currentFocus ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="client-launch-signal">
                <p className="client-launch-signal-title">Next milestone</p>
                <ul className="client-launch-signal-list">
                  {(emergencyPromptCaseStudy.nextMilestone ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="product-actions">
              <Link href="/work/emergency-prompt" prefetch={false} className="btn btn-secondary">
                View onboarding snapshot
              </Link>
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Start a similar project
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="products">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Products</p>
            <h2>Public products in market</h2>
            <p>Tools built and shipped by Una Labs.</p>
          </div>
          <div className="proof-grid home-products-grid home-products-public">
            {productTiles.map((tile) => (
              <article key={tile.title} className="card proof-card">
                {"image" in tile && tile.image ? (
                  <Image
                    className="proof-thumb proof-thumb-image"
                    src={tile.image}
                    alt={tile.alt}
                    width={640}
                    height={360}
                    sizes="(max-width: 860px) 92vw, 31vw"
                  />
                ) : (
                  <div className="proof-thumb proof-thumb-neutral" aria-hidden="true">
                    <span className="proof-label">{tile.title}</span>
                  </div>
                )}
                <h3>{tile.title}</h3>
                <p>{tile.description}</p>
                <p className="proof-proof">{tile.proof}</p>
                <Link href={tile.href} prefetch={false} className="inline-link">
                  See product overview
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="behind-scenes">
        <div className="container">
          <article className="card proof-card proof-card--featured-ateam home-ateam-system">
            <div className="home-ateam-system-head">
              <p className="eyebrow">Behind the scenes</p>
              <h2>Where ATEAM runs delivery in the background</h2>
              <p className="muted">
                This is the internal operating view used after intake to keep execution aligned.
              </p>
            </div>
            <div className="proof-card-ateam-preview-wrap">
              <Image
                src={ATEAM_MISSION_CONTROL_PREVIEW_PATH}
                alt="ATEAM internal mission control view"
                width={960}
                height={540}
                className="proof-card-ateam-preview"
              />
              <span className="proof-card-ateam-badge">Behind the scenes</span>
            </div>
            <div className="proof-tags">
              {ateamModeSupportPoints.map((point) => (
                <span key={point} className="proof-tag">
                  {point}
                </span>
              ))}
            </div>
            <div className="product-actions">
              <Link href="/ateam" prefetch={false} className="btn btn-primary">
                Open ATEAM
              </Link>
              <a href="#what-happens" className="btn btn-secondary">
                Review the flow
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <article className="card final-cta-card home-final-cta-card">
            <div>
              <p className="eyebrow">Next step</p>
              <h2>Ready to start?</h2>
              <p className="muted">Run ATEAM now or jump straight into a project request.</p>
            </div>
            <div className="product-actions final-cta-actions">
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Start a Project
              </Link>
              <Link href="/ateam" prefetch={false} className="btn btn-secondary">
                Open ATEAM
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
