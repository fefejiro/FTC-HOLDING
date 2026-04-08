import type { CSSProperties } from "react";
import Link from "next/link";
import AteamHomeWidget from "./AteamHomeWidget";
import ProductBrandBadge from "./ProductBrandBadge";
import ProductStatusBadge from "./ProductStatusBadge";
import ClientLogoStrip from "./ClientLogoStrip";
import CTABanner from "./CTABanner";
import { projectCaseStudies } from "../../lib/content";
import { clientLaunches } from "../../lib/recentWork";
import { productCardBranding } from "../../lib/productCardBranding";

function getProductHref(slug: string) {
  if (slug === "peacepad") return "/peacepad";
  if (slug === "saywetin") return "/saywetin";
  if (slug === "dispatch") return "/products/dispatch";
  return "/products";
}

export default function HomePageExperience() {
  const primaryProducts = projectCaseStudies.filter((p) => p.slug !== "ateam");

  return (
    <div className="home-page">

      {/* ── 1. ATEAM intake — the whole first experience ───────────────────── */}
      <section className="home-ateam-hero home-ateam-hero--hp">
        <div className="container">
          <div className="home-ateam-hero-intro">
            <p className="eyebrow">Una Labs · ATEAM</p>
            <h1 className="hero-primary-title">
              Type your idea. ATEAM turns it into a structured, decision-ready plan.
            </h1>
            <p className="hero-subtitle">
              Start here. No forms. No separate page. Just describe the request
              and watch ATEAM scope, route, and deliver a usable output.
            </p>
          </div>

          <div className="home-ateam-hero-surface">
            <AteamHomeWidget />
          </div>

          <div className="home-ateam-hero-foot">
            <ul className="home-ateam-hero-points">
              <li>Intake captures goals, context, and constraints before anything moves.</li>
              <li>A visible workflow runs in real time — route, build, review, pack.</li>
              <li>Output is decision-ready: scoped plan, recommended lane, next step.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 2. Trust strip ─────────────────────────────────────────────────── */}
      <ClientLogoStrip />

      {/* ── 3. Products — secondary proof layer ───────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Studio products</p>
            <h2>Proof of what Una Labs ships</h2>
            <p>
              These are the studio-owned systems — built, branded, and operated inside Una Labs.
            </p>
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
                  <ul className="chip-list">
                    {project.tags.slice(0, 3).map((tag) => (
                      <li key={tag} className="chip">{tag}</li>
                    ))}
                  </ul>
                  <Link href={getProductHref(project.slug)} prefetch={false} className="inline-link">
                    View product
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Client launches — delivery proof ──────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Client launches</p>
            <h2>Live delivery proof</h2>
            <p>Real rollouts, real operating teams, real systems.</p>
          </div>

          <div className="cards-grid cards-grid-3 home-product-preview-grid">
            {clientLaunches.slice(0, 3).map((launch) => {
              const style = {
                "--glance-accent": launch.brand.accent,
                "--glance-soft": launch.brand.accentSoft,
              } as CSSProperties;

              return (
                <article key={launch.slug} className="card home-product-preview-card">
                  <div className="home-glance-launch-badge" style={style}>
                    <span>{launch.brand.mark}</span>
                  </div>
                  <h3>{launch.brand.wordmark}</h3>
                  <p className="muted">{launch.status}</p>
                  <Link href={`/work/${launch.slug}`} prefetch={false} className="inline-link">
                    View launch
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="home-section-heading" style={{ marginTop: "var(--space-4)" }}>
            <Link href="/work" prefetch={false} className="btn btn-secondary">
              All Client Launches
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. CTA ─────────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <CTABanner
            title="Ready to move from idea to structured plan?"
            description="Type your idea above, or start a project with Una Labs directly."
            primaryLabel="Start a Project"
            primaryHref="/work-with-ftc"
            secondaryLabel="View Products"
            secondaryHref="/products"
          />
        </div>
      </section>

    </div>
  );
}
