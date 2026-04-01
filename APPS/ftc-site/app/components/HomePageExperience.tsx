import Link from "next/link";
import CTABanner from "./CTABanner";
import ClientLogoStrip from "./ClientLogoStrip";
import BrandVideoPanel from "./BrandVideoPanel";
import ProductBrandBadge from "./ProductBrandBadge";
import ProductStatusBadge from "./ProductStatusBadge";
import AteamProductPreview from "./AteamProductPreview";
import { projectCaseStudies } from "../../lib/content";
import { clientLaunches } from "../../lib/recentWork";
import { productCardBranding } from "../../lib/productCardBranding";
import { ATEAM_PRODUCT_PREVIEW_ASSET } from "../../lib/ateamEmbed";

function getProductHref(slug: string) {
  if (slug === "peacepad") return "/peacepad";
  if (slug === "saywetin") return "/saywetin";
  if (slug === "dispatch") return "/products/dispatch";
  return "/products";
}

export default function HomePageExperience() {
  const primaryProducts = projectCaseStudies.filter((project) => project.slug !== "ateam");
  const ateamProject = projectCaseStudies.find((project) => project.slug === "ateam");

  return (
    <div className="home-page">
      <section className="section section-hero">
        <div className="container">
          <section className="hero home-studio-hero">
            <div className="hero-noise" aria-hidden="true" />
            <div className="hero-grid premium-hero-grid">
              <div className="premium-hero-copy home-studio-hero-copy">
                <p className="eyebrow">Una Labs</p>
                <p className="hero-urgency-pill">
                  <span>+</span>
                  Operator-led AI build studio
                </p>
                <h1 className="hero-primary-title">
                  Products, client launches, and clearer next systems.
                </h1>
                <p className="hero-subtitle">
                  Una Labs is the umbrella studio for shipped products, live client delivery, and
                  ATEAM-guided workflow shaping when an idea is still rough.
                </p>
                <div className="hero-cta-row">
                  <Link href="/products" prefetch={false} className="btn btn-primary">
                    Explore Products
                  </Link>
                  <Link href="/work" prefetch={false} className="btn btn-secondary">
                    View Client Launches
                  </Link>
                  <Link href="/ateam" prefetch={false} className="inline-link">
                    Explore ATEAM
                  </Link>
                </div>
                <ul className="hero-credibility-bullets home-studio-credibility">
                  <li>Studio-owned products show how Una Labs ships and operates its own systems.</li>
                  <li>Client Launches shows the delivery side with real business rollout proof.</li>
                  <li>ATEAM is the dedicated workflow system for turning rough ideas into scoped next steps.</li>
                </ul>
              </div>

              <div className="hero-collage hero-visual-stack home-studio-visual-stack">
                <BrandVideoPanel
                  src="/images/brand/unalabs-hero.mp4"
                  poster="/images/brand/unalabs-hero.PNG"
                  title="Una Labs studio reel"
                  aspect="hero"
                  preload="metadata"
                  className="hero-feature-media"
                  overlay={
                    <div className="hero-media-note">
                      <p className="card-kicker">Studio overview</p>
                      <strong>One studio, three proof lanes: products, launches, and ATEAM.</strong>
                    </div>
                  }
                  caption={
                    <>
                      <p className="card-kicker">Umbrella brand</p>
                      <p className="muted">
                        Una Labs is the studio layer above the products and systems it operates.
                      </p>
                    </>
                  }
                />

                <div className="cards-grid cards-grid-3 home-studio-glance-grid">
                  <article className="card home-glance-card">
                    <p className="card-kicker">Products</p>
                    <strong>PeacePad, SayWetin, Dispatch</strong>
                    <p className="muted">Studio-owned systems with live product proof.</p>
                  </article>
                  <article className="card home-glance-card">
                    <p className="card-kicker">Client Launches</p>
                    <strong>Real delivery snapshots</strong>
                    <p className="muted">Live websites, lead engines, and operator-led builds.</p>
                  </article>
                  <article className="card home-glance-card">
                    <p className="card-kicker">ATEAM</p>
                    <strong>Workflow-first scoping</strong>
                    <p className="muted">The system route for messy ideas that need a clear next move.</p>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <ClientLogoStrip />

      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Studio map</p>
            <h2>Three lanes inside Una Labs</h2>
            <p>
              Home answers what the studio does at a glance. Each lane below opens into its own
              deeper route when you want the full story.
            </p>
          </div>

          <div className="cards-grid cards-grid-3 home-lane-grid">
            <article className="card home-lane-card">
              <p className="card-kicker">Products</p>
              <h3>Shipped tools built inside the studio.</h3>
              <p>
                PeacePad, SayWetin, and Dispatch show the product side of Una Labs: owned systems,
                branded execution, and visible operating proof.
              </p>
              <div className="home-lane-product-row" aria-label="Featured products">
                {primaryProducts.map((project) => {
                  const logo = productCardBranding[project.slug]?.logo;
                  if (!logo) return null;
                  return <ProductBrandBadge key={project.slug} logo={logo} className="home-lane-product-badge" />;
                })}
              </div>
              <Link href="/products" prefetch={false} className="btn btn-secondary">
                Explore Products
              </Link>
            </article>

            <article className="card home-lane-card">
              <p className="card-kicker">Client Launches</p>
              <h3>Delivery proof for live business work.</h3>
              <p>
                Client Launches shows the commercial side of the studio: onboarding snapshots,
                rollout progress, and systems shipped for real operating teams.
              </p>
              <div className="home-lane-launch-list" aria-label="Recent client launches">
                {clientLaunches.slice(0, 3).map((launch) => (
                  <div key={launch.slug} className="home-lane-launch-item">
                    <strong>{launch.brand.wordmark}</strong>
                    <span>{launch.status}</span>
                  </div>
                ))}
              </div>
              <Link href="/work" prefetch={false} className="btn btn-secondary">
                View Client Launches
              </Link>
            </article>

            <article className="card home-lane-card home-lane-card--ateam">
              {ateamProject ? <ProductStatusBadge status={ateamProject.status} className="home-lane-status" /> : null}
              <p className="card-kicker">ATEAM</p>
              <h3>The workflow system for rough ideas.</h3>
              <p>
                ATEAM lives inside Una Labs as the product route for messy starts. It turns rough
                input into structure, visible work, and a cleaner handoff.
              </p>
              <AteamProductPreview
                title="ATEAM teaser preview"
                posterSrc={ATEAM_PRODUCT_PREVIEW_ASSET.posterSrc}
                webmSrc={ATEAM_PRODUCT_PREVIEW_ASSET.webmSrc}
                mp4Src={ATEAM_PRODUCT_PREVIEW_ASSET.mp4Src}
                hasVideo={ATEAM_PRODUCT_PREVIEW_ASSET.hasVideo}
              />
              <Link href="/ateam" prefetch={false} className="btn btn-primary">
                Explore ATEAM
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Product proof</p>
            <h2>Products built and operated inside Una Labs</h2>
            <p>
              These are the studio-owned systems. They show how Una Labs turns a capability into a
              real product with branding, motion, and public-facing execution.
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
          <CTABanner
            title="Need Una Labs to shape the next system?"
            description="Start with the studio if you already know the commercial path. Start with ATEAM if the idea still needs structure before build."
            primaryLabel="Start a Project"
            primaryHref="/work-with-ftc"
            secondaryLabel="Explore ATEAM"
            secondaryHref="/ateam"
          />
        </div>
      </section>
    </div>
  );
}
