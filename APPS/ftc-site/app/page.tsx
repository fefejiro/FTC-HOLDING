import type { Metadata } from "next";
import Link from "next/link";
import ClientLogoStrip from "./components/ClientLogoStrip";

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

const proofTiles = [
  {
    label: "Lead Engine for Local Services",
    title: "Lead Engine for Local Services",
    description: "YouTube SEO, local intent, conversion tracking.",
    proof: "Local services growth track",
    href: "/work",
    visualType: "standard"
  },
  {
    label: "Fast Website Launch",
    title: "Fast Website Launch",
    description: "Performance, SEO basics, conversion layout.",
    proof: "Launch-ready foundation",
    href: "/work-with-ftc",
    visualType: "standard"
  },
  {
    label: "Automation Workflow",
    title: "Automation Workflow",
    description: "Automation, operations, reliability.",
    proof: "Production-grade reliability",
    href: "/services/intelligent-systems-automation",
    visualType: "standard"
  },
  {
    label: "Flagship Product: PeacePad",
    title: "PeacePad",
    description: "Workflow design, AI assist, compliance mindset.",
    proof: "Flagship product",
    href: "/products/peacepad",
    visualType: "peacepad"
  }
] as const;

const processSteps = [
  {
    title: "Signal",
    description: "Align on the objective, constraints, and success signal."
  },
  {
    title: "Build",
    description: "Ship the smallest premium system that solves the core need."
  },
  {
    title: "Launch",
    description: "Deploy, instrument, and make the workflow operational."
  },
  {
    title: "Improve",
    description: "Iterate with feedback, metrics, and operator insight."
  }
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
                <h1>Unalabs</h1>
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
                    See Work
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

      <ClientLogoStrip />

      <section className="section fade-on-scroll" id="services">
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

      <section className="section fade-on-scroll" id="work">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Proof / Work</p>
            <h2>Proof of execution across products and client delivery</h2>
            <p>Flagship products and delivery tracks that show how Una Labs operates.</p>
          </div>
          <div className="proof-grid">
            {proofTiles.map((tile) => (
              <article key={tile.title} className="card proof-card">
                {tile.visualType === "peacepad" ? (
                  <div className="proof-thumb proof-thumb-peacepad" aria-hidden="true">
                    <span className="peacepad-mark">PeacePad</span>
                    <div className="peacepad-ui-hint">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
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

      <section className="section fade-on-scroll" id="process">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Process</p>
            <h2>Signal to shipped delivery in four steps</h2>
            <p>A consistent pipeline that keeps strategy, build, and launch aligned.</p>
          </div>
          <div className="process-grid">
            {processSteps.map((step, index) => (
              <article key={step.title} className="card process-card">
                <span className="process-step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="about">
        <div className="container">
          <article className="card studio-strip">
            <div className="studio-strip-content">
              <p className="eyebrow">Studio credibility</p>
              <h3>Operator-led, product-first, delivery-focused.</h3>
              <p>
                Operator-led delivery informed by enterprise and public-sector systems thinking:
                governance, integrations, reliability, and measurable execution. Built for real
                operations, not demos.
              </p>
            </div>
            <Link href="/about" prefetch={false} className="btn btn-secondary">
              View background and portfolio
            </Link>
          </article>
        </div>
      </section>

      <section className="section fade-on-scroll" id="start-project">
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
                See Work
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
