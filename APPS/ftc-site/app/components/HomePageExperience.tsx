import type { CSSProperties } from "react";
import Link from "next/link";
import AteamLandingExperience from "./AteamLandingExperience";
import ProductBrandBadge from "./ProductBrandBadge";
import ProductStatusBadge from "./ProductStatusBadge";
import ClientLogoStrip from "./ClientLogoStrip";
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
    <div className="home-page home-page--ateam-first">

      {/* ── 1. Full ATEAM workflow surface ─────────────────────────────────── */}
      <AteamLandingExperience basePath="/" />

      {/* ── 2. Trust strip ─────────────────────────────────────────────────── */}
      <ClientLogoStrip />

      {/* ── 3. Products — secondary proof layer ───────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Studio products</p>
            <h2>Proof of what Una Labs ships</h2>
            <p>Studio-owned systems — built, branded, and operated inside Una Labs.</p>
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

      {/* ── 4. Client launches ────────────────────────────────────────────── */}
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

    </div>
  );
}
