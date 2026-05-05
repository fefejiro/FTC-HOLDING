export const dynamic = "force-static";

import Link from "next/link";
import BrandImagePanel from "../../components/BrandImagePanel";
import ProductStatusBadge from "../../components/ProductStatusBadge";
import { projectCaseStudies } from "../../../lib/content";

const peacepad = projectCaseStudies.find((project) => project.slug === "peacepad");

export const metadata = {
  title: "PeacePad | Products | Una Labs",
  description:
    "PeacePad is the Una Labs flagship product for pre-send communication safety and calm delivery.",
  alternates: {
    canonical: "https://unalabs.cloud/products/peacepad"
  }
};

export default function PeacePadProductPage() {
  if (!peacepad) {
    return (
      <div className="container page-content">
        <h1>PeacePad</h1>
        <p className="page-intro">Flagship Una Labs product overview coming soon.</p>
        <Link href="/products" className="inline-link">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="container page-content">
      <section className="page-media-banner fade-on-scroll">
        <div className="page-media-copy">
          <div className="product-hero-top">
            <p className="eyebrow">Flagship product</p>
            <ProductStatusBadge status={peacepad.status} />
          </div>
          <h1>{peacepad.name}</h1>
          <p className="page-intro">Pre-send communication safety for high-stakes conversations.</p>
          <p>{peacepad.summary}</p>
          <div className="product-actions">
            {peacepad.googlePlayUrl ? (
              <a
                href={peacepad.googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Install on Google Play
              </a>
            ) : null}
            <Link href={`/work/${peacepad.slug}`} className="btn btn-secondary">
              Read case study
            </Link>
          </div>
        </div>
        <BrandImagePanel
          src="/images/brand/peacepad-directory-03-compose.png"
          alt="PeacePad product preview"
          aspect="portrait"
          sizes="(max-width: 980px) 100vw, 42vw"
          caption={
            <p className="muted">
              PeacePad intervenes before a message is sent so users can choose a calmer next
              action.
            </p>
          }
        />
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Overview</p>
          <h2>PeacePad keeps high-stakes communication calm before it is sent.</h2>
          <p>{peacepad.summary}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Problem</p>
          <h2>{peacepad.sections.problem}</h2>
          <p>{peacepad.sections.insight}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Solution</p>
          <h2>{peacepad.sections.solution}</h2>
          <p>{peacepad.sections.outcome}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Key features</p>
          <h2>Human-in-control guardrails</h2>
          <p>Designed to keep conversations constructive without blocking progress.</p>
        </div>
        <div className="cards-grid cards-grid-3">
          {peacepad.sections.capabilities.map((capability) => (
            <article key={capability} className="card">
              <h3>{capability}</h3>
              <p className="muted">
                Designed to keep communication constructive while staying human-in-control.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Availability</p>
          <h2>{peacepad.availabilityLabel ?? "Live product"}</h2>
          <p>Flagship Una Labs product demonstrating AI-assisted workflow delivery.</p>
        </div>
      </section>
    </div>
  );
}
