import Link from "next/link";
import BrandImagePanel from "../components/BrandImagePanel";
import GooglePlayBadge from "../components/GooglePlayBadge";
import { projectCaseStudies, type ProjectCaseStudy } from "../../lib/content";

export const metadata = {
  title: "Products | Una Labs",
  description: "Internal Una Labs products and capability engines."
};

function getProductOverviewHref(project: ProjectCaseStudy): string {
  return project.slug === "peacepad"
    ? "/peacepad"
    : project.slug === "saywetin"
      ? "/saywetin"
      : `/work/${project.slug}`;
}

function getLifecycleStatusLabel(project: ProjectCaseStudy): string {
  return project.status === "live"
    ? "Live"
    : project.status === "active-development"
      ? "Active Development"
      : "Internal Runtime";
}

export default function ProductsPage() {
  return (
    <div className="container page-content">
      <section className="page-media-banner fade-on-scroll">
        <div className="page-media-copy">
          <p className="eyebrow">Product ecosystem</p>
          <h1>Products</h1>
          <p className="page-intro">
            Una Labs product tracks are both market-facing tools and capability engines for a
            broader platform direction.
          </p>
          <p>
            The product portfolio spans communication intelligence, cultural interpretation,
            and orchestration runtime systems designed to reinforce one another over time.
          </p>
        </div>
        <BrandImagePanel
          src="/images/brand/unalabs-ecosystem.PNG"
          alt="Una Labs product ecosystem image"
          aspect="wide"
          sizes="(max-width: 980px) 100vw, 44vw"
          caption={
            <p className="muted">
              A visual summary of how the product lines fit into a broader Una Labs capability
              stack.
            </p>
          }
        />
      </section>

      <div className="cards-grid cards-grid-3">
        {projectCaseStudies.map((project) => (
          <article key={project.slug} className="card product-spotlight-card">
            <p className="status-pill">
              {project.availabilityLabel ?? getLifecycleStatusLabel(project)}
            </p>
            <h2>{project.name}</h2>
            <p className="muted">{project.tagline}</p>
            <p>{project.summary}</p>
            {project.marketingBullets?.length ? (
              <ul className="feature-list compact-feature-list">
                {project.marketingBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            <div className="product-actions">
              <Link
                href={getProductOverviewHref(project)}
                prefetch={false}
                className="btn btn-secondary product-spotlight-link"
              >
                {project.slug === "peacepad" || project.slug === "saywetin"
                  ? `View ${project.name}`
                  : "View product overview"}
              </Link>
              {project.googlePlayUrl ? (
                <a
                  href={project.googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary product-spotlight-link"
                >
                  Get it on Google Play
                </a>
              ) : null}
            </div>
            {project.googlePlayUrl ? (
              <GooglePlayBadge href={project.googlePlayUrl} title={project.name} />
            ) : null}
            <Link href={`/work/${project.slug}`} prefetch={false} className="inline-link">
              Read project case study
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
