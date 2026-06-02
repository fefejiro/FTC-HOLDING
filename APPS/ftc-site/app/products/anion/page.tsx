export const dynamic = "force-static";

import Link from "next/link";
import ProductStatusBadge from "../../components/ProductStatusBadge";
import { getProjectCaseStudy } from "../../../lib/content";

const anion = getProjectCaseStudy("anion");

export const metadata = {
  title: "Anion Class App | Products | Una Labs",
  description:
    "Pre-launch case study for Anion Class App, a classroom workflow for tutor discovery, bookings, and live lessons."
};

export default function AnionProductPage() {
  const product = anion;

  return (
    <article className="container page-content case-study">
      <section className="case-study-hero">
        <div>
          <p className="eyebrow">Pre-launch case study</p>
          <h1>Anion Class App</h1>
          <p className="lead">
            A classroom workflow being built around tutor discovery, parent and student onboarding,
            booking governance, and live lesson rooms.
          </p>
          <div className="product-actions">
            <ProductStatusBadge status={product?.status ?? "coming"} />
            <Link href="/products" className="btn btn-secondary">
              Back to products
            </Link>
          </div>
        </div>
      </section>

      <section className="case-study-section">
        <h2>Honest stage</h2>
        <p>
          Anion Class App should be presented as pre-launch, not as a public marketplace. The
          current value is the shape of the system: role-based access, tutor discovery, booking
          flow, live classroom foundation, and a release plan with clear gates.
        </p>
      </section>

      <section className="case-study-section">
        <h2>What is being proved</h2>
        <ul className="case-study-list">
          {(product?.sections.capabilities ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="case-study-section">
        <h2>Roadmap narrative</h2>
        <div className="cards-grid cards-grid-3 overview-grid">
          <article className="card overview-card">
            <p className="eyebrow">Now</p>
            <h3>Foundation</h3>
            <p className="muted">Auth, status routes, lesson-room foundation, and role surfaces.</p>
          </article>
          <article className="card overview-card">
            <p className="eyebrow">Next</p>
            <h3>Launch Readiness</h3>
            <p className="muted">Booking reliability, parent/student QA, tutor workflow, and release docs.</p>
          </article>
          <article className="card overview-card">
            <p className="eyebrow">Later</p>
            <h3>Public Growth</h3>
            <p className="muted">Marketplace language only after real tutor supply, class operations, and support are proven.</p>
          </article>
        </div>
      </section>

      <section className="case-study-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Naming guardrail</p>
            <h2>Use “Anion Class App” consistently.</h2>
            <p className="muted">
              Avoid “Anion marketplace” until the public supply side exists. For now, call it a
              pre-launch classroom workflow and education product case study.
            </p>
          </div>
          <Link href="/work-with-ftc" className="btn btn-primary">
            Scope a similar workflow
          </Link>
        </article>
      </section>
    </article>
  );
}
