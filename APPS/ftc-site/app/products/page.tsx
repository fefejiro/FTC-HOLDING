export const dynamic = "force-static";

import Image from "next/image";
import Link from "next/link";
import GooglePlayBadge from "../components/GooglePlayBadge";
import ProductBrandBadge from "../components/ProductBrandBadge";
import ProductStatusBadge from "../components/ProductStatusBadge";
import { ATEAM_BRAND_LOGO_PATH, ATEAM_MISSION_CONTROL_PREVIEW_PATH } from "../../lib/ateamEmbed";
import { ateamModeSummary } from "../../lib/ateamMode";
import { projectCaseStudies, type ProjectCaseStudy } from "../../lib/content";
import { productCardBranding } from "../../lib/productCardBranding";

export const metadata = {
  title: "Products | Una Labs",
  description: "Public products and guided systems from Una Labs."
};

function getProductOverviewHref(project: ProjectCaseStudy): string {
  return project.slug === "peacepad"
    ? "/products/peacepad"
    : project.slug === "saywetin"
      ? "/saywetin"
      : project.slug === "dispatch"
        ? "/products/dispatch"
      : "/ateam";
}

export default function ProductsPage() {
  const featuredAteam = projectCaseStudies.find((item) => item.slug === "ateam");
  const primaryProducts = projectCaseStudies.filter((item) => item.slug !== "ateam");

  return (
    <div className="container page-content products-page">
      <section className="products-intro">
        <p className="eyebrow">Products</p>
        <h1>Products built inside Una Labs</h1>
        <p className="page-intro">
          These products are proof that Una Labs ships real systems. PeacePad, SayWetin, and
          Dispatch show public execution. ATEAM shows how rough ideas become structured next
          steps and cleaner project handoff.
        </p>
      </section>

      <div className="cards-grid cards-grid-2 products-primary-grid">
        {primaryProducts.map((project) => {
          const branding = productCardBranding[project.slug];
          const supportPoints = project.marketingBullets ?? branding?.supportPoints ?? [];

          return (
            <article key={project.slug} className="card product-spotlight-card">
              <ProductStatusBadge status={project.status} className="product-status-badge--floating" />
              <div className="product-card-header">
                {branding?.logo ? <ProductBrandBadge logo={branding.logo} /> : null}
                <div className="product-card-heading">
                  <h2>{project.name}</h2>
                  <p className="muted">{project.tagline}</p>
                </div>
              </div>
              <p>{branding?.offerCopy ?? project.summary}</p>
              <ul className="feature-list compact-feature-list">
                {supportPoints.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="product-card-cta-stack">
                <div className="product-actions product-actions-stack">
                  {project.googlePlayUrl ? (
                    <a
                      href={project.googlePlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary product-spotlight-link"
                    >
                      Install on Google Play
                    </a>
                  ) : null}
                  <Link
                    href={getProductOverviewHref(project)}
                    prefetch={false}
                    className="btn btn-secondary product-spotlight-link"
                  >
                    {branding?.secondaryLabel ?? "See product overview"}
                  </Link>
                </div>
                {project.googlePlayUrl ? (
                  <GooglePlayBadge href={project.googlePlayUrl} title={project.name} />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {featuredAteam ? (
        <article className="card product-spotlight-card product-spotlight-card--featured">
          <ProductStatusBadge status={featuredAteam.status} className="product-status-badge--floating" />
          <div className="product-spotlight-feature product-spotlight-feature--ateam">
            <div className="product-spotlight-feature-copy">
              <h2>ATEAM</h2>
              <p className="muted">The intake-to-delivery engine behind the studio.</p>
              <p>
                {ateamModeSummary} It is strongest as the system that helps Una Labs turn rough
                business and workflow ideas into scoped first passes, not as a detached demo.
              </p>
              <ul className="feature-list compact-feature-list">
                {(featuredAteam.marketingBullets ?? productCardBranding.ateam.supportPoints ?? []).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="product-actions">
                <Link href="/ateam" prefetch={false} className="btn btn-primary">
                  Open ATEAM
                </Link>
                <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                  Start a Project
                </Link>
              </div>
            </div>
            <div className="product-ateam-visual">
              <div className="product-ateam-visual-mark" aria-hidden="true">
                <Image src={ATEAM_BRAND_LOGO_PATH} alt="" width={58} height={58} />
              </div>
              <Image
                src={ATEAM_MISSION_CONTROL_PREVIEW_PATH}
                alt="ATEAM mission control preview"
                className="product-ateam-preview"
                width={960}
                height={540}
              />
              <p className="muted">
                Intake, routing, artifacts, and delivery state sit inside the same ATEAM flow so
                a rough idea can become a real commercial handoff without starting over.
              </p>
            </div>
          </div>
        </article>
      ) : null}

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Need a system like these for your own team?</h2>
          <p className="muted">
            Start with ATEAM if the problem is still messy. Send the request directly if you
            already know the system you need.
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
  );
}
