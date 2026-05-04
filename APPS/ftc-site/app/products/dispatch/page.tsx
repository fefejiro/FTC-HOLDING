export const dynamic = "force-static";

import Link from "next/link";
import ProductStatusBadge from "../../components/ProductStatusBadge";
import { getProjectCaseStudy } from "../../../lib/content";

const dispatchProduct = getProjectCaseStudy("dispatch");

export const metadata = {
  title: "Tow Signal | Products | Una Labs",
  description:
    "Tow Signal is Una Labs' live Ottawa roadside assistance product with customer intake, operator routing, and official incident watch."
};

const dispatchHighlights = [
  "Roadside requests for fuel delivery, lockouts, jump starts, and tire changes",
  "Invite-only operator workflow with live request movement and incident drill-down",
  "Private admin host separated from the public product flow",
  "Official Ottawa-area incident watch using lean-source coverage"
] as const;

const dispatchFlow = [
  {
    title: "Customer request",
    body: "A stranded driver opens Tow Signal, shares the issue and location, and gets the request into the live system quickly."
  },
  {
    title: "System routing",
    body: "Tow Signal classifies the job, keeps the active state visible, and layers in live incident watch where it helps."
  },
  {
    title: "Operator movement",
    body: "The operator surface receives the update live, lets the team drill into the event, and keeps status changes readable."
  }
] as const;

export default function DispatchProductPage() {
  const dispatchStatus = dispatchProduct?.status ?? "early";

  return (
    <div className="container page-content products-page">
      <section className="products-intro">
        <div className="product-hero-top">
          <p className="eyebrow">Product</p>
          <ProductStatusBadge status={dispatchStatus} />
        </div>
        <h1>Tow Signal</h1>
        <p className="page-intro">
          Tow Signal is the live Ottawa roadside assistance product inside Una Labs. The internal runtime still
          lives in the Dispatch repo path, but the public product now leads with a clearer premium brand for
          roadside intake, operator routing, and incident awareness.
        </p>
        <div className="product-actions">
          <a
            href="https://dispatch.unalabs.cloud/request"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open Tow Signal
          </a>
          <a
            href="https://dispatch.unalabs.cloud/operator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Operator Surface
          </a>
        </div>
      </section>

      <section className="cards-grid cards-grid-2 products-primary-grid">
        <article className="card product-spotlight-card">
          <p className="eyebrow">Overview</p>
          <h2>What it does</h2>
          <p>
            Tow Signal starts with direct roadside requests first, then adds live incident visibility
            so an operator team can react faster without rebuilding the workflow later.
          </p>
          <ul className="feature-list compact-feature-list">
            {dispatchHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card product-spotlight-card">
          <p className="eyebrow">Positioning</p>
          <h2>Why the new name matters</h2>
          <p>
            Tow Signal is easier to remember than a generic Dispatch label and better captures the blend
            of roadside service movement plus incident intelligence.
          </p>
          <ol className="feature-list compact-feature-list">
            <li>Stronger app-store naming potential</li>
            <li>Better client recall and referral value</li>
            <li>Cleaner path to premium visual redesign</li>
          </ol>
          <p className="muted">Internal service IDs can remain Dispatch while the public product carries the Tow Signal brand.</p>
        </article>
      </section>

      <section className="cards-grid cards-grid-3 products-primary-grid">
        {dispatchFlow.map((step) => (
          <article key={step.title} className="card product-spotlight-card">
            <p className="eyebrow">Flow</p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Need a Tow Signal-style system for your operation?</h2>
          <p className="muted">
            Una Labs can scope a similar live intake, routing, and operator workflow for a local
            service business that needs faster response and clearer movement.
          </p>
        </div>
        <div className="product-actions">
          <a
            href="https://dispatch.unalabs.cloud/request"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open Tow Signal
          </a>
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
            Start a Project
          </Link>
          <a
            href="https://dispatch.unalabs.cloud/operator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Operator Surface
          </a>
        </div>
      </article>
    </div>
  );
}
