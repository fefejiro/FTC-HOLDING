import type { CSSProperties } from "react";
import Link from "next/link";
import ClientLogoStrip from "./ClientLogoStrip";
import ProductBrandBadge from "./ProductBrandBadge";
import ProductStatusBadge from "./ProductStatusBadge";
import { clientLaunches } from "../../lib/recentWork";
import { projectCaseStudies } from "../../lib/content";
import { productCardBranding } from "../../lib/productCardBranding";
import { engagementOffers } from "../../lib/engagementOffers";

function getProductHref(slug: string) {
  if (slug === "peacepad") return "/products/peacepad";
  if (slug === "saywetin") return "/saywetin";
  if (slug === "dispatch") return "/products/dispatch";
  return "/products";
}

const FLOW_STEPS = [
  {
    num: "01",
    label: "Describe the need",
    detail: "Rough request, idea, or problem. No polish required."
  },
  {
    num: "02",
    label: "Structured scope",
    detail: "ATEAM turns the input into a brief, lane, and recommended direction."
  },
  {
    num: "03",
    label: "Proposal + deposit",
    detail: "One clear offer. Pay a deposit through Stripe to confirm the engagement."
  },
  {
    num: "04",
    label: "Delivery",
    detail: "Governed execution, approval gates, and a handoff-ready output."
  }
];

export default function HomePageExperience() {
  const primaryProducts = projectCaseStudies.filter((p) => p.slug !== "ateam").slice(0, 3);

  return (
    <div className="home-page">

      {/* ── 1. HERO ──────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="card home-hero home-hero-enterprise">
            <div className="premium-hero-grid">

              <div className="premium-hero-copy">
                <p className="eyebrow">Una Labs · AI workflow infrastructure</p>
                <h1 className="hero-primary-title">
                  Rough request in. Scoped delivery out.
                </h1>
                <p className="lead">
                  Una Labs takes your need — no matter how unformed — and runs it through ATEAM:
                  structured intake, clear scope, a real proposal, and governed delivery execution.
                </p>
                <div className="hero-cta-row">
                  <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                    Start with your request
                  </Link>
                  <Link href="/work" prefetch={false} className="btn btn-secondary">
                    See delivery proof
                  </Link>
                </div>
                <p className="hero-sub-note">
                  No account needed. Describe what you need and we scope the fastest credible next move.
                </p>
              </div>

              <div className="home-flow-visual">
                <p className="card-kicker home-flow-kicker">How a request becomes delivery</p>
                <ol className="home-flow-steps" aria-label="Request to delivery flow">
                  {FLOW_STEPS.map((step) => (
                    <li key={step.num} className="home-flow-step">
                      <span className="home-flow-step-num" aria-hidden="true">{step.num}</span>
                      <div className="home-flow-step-body">
                        <strong>{step.label}</strong>
                        <span>{step.detail}</span>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="home-flow-engine-note">
                  Powered by ATEAM — the workflow engine behind intake, approvals, documents, and delivery.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 2. CLIENT LOGOS ──────────────────────────────────────── */}
      <ClientLogoStrip />

      {/* ── 3. ENGAGEMENT PATHS ──────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Engagement paths</p>
            <h2>Pick the right entry point</h2>
            <p>
              Every request routes to one of three tracks. Choose the one that matches where you are.
              Deposits confirm the engagement — paid through Stripe.
            </p>
          </div>

          <div className="home-offers-grid">
            {engagementOffers.map((offer, i) => (
              <article key={offer.value} className={`card home-offer-card${i === 1 ? " home-offer-card--featured" : ""}`}>
                <div className="home-offer-card-head">
                  <p className="card-kicker">{offer.meta}</p>
                  <h3>{offer.title}</h3>
                  <p className="home-offer-price">{offer.price}</p>
                </div>
                <p className="home-offer-summary">{offer.summary}</p>
                <p className="home-offer-ideal">
                  <span className="home-offer-ideal-label">Best for</span> {offer.idealFor}
                </p>
                <Link
                  href={`/work-with-ftc?offer=${offer.value}`}
                  prefetch={false}
                  className={i === 1 ? "btn btn-primary" : "btn btn-secondary"}
                >
                  Start with this track
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW ATEAM POWERS THIS ─────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="card home-engine-card">
            <div className="home-engine-copy">
              <p className="eyebrow">ATEAM — the operating engine</p>
              <h2>Una Labs runs on ATEAM</h2>
              <p>
                ATEAM is not a separate product you go to. It is the internal system that structures
                every intake, generates scoping briefs, governs approvals, manages documents, and
                tracks delivery. When you submit a request through Una Labs, ATEAM is handling the
                work behind it.
              </p>
              <ul className="home-engine-bullets">
                <li>Intake routes automatically to the right execution lane</li>
                <li>Scope, brief, and proposal generated from your request</li>
                <li>Approval gates keep work visible before money moves</li>
                <li>Delivery tracked through to handoff-ready output</li>
              </ul>
            </div>
            <div className="home-engine-stats">
              <div className="home-engine-stat">
                <span className="home-engine-stat-value">3</span>
                <span className="home-engine-stat-label">Execution tracks</span>
              </div>
              <div className="home-engine-stat">
                <span className="home-engine-stat-value">4</span>
                <span className="home-engine-stat-label">Approval gates</span>
              </div>
              <div className="home-engine-stat">
                <span className="home-engine-stat-value">48h</span>
                <span className="home-engine-stat-label">Typical first reply</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. CLIENT LAUNCHES ───────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Delivery proof</p>
            <h2>Live launches and shipped systems</h2>
            <p>Real work that moved through intake, scope, and governed delivery.</p>
          </div>

          <div className="cards-grid cards-grid-3 home-product-preview-grid">
            {clientLaunches.slice(0, 3).map((launch) => {
              const style = {
                "--glance-accent": launch.brand.accent,
                "--glance-soft": launch.brand.accentSoft
              } as CSSProperties;

              return (
                <article key={launch.slug} className="card home-product-preview-card">
                  <div className="home-glance-launch-badge" style={style}>
                    <span>{launch.brand.mark}</span>
                  </div>
                  <h3>{launch.brand.wordmark}</h3>
                  <p className="muted">{launch.service}</p>
                  <p className="home-proof-offer-badge">
                    {launch.offerProof.label}
                  </p>
                  <Link href={`/work/${launch.slug}`} prefetch={false} className="inline-link">
                    View launch →
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. PRODUCTS ──────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Studio products</p>
            <h2>Built inside the same system</h2>
            <p>Dispatch, SayWetin, and PeacePad are studio-owned products designed and shipped through ATEAM.</p>
          </div>

          <div className="cards-grid cards-grid-3 home-product-preview-grid">
            {primaryProducts.map((project) => {
              const branding = productCardBranding[project.slug];
              return (
                <article key={project.slug} className="card home-product-preview-card">
                  <div className="project-card-top">
                    <p className="card-kicker">{project.availabilityLabel ?? project.pillar.replace("-", " ")}</p>
                    <ProductStatusBadge status={project.status} />
                  </div>
                  <div className="product-card-header">
                    {branding?.logo ? <ProductBrandBadge logo={branding.logo} /> : null}
                    <div className="product-card-heading">
                      <h3>{project.name}</h3>
                      <p className="muted">{project.tagline}</p>
                    </div>
                  </div>
                  <p>{project.summary}</p>
                  <Link href={getProductHref(project.slug)} prefetch={false} className="inline-link">
                    View product →
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CTA ─────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <article className="card final-cta-card home-final-cta-card">
            <div>
              <p className="eyebrow">Start here</p>
              <h2>Describe what you need. We scope the next move.</h2>
              <p className="muted">
                Submit a rough request. ATEAM structures it into a brief. Una Labs replies
                with the clearest, fastest credible path and the right offer for where you are.
              </p>
            </div>
            <div className="product-actions final-cta-actions">
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Start your request
              </Link>
              <Link href="/services" prefetch={false} className="btn btn-secondary">
                View service offerings
              </Link>
            </div>
          </article>
        </div>
      </section>

    </div>
  );
}
