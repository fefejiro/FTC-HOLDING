import Link from "next/link";
import type { ProjectCaseStudy } from "../../lib/content";
import BrandImagePanel from "./BrandImagePanel";

interface HeroProps {
  projects: ProjectCaseStudy[];
}

export default function Hero({ projects }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-noise" aria-hidden="true" />
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Creative AI Studio</p>
          <h1>Una Labs &mdash; Creative AI Studio</h1>
          <p className="lead">
            Building AI systems, automation tools, and intelligent products.
          </p>
          <div className="hero-actions">
            <Link
              href="/work"
              prefetch={false}
              className="btn btn-primary"
              data-analytics-event="view_work_click"
              data-analytics-location="hero"
            >
              Explore Our Work
            </Link>
            <Link
              href="/products"
              prefetch={false}
              className="btn btn-secondary"
              data-analytics-event="view_products_click"
              data-analytics-location="hero"
            >
              View Products
            </Link>
          </div>
          <p className="proof-strip">Featured products: PeacePad | SayWetin | ATEAM</p>
        </div>

        <div className="hero-collage hero-visual-stack">
          <BrandImagePanel
            src="/images/brand/unalabs-hero.PNG"
            alt="Una Labs flagship studio artwork showing the brand's premium AI product direction"
            priority
            aspect="hero"
            sizes="(max-width: 980px) 100vw, 44vw"
            className="hero-feature-media"
            overlay={
              <div className="hero-media-note">
                <p className="card-kicker">Flagship Direction</p>
                <strong>Calm systems for builders shipping real AI products.</strong>
              </div>
            }
            caption={
              <p className="muted">
                A premium studio image framing Una Labs as a focused, product-led AI practice.
              </p>
            }
          />

          <div>
            <h2 className="collage-label">Product Showcase</h2>
            <div className="hero-product-rail">
              {projects.map((project) => (
                <article key={project.slug} className="collage-card hero-product-card">
                  <h3>{project.name}</h3>
                  <p>{project.tagline}</p>
                  <Link
                    href={project.slug === "ateam" ? "/work/ateam" : `/${project.slug}`}
                    prefetch={false}
                    className="inline-link"
                  >
                    View product
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
