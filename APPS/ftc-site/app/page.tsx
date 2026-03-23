import type { Metadata } from "next";
import Link from "next/link";
import { emergencyPromptCaseStudy } from "../lib/recentWork";
import { ateamModeStageLabels, ateamModeSummary, ateamModeSupportPoints } from "../lib/ateamMode";

const serviceLanes = [
  {
    title: "Fast Website Launch",
    description:
      "A clear, premium site for businesses that need trust, speed, and conversion quickly.",
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
    bullets: [
      "Guided idea intake",
      "Phased scope and likely deliverables",
      "Clear next step before build begins"
    ],
    href: "/ateam",
    cta: "Try ATEAM demo"
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
  }
] as const;

export const metadata: Metadata = {
  title: "Una Labs - Fast websites, lead systems, and AI-assisted workflows",
  description:
    "Una Labs helps businesses and founders move quickly with fast websites, lead systems, and AI-assisted product workflows.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="section section-hero fade-on-scroll">
        <div className="container">
          <section className="hero home-hero">
            <div className="hero-noise" aria-hidden="true" />
            <div className="hero-grid premium-hero-grid">
              <div className="hero-copy premium-hero-copy">
                <p className="eyebrow">Una Labs</p>
                <h1>Fast websites, lead systems, and AI-assisted workflows.</h1>
                <p className="lead hero-subtitle">
                  Una Labs is the public-facing build lab for businesses and ideas that need to move
                  quickly without losing clarity.
                </p>
                <div className="hero-actions hero-cta-row">
                  <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                    Start a Project
                  </Link>
                  <Link href="/ateam" prefetch={false} className="btn btn-secondary">
                    Try ATEAM Demo
                  </Link>
                  <Link href="/work" prefetch={false} className="inline-link">
                    See how it works
                  </Link>
                </div>
                <ul className="hero-credibility-bullets" aria-label="Quick credibility points">
                  <li>Production-grade builds with performance, SEO, and analytics foundations.</li>
                  <li>Lead paths that make calls, forms, and follow-up easier to trust.</li>
                  <li>AI-assisted workflows that help rough ideas become scoped next steps.</li>
                </ul>
              </div>
              <div className="hero-media-card hero-media-card--ateam">
                <p className="collage-label">Mission Control preview</p>
                <img
                  src="/images/brand/Calender Ateam.png"
                  alt="ATEAM mission control preview"
                  className="hero-media-image"
                />
                <div className="home-hero-side-note">
                  <p className="proof-label">ATEAM</p>
                  <h2>The AI lab where rough ideas become clear next steps.</h2>
                  <p className="hero-media-caption">
                    {ateamModeSummary} Public-facing preview, then a clean handoff into a real
                    project request.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

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
                <h3>{lane.title}</h3>
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
            <div className="featured-launch-head">
              <div>
                <p className="status-pill">{emergencyPromptCaseStudy.status}</p>
                <h3>{emergencyPromptCaseStudy.tileTitle}</h3>
                <p className="muted">{emergencyPromptCaseStudy.service}</p>
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
              PeacePad and SayWetin are public products. ATEAM is the guided AI lab that helps turn
              new ideas into scoped next steps.
            </p>
          </div>
          <div className="proof-grid home-products-grid">
            {productTiles.map((tile) => (
              <article key={tile.title} className="card proof-card">
                <img className="proof-thumb proof-thumb-image" src={tile.image} alt={tile.alt} loading="lazy" />
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
                <img src="/images/brand/ATeam Logo.png" alt="" />
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
                Try ATEAM Demo
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="ateam">
        <div className="container">
          <article className="card ateam-preview-band">
            <div className="ateam-preview-band-copy">
              <p className="eyebrow">ATEAM preview</p>
              <h2>See the ATEAM-mode path from memory to delivery before you ever start a build.</h2>
              <p className="muted">
                ATEAM is public as a curated mode preview. It surfaces Memory, Office, Team, and
                Factory without exposing every internal operator control.
              </p>
            </div>
            <div className="ateam-preview-band-steps" aria-label="ATEAM preview steps">
              {ateamModeStageLabels.map((step, index) => (
                <div key={step} className="ateam-preview-band-step">
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
            <div className="product-actions">
              <Link href="/ateam" prefetch={false} className="btn btn-primary">
                Try ATEAM Demo
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
                Try ATEAM Demo
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
