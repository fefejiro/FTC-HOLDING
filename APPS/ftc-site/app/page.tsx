export const dynamic = "force-static";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { emergencyPromptCaseStudy } from "../lib/recentWork";
import { ATEAM_BRAND_LOGO_PATH } from "../lib/ateamEmbed";
import { ateamModeStages, ateamModeSummary, ateamModeSupportPoints } from "../lib/ateamMode";
import AteamHomeWidget from "./components/AteamHomeWidget";
import ClientLogoStrip from "./components/ClientLogoStrip";
import HeroSpotlight from "./components/HeroSpotlight";

type ServiceLaneIcon = "website" | "lead" | "scoping";

const serviceLanes = [
  {
    title: "Fast Website Launch",
    description:
      "A clear, premium site for businesses that need trust, speed, and conversion quickly.",
    outcome: "Live site, SEO-ready, with analytics - delivered fast.",
    icon: "website" as ServiceLaneIcon,
    bullets: [
      "Clear offer and service positioning",
      "Performance, SEO, and analytics foundations",
      "CTA flow that turns visits into action"
    ],
    href: "/work-with-ftc",
    cta: "Start a website project"
  },
  {
    title: "Local Services Lead Engine",
    description:
      "A tighter inbound system for local businesses that need calls, form leads, and follow-up to actually connect.",
    outcome: "A complete lead funnel map in one session.",
    icon: "lead" as ServiceLaneIcon,
    bullets: [
      "Lead capture and routing",
      "Follow-up automation direction",
      "Local search and intake structure"
    ],
    href: "/work/emergency-prompt",
    cta: "See a launch snapshot"
  },
  {
    title: "AI Workflow / Product Direction",
    description:
      "A practical path for founders or teams who need an AI-assisted workflow, internal tool, or product next step.",
    outcome: "Your idea goes in rough. A scoped build plan comes out.",
    icon: "scoping" as ServiceLaneIcon,
    bullets: [
      "Guided idea intake",
      "Phased scope and likely deliverables",
      "Clear next step before build begins"
    ],
    href: "/ateam",
    cta: "Open ATEAM"
  }
] as const;

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

const ateamComparisonRows = [
  {
    label: "Speed",
    agency: "Weeks to align scope and start dates",
    freelancer: "Fast start, but inconsistent pace",
    ateam: "First scoped pack in one guided run"
  },
  {
    label: "Visibility",
    agency: "Progress shared in periodic meetings",
    freelancer: "Mostly message-thread updates",
    ateam: "Live run state and visible phase tracking"
  },
  {
    label: "Scoping",
    agency: "Discovery workshops and docs",
    freelancer: "Light notes and assumptions",
    ateam: "Structured intake + clarifiers + phased output"
  },
  {
    label: "Output Format",
    agency: "Decks and delayed handoff artifacts",
    freelancer: "Loose tasks and ad hoc docs",
    ateam: "Client-ready pack tied to next build actions"
  }
] as const;

function renderServiceLaneIcon(icon: ServiceLaneIcon) {
  if (icon === "website") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 7h2" />
      </svg>
    );
  }
  if (icon === "lead") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" />
        <path d="M16 10h5" />
        <path d="M18.5 7.5v5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h9" />
      <path d="M4 18h6" />
      <circle cx="17" cy="12" r="4" />
      <path d="M17 10v4" />
      <path d="M15 12h4" />
    </svg>
  );
}

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
          <section className="hero home-hero spotlight-hero">
            <div className="hero-noise" aria-hidden="true" />
            <HeroSpotlight />
            <div className="hero-grid premium-hero-grid">
              <div className="hero-copy premium-hero-copy">
                <p className="eyebrow">Una Labs</p>
                <p className="hero-urgency-pill" aria-label="Delivery speed">
                  <span aria-hidden="true">+</span>
                  Ships in days, not months
                </p>
                <h1>Fast websites, lead systems, and AI-assisted workflows.</h1>
                <p className="lead hero-subtitle">
                  Una Labs is the only operator-led studio that combines AI-assisted scoping
                  (ATEAM), production-grade website builds, and live client visibility - all in one
                  lab.
                </p>
                <div className="hero-actions hero-cta-row">
                  <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                    Start a Project
                  </Link>
                  <Link href="/ateam" prefetch={false} className="btn btn-secondary">
                    Open ATEAM
                  </Link>
                  <a href="#client-launches" className="inline-link">
                    See Active Builds
                  </a>
                </div>
                <ul className="hero-credibility-bullets" aria-label="Quick credibility points">
                  <li>Production-grade builds with performance, SEO, and analytics foundations.</li>
                  <li>Lead paths that make calls, forms, and follow-up easier to trust.</li>
                  <li>AI-assisted workflows that help rough ideas become scoped next steps.</li>
                </ul>
              </div>
              <AteamHomeWidget />
            </div>
          </section>
        </div>
      </section>

      <ClientLogoStrip />

      <section className="section fade-on-scroll anchor-offset" id="services">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Service lanes</p>
            <h2>Three clear ways Una Labs helps teams move faster</h2>
            <p>
              Pick the lane that matches your need. Each one is designed to end in a real next step,
              not a vague strategy deck.
            </p>
          </div>
          <div className="cards-grid cards-grid-3 services-grid">
            {serviceLanes.map((lane) => (
              <article key={lane.title} className="card service-card service-card--lane">
                <div className="service-lane-icon" aria-hidden="true">
                  {renderServiceLaneIcon(lane.icon)}
                </div>
                <h3>{lane.title}</h3>
                <p className="service-lane-outcome">{lane.outcome}</p>
                <p>{lane.description}</p>
                <ul className="compact-feature-list">
                  {lane.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <Link href={lane.href} prefetch={false} className="inline-link">
                  {lane.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="client-launches">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Recently onboarded</p>
            <h2>Client proof stays separate from products</h2>
            <p>
              Client Launches shows live delivery snapshots. Products shows Una Labs-owned tools.
            </p>
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
            <h2>Products and lab systems built inside Una Labs</h2>
            <p>
              PeacePad, SayWetin, and Dispatch are public products. ATEAM is the guided AI lab that
              helps turn new ideas into scoped next steps.
            </p>
          </div>
          <div className="proof-grid home-products-grid">
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
            <article className="card proof-card proof-card--featured-ateam">
              <div className="proof-card-ateam-visual" aria-hidden="true">
                <Image src={ATEAM_BRAND_LOGO_PATH} alt="" width={84} height={84} />
              </div>
              <p className="proof-label">ATEAM</p>
              <h3>The AI lab where rough ideas become clear next steps.</h3>
              <p>
                {ateamModeSummary}
              </p>
              <div className="proof-tags">
                {ateamModeSupportPoints.map((point) => (
                  <span key={point} className="proof-tag">
                    {point}
                  </span>
                ))}
              </div>
              <Link href="/ateam" prefetch={false} className="btn btn-primary">
                Open ATEAM
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="ateam">
        <div className="container">
          <article className="card ateam-preview-band">
            <div className="ateam-preview-band-copy">
              <p className="eyebrow">Inside ATEAM</p>
              <h2>Open the real ATEAM surfaces that drive Una Labs from this route.</h2>
              <p className="muted">
                ATEAM is part of Una Labs, not a detached explainer. This route now frames a real
                workflow system with public intake, visible work, and a private operator control
                plane behind it.
              </p>
            </div>
            <div className="ateam-preview-band-steps" aria-label="ATEAM inside Una Labs">
              {ateamModeStages.map((step) => (
                <div key={step.title} className="ateam-preview-band-step">
                  <p className="ateam-surface-eyebrow">{step.eyebrow}</p>
                  <strong>{step.title}</strong>
                  <span className="ateam-surface-caption">{step.detail}</span>
                </div>
              ))}
            </div>
            <div className="ateam-compare-shell">
              <h3>Why ATEAM over a traditional delivery path</h3>
              <div className="ateam-compare-table-wrap">
                <table className="ateam-compare-table">
                  <thead>
                    <tr>
                      <th scope="col">Factor</th>
                      <th scope="col">Traditional Agency</th>
                      <th scope="col">Freelancer</th>
                      <th scope="col">Una Labs ATEAM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ateamComparisonRows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.agency}</td>
                        <td>{row.freelancer}</td>
                        <td>{row.ateam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <a
              className="ateam-demo-placeholder"
              href="https://www.youtube.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="See ATEAM in action video placeholder"
            >
              <span className="ateam-demo-play" aria-hidden="true" />
              <span className="ateam-demo-text">See ATEAM in Action</span>
            </a>
            <blockquote className="ateam-quote-card">
              "ATEAM gave us a clear build path in one session. We could see exactly what to ship
              first without losing momentum."
              <cite>Early Una Labs client</cite>
            </blockquote>
            <div className="product-actions">
              <Link href="/ateam" prefetch={false} className="btn btn-primary">
                Open ATEAM
              </Link>
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                Start a Project
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <article className="card final-cta-card">
            <div>
              <p className="eyebrow">Next step</p>
              <h2>Want a clear build path instead of a loose idea pile?</h2>
              <p className="muted">
                Start with ATEAM if you want guidance first, or go straight into a project request if
                you already know the outcome you need.
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
      </section>
    </div>
  );
}
