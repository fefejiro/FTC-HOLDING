export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../components/CTABanner";

const includedItems = [
  "Fast website contact flow or lead form cleanup",
  "Instant email or text reply for every new inquiry",
  "Missed-call text-back for after-hours or busy periods",
  "Owner alerts so no lead sits unseen",
  "Simple tracking sheet or lightweight pipeline setup"
] as const;

const packageOptions = [
  {
    name: "Starter Setup",
    price: "$300",
    description: "Best for owner-led local businesses that need a simple lead capture and instant follow-up fix.",
    bullets: [
      "Lead form routing",
      "Instant confirmation message",
      "Owner alert setup"
    ]
  },
  {
    name: "Lead Response System",
    price: "$500",
    description: "Best for businesses that want the full fast-response workflow with missed-call recovery.",
    bullets: [
      "Everything in Starter",
      "Missed-call text-back",
      "Lead tracking sheet",
      "Basic handoff or setup walkthrough"
    ]
  },
  {
    name: "Ongoing Support",
    price: "$99–$199/mo",
    description: "For businesses that want small improvements, monitoring, and light updates after launch.",
    bullets: [
      "Light updates",
      "Template adjustments",
      "Small workflow improvements"
    ]
  }
] as const;

const bestFit = [
  "Cleaning companies",
  "Towing and roadside assistance",
  "Real estate agents and small teams",
  "Emergency or restoration service businesses"
] as const;

export const metadata: Metadata = {
  title: "48-Hour Lead Response System | Una Labs",
  description:
    "Fast website and lead follow-up setup for businesses that want fewer missed leads and faster response times.",
  alternates: {
    canonical: "https://unalabs.cloud/lead-response-system"
  }
};

export default function LeadResponseSystemPage() {
  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <div className="container">
      <section className="hero home-hero">
        <div className="hero-noise" aria-hidden="true" />
        <div className="hero-grid home-hero-grid">
          <div className="hero-copy home-hero-copy">
            <p className="sunrise-kicker">Featured Offer</p>
            <h1>48-Hour Lead Response System</h1>
            <p className="sunrise-lead hero-subtitle">
              A fast setup for businesses that want to stop losing leads to slow replies,
              missed calls, and scattered follow-up.
            </p>
            <p className="hero-description">
              Una Labs installs practical lead capture and follow-up systems quickly so you can
              respond faster without overbuilding a custom platform.
            </p>
            <div className="hero-actions">
              <a href="#packages" className="btn btn-primary">
                See Packages
              </a>
              <a href="#request-setup" className="btn btn-secondary">
                Request a Setup
              </a>
            </div>
          </div>

          <div className="hero-collage home-hero-panel">
            <p className="collage-label">Included in the setup</p>
            <div className="home-hero-panel-grid">
              {includedItems.map((item) => (
                <article key={item} className="collage-card">
                  <h2>{item}</h2>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Best Fit</p>
          <h2>Who this is for</h2>
          <p>
            This offer is designed for businesses that already get inquiries but do not always
            respond fast enough to convert them into booked work.
          </p>
        </div>
        <div className="process-grid">
          {bestFit.map((item, index) => (
            <article key={item} className="card process-card">
              <span className="process-step-number">0{index + 1}</span>
              <h3>{item}</h3>
              <p>
                Good fit when speed matters, owners are busy, and every missed inquiry costs real revenue.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="packages">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Packages</p>
          <h2>Simple pricing to get moving fast</h2>
          <p>
            Start with the smallest useful setup, get it live, and improve from there only if it helps.
          </p>
        </div>
        <div className="product-grid">
          {packageOptions.map((option) => (
            <article key={option.name} className="card product-spotlight-card">
              <p className="status-pill">FAST START</p>
              <h3>{option.name}</h3>
              <p className="drone-price">{option.price}</p>
              <p>{option.description}</p>
              <ul className="feature-list compact-feature-list">
                {option.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="request-setup">
        <CTABanner
          title="Ready to stop losing leads?"
          description="Use the intake form and Una Labs will reply with the shortest path to a working setup."
          primaryLabel="Request My Setup"
          primaryHref="/#start-project"
          secondaryLabel="Connect Directly"
          secondaryHref="/connect"
        />
        <p className="process-note">
          Prefer to review the broader studio first? <Link href="/work" className="inline-link">See recent work</Link>.
        </p>
      </section>
      </div>
    </div>
  );
}
