import type { CSSProperties } from "react";
import Link from "next/link";
import AteamProductPreview from "./AteamProductPreview";
import ClientLogoStrip from "./ClientLogoStrip";
import ProductBrandBadge from "./ProductBrandBadge";
import ProductStatusBadge from "./ProductStatusBadge";
import { clientLaunches } from "../../lib/recentWork";
import { projectCaseStudies } from "../../lib/content";
import { productCardBranding } from "../../lib/productCardBranding";
import { ATEAM_PRODUCT_PREVIEW_ASSET } from "../../lib/ateamEmbed";
import { ATEAM_SITE_URL } from "../../lib/site";

function getProductHref(slug: string) {
  if (slug === "peacepad") return "/products/peacepad";
  if (slug === "saywetin") return "/saywetin";
  if (slug === "dispatch") return "/products/dispatch";
  return "/products";
}

export default function HomePageExperience() {
  const primaryProducts = projectCaseStudies.filter((project) => project.slug !== "ateam");

  return (
    <div className="home-page">
      <section className="section">
        <div className="container">
          <div className="card home-hero home-hero-enterprise">
            <div className="premium-hero-grid">
              <div className="premium-hero-copy">
                <p className="eyebrow">Trusted AI workflow infrastructure</p>
                <h1>Trusted workflow systems, product proof, and delivery infrastructure.</h1>
                <p className="lead">
                  Una Labs is the public company layer around shipped products, live client launches,
                  and ATEAM — the standalone system that turns rough requests into scoped next steps.
                </p>
                <div className="hero-cta-row">
                  <a href={ATEAM_SITE_URL} className="btn btn-primary">
                    Enter ATEAM
                  </a>
                  <Link href="/products" prefetch={false} className="btn btn-secondary">
                    Explore Products
                  </Link>
                  <Link href="/work" prefetch={false} className="btn btn-secondary">
                    View Client Launches
                  </Link>
                </div>
                <ul className="hero-credibility-bullets">
                  <li>Studio-owned products show how Una Labs designs and operates real systems.</li>
                  <li>Client launches prove the delivery side with shipped sites, systems, and rollout paths.</li>
                  <li>ATEAM stays separate from the marketing shell so the live system can feel operational, not brochure-first.</li>
                </ul>
              </div>

              <div className="hero-media-card hero-media-card--ateam">
                <p className="card-kicker">ATEAM system preview</p>
                <AteamProductPreview
                  title="ATEAM Mission Control preview"
                  posterSrc={ATEAM_PRODUCT_PREVIEW_ASSET.posterSrc}
                  webmSrc={ATEAM_PRODUCT_PREVIEW_ASSET.webmSrc}
                  mp4Src={ATEAM_PRODUCT_PREVIEW_ASSET.mp4Src}
                  hasVideo={ATEAM_PRODUCT_PREVIEW_ASSET.hasVideo}
                />
                <p className="hero-media-caption">
                  ATEAM is the operating system behind structured intake, visible planning, approval,
                  and delivery-ready outputs. It should feel like a live system, not a website section.
                </p>
                <a href={ATEAM_SITE_URL} className="inline-link">
                  Open the standalone ATEAM system →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ClientLogoStrip />

      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Products</p>
            <h2>Proof of what Una Labs ships</h2>
            <p>Dispatch, SayWetin, and PeacePad are shipped products built inside the ATEAM system.</p>
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
                      <li key={tag} className="chip">
                        {tag}
                      </li>
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

      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Client launches</p>
            <h2>Delivery proof from real launch work</h2>
            <p>Operational systems, rollout discipline, and live launch surfaces already in motion.</p>
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
                  <p className="muted">{launch.status}</p>
                  <Link href={`/work/${launch.slug}`} prefetch={false} className="inline-link">
                    View launch
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <article className="card final-cta-card home-final-cta-card">
            <div>
              <p className="eyebrow">Next move</p>
              <h2>Use Una Labs when you need trust. Enter ATEAM when the request still needs structure.</h2>
              <p className="muted">
                The public site explains what the studio ships. ATEAM is where a rough request becomes
                a visible plan, governed execution path, and delivery-ready next step.
              </p>
            </div>
            <div className="product-actions final-cta-actions">
              <a href={ATEAM_SITE_URL} className="btn btn-primary">
                Enter ATEAM
              </a>
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                Start a Project
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
