import Link from "next/link";
import type { ProjectCaseStudy } from "../../lib/content";

interface HeroProps {
  projects: ProjectCaseStudy[];
}

export default function Hero({ projects }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-noise" aria-hidden="true" />
      <div className="hero-grid">
        <div>
          <p className="eyebrow">Creative AI Studio</p>
          <h1>Una Labs &mdash; Creative AI Studio</h1>
          <p className="lead">
            Building AI systems, automation tools, and intelligent products.
          </p>
          <div className="hero-actions">
            <Link
              href="/work"
              className="btn btn-primary"
              data-analytics-event="view_work_click"
              data-analytics-location="hero"
            >
              Explore Our Work
            </Link>
            <Link
              href="/products"
              className="btn btn-secondary"
              data-analytics-event="view_products_click"
              data-analytics-location="hero"
            >
              View Products
            </Link>
          </div>
          <p className="proof-strip">Featured products: PeacePad | SayWetin | ATEAM</p>
        </div>
        <div className="hero-collage">
          <h2 className="collage-label">Product Showcase</h2>
          <div className="collage-grid">
            {projects.map((project) => (
              <article key={project.slug} className="collage-card">
                <h3>{project.name}</h3>
                <p>{project.tagline}</p>
                <Link
                  href={project.slug === "ateam" ? "/projects" : `/${project.slug}`}
                  className="inline-link"
                >
                  View product
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
