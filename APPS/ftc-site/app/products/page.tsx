import Link from "next/link";
import BrandImagePanel from "../components/BrandImagePanel";
import { projectCaseStudies } from "../../lib/content";

export const metadata = {
  title: "Products | Una Labs",
  description: "Internal Una Labs products and capability engines."
};

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
          <article key={project.slug} className="card">
            <h2>{project.name}</h2>
            <p className="muted">{project.tagline}</p>
            <p>{project.summary}</p>
            <p className="status-pill">{project.status.replace("-", " ")}</p>
            <Link
              href={
                project.slug === "peacepad"
                  ? "/peacepad"
                  : project.slug === "saywetin"
                    ? "/saywetin"
                    : `/work/${project.slug}`
              }
              className="inline-link"
            >
              View product overview
            </Link>
            <Link href={`/work/${project.slug}`} className="inline-link">
              Read project case study
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
