import Link from "next/link";
import { projectCaseStudies } from "../../lib/content";

export const metadata = {
  title: "Products | FTC",
  description: "Internal FTC products and capability engines."
};

export default function ProductsPage() {
  return (
    <div className="container page-content">
      <h1>Products</h1>
      <p className="page-intro">
        FTC product tracks are both market-facing tools and capability engines for a
        broader platform direction.
      </p>

      <div className="cards-grid cards-grid-3">
        {projectCaseStudies.map((project) => (
          <article key={project.slug} className="card">
            <h2>{project.name}</h2>
            <p className="muted">{project.tagline}</p>
            <p>{project.summary}</p>
            <p className="status-pill">{project.status.replace("-", " ")}</p>
            <Link href={`/work/${project.slug}`} className="inline-link">
              Read project case study
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

