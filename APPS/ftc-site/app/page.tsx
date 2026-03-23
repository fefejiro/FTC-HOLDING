import type { Metadata } from "next";
import Link from "next/link";
import { emergencyPromptCaseStudy } from "../lib/recentWork";

const heroCredibilityBullets = [
  "Launch fast with production-grade foundations (performance, SEO, analytics).",
  "Automate lead capture and follow-up so calls do not slip.",
  "Build for maintainability: secure, modular, easy to extend."
] as const;

const serviceTiles = [
  {
    title: "Fast Websites",
    description:
      "High-performance sites built for clarity, trust, and conversion.",
    proof: "Proof: on-page SEO, mobile-first."
  },
  {
    title: "Lead Automation",
    description:
      "Capture leads, qualify, route, follow up with less babysitting.",
    proof: "Proof: forms, call tracking direction, CRM-ready."
  },
  {
    title: "AI Delivery",
    description:
      "Practical AI features that reduce friction, improve quality, speed decisions.",
    proof: "Proof: review gates, audit trails."
  }
] as const;

const clientLaunchTiles = [
  {
    label: emergencyPromptCaseStudy.tileTitle,
    title: emergencyPromptCaseStudy.tileTitle,
    description: emergencyPromptCaseStudy.summary,
    proof: emergencyPromptCaseStudy.status,
    href: `/work/${emergencyPromptCaseStudy.slug}`,
    visualType: "standard",
    tags: emergencyPromptCaseStudy.tags
  }
] as const;

const productTiles = [
  {
    label: "Flagship Product",
    title: "PeacePad",
    description: "Pre-send communication safety with AI-assisted rewrite choices.",
    proof: "Live on Google Play",
    href: "/products/peacepad",
    visualType: "peacepad"
  },
  {
    label: "Product: SayWetin",
    title: "SayWetin",
    description: "Nigerian music and language context intelligence.",
    proof: "Live on Google Play",
    href: "/saywetin",
    visualType: "saywetin"
  },
  {
    label: "ATEAM",
    title: "ATEAM",
    description: "Guided lab system that turns ideas into structured execution.",
    proof: "Interactive demo",
    href: "/ateam",
    visualType: "standard"
  }
] as const;

const ateamPreviewSteps = [
  "Submit an idea",
  "Select a build category",
  "Watch the lab route the work",
  "Review a structured output",
  "Start a scoped project"
] as const;

export const metadata: Metadata = {
  title: "Una Labs - Fast Websites, Lead Automation, and AI Product Delivery",
  description:
    "Una Labs builds fast websites, instant lead follow-up systems, and practical AI products for businesses that need execution fast.",
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
                <p className="eyebrow">Operator-led studio</p>
                <h1>Una Labs</h1>
                <h2 className="hero-headline">
                  Systems-first digital delivery: websites, automation, AI.
                </h2>
                <p className="lead hero-subtitle">
                  Una Labs builds production-grade systems that launch fast, convert well, and
                  stay reliable under real operations.
                </p>
                <div className="hero-actions hero-cta-row">
                  <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                    Start a Project
                  </Link>
                  <Link href="/work" prefetch={false} className="btn btn-secondary">
                    Client Launches
                  </Link>
                </div>
                <ul className="hero-credibility-bullets" aria-label="Quick credibility points">
                  {heroCredibilityBullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="hero-media-card">
                <p className="collage-label">Studio delivery</p>
                <img
                  src="/images/brand/unalabs-builder-workspace.PNG"
                  alt="Una Labs studio delivery visual"
                  className="hero-media-image"
                />
                <p className="hero-media-caption">
                  Operator-led execution that keeps delivery measurable and scoped.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="services">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Services</p>
            <h2>Focused delivery for speed, trust, and measurable impact</h2>
            <p>
              Una Labs operates like an execution partner: clear scope, fast build cycles, and
              premium output that makes teams look sharper.
            </p>
          </div>
          <div className="cards-grid cards-grid-3 services-grid">
            {serviceTiles.map((service) => (
              <article key={service.title} className="card service-card">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <p className="service-proof">{service.proof}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="client-launches">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Client Launches</p>
            <h2>Client Launches</h2>
            <p>Selected builds focused on systems-first delivery and measurable outcomes.</p>
          </div>
          <div className="proof-grid">
            {clientLaunchTiles.map((tile) => (
              <article key={tile.title} className="card proof-card">
                <div className="proof-thumb proof-thumb-neutral" aria-hidden="true">
                  <div className="neutral-bars">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <p className="proof-label">{tile.label}</p>
                <h3>{tile.title}</h3>
                <p>{tile.description}</p>
                {tile.tags.length > 0 ? (
                  <div className="proof-tags" aria-label={`${tile.title} tags`}>
                    {tile.tags.map((tag) => (
                      <span key={tag} className="proof-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="proof-proof">{tile.proof}</p>
                <Link href={tile.href} prefetch={false} className="inline-link">
                  View detail
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="products">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Products</p>
            <h2>Products & internal IP</h2>
            <p>Products show what Una Labs builds and the systems that power client work.</p>
          </div>
          <div className="proof-grid">
            {productTiles.map((tile) => (
              <article key={tile.title} className="card proof-card">
                {tile.visualType === "peacepad" ? (
                  <img
                    className="proof-thumb proof-thumb-image"
                    src="/images/brand/peacepad-directory-03-compose.png"
                    alt="PeacePad product preview"
                    loading="lazy"
                  />
                ) : tile.visualType === "saywetin" ? (
                  <img
                    className="proof-thumb proof-thumb-image"
                    src="/images/brand/saywetin-og.png"
                    alt="SayWetin product preview"
                    loading="lazy"
                  />
                ) : (
                  <div className="proof-thumb proof-thumb-neutral" aria-hidden="true">
                    <div className="neutral-bars">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <p className="proof-label">{tile.label}</p>
                <h3>{tile.title}</h3>
                <p>{tile.description}</p>
                <p className="proof-proof">{tile.proof}</p>
                <Link href={tile.href} prefetch={false} className="inline-link">
                  View detail
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="ateam">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">ATEAM</p>
            <h2>ATEAM public demo</h2>
            <p>
              A curated lab experience that turns raw ideas into structured execution plans.
            </p>
          </div>
          <div className="ateam-preview-grid">
            <article className="card ateam-preview-card">
              <h3>Guided lab flow</h3>
              <ul className="ateam-preview-steps">
                {ateamPreviewSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <Link href="/ateam" prefetch={false} className="btn btn-secondary">
                Try ATEAM demo
              </Link>
            </article>
            <article className="card ateam-preview-card">
              <p className="eyebrow">What you get</p>
              <h3>Structured output</h3>
              <p>
                A project summary, recommended direction, and clear next steps you can act on.
              </p>
              <p className="muted">
                No internal admin view. Just the curated experience clients should see.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll anchor-offset" id="start-project">
        <div className="container">
          <article className="card final-cta-card">
            <div>
              <p className="eyebrow">Final CTA</p>
              <h2>Ready to move this forward?</h2>
              <p className="muted">
                Start with a quick scope, clear deliverables, and a launch plan that does not drift.
              </p>
            </div>
            <div className="product-actions">
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Start a Project
              </Link>
              <Link href="/work" prefetch={false} className="btn btn-secondary">
                View Client Launches
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
