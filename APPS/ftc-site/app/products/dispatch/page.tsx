export const dynamic = "force-static";

import Link from "next/link";
import ProductStatusBadge from "../../components/ProductStatusBadge";
import { getProjectCaseStudy } from "../../../lib/content";

const dispatchProduct = getProjectCaseStudy("dispatch");

export const metadata = {
  title: "Dispatch | Products | Una Labs",
  description:
    "Dispatch is Una Labs' live Ottawa roadside assistance product with customer intake, operator routing, and official incident watch."
};

const dispatchHighlights = [
  "Roadside requests for fuel delivery, lockouts, jump starts, and tire changes",
  "Invite-only operator demo with live request movement and incident drill-down",
  "Client-safe demo loop without exposing admin controls",
  "Official Ottawa-area incident watch using no-key public sources"
] as const;

const dispatchFlow = [
  {
    title: "Customer request",
    body: "A stranded driver opens Dispatch, shares the issue and location, and gets the request into the live system quickly."
  },
  {
    title: "System routing",
    body: "Dispatch classifies the job, keeps the active state visible, and layers in live incident watch where it helps."
  },
  {
    title: "Operator movement",
    body: "The operator surface receives the update live, lets the team drill into the event, and keeps status changes readable."
  }
] as const;

export default function DispatchProductPage() {
  const dispatchStatus = dispatchProduct?.status ?? "early";

  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <div className="container products-page">
      <section className="products-intro">
        <div className="product-hero-top">
          <p className="sunrise-kicker">Product</p>
          <ProductStatusBadge status={dispatchStatus} />
        </div>
        <h1>Dispatch</h1>
        <p className="sunrise-lead">
          Dispatch is the live Ottawa roadside assistance product inside Una Labs. The client path is
          simple: submit a sample roadside request, sign in as the invited operator, work the request,
          and send feedback from inside the system.
        </p>
        <div className="product-actions">
          <a
            href="https://dispatch.unalabs.cloud/request?mode=demo"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Try Dispatch Demo
          </a>
          <a
            href="https://dispatch.unalabs.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Live Dispatch
          </a>
        </div>
      </section>

      <section className="cards-grid cards-grid-2 products-primary-grid">
        <article className="card product-spotlight-card">
          <p className="eyebrow">Overview</p>
          <h2>What it does</h2>
          <p>
            Dispatch starts with direct roadside requests first, then adds live incident visibility
            so an operator team can react faster without rebuilding the workflow later.
          </p>
          <ul className="feature-list compact-feature-list">
            {dispatchHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card product-spotlight-card">
          <p className="eyebrow">Demo flow</p>
          <h2>How to test it</h2>
          <p>
            The first client round should stay on the operator sandbox only. Admin remains private so
            the demo feels clean and safe.
          </p>
          <ol className="feature-list compact-feature-list">
            <li>Submit a sample roadside request</li>
            <li>Sign in as operator with the credentials you were given</li>
            <li>Complete the flow and send feedback</li>
          </ol>
          <p className="muted">Operator testing is available by invite. Admin remains private and is not part of the client flow.</p>
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
          <h2>Want a dispatch-style system for your own operation?</h2>
          <p className="muted">
            Una Labs can scope a similar live intake, routing, and operator workflow for a local
            service business that needs faster response and clearer movement.
          </p>
        </div>
        <div className="product-actions">
          <a
            href="https://dispatch.unalabs.cloud/request?mode=demo"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Try Dispatch Demo
          </a>
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
            Start a Project
          </Link>
          <a
            href="https://dispatch.unalabs.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Live Dispatch
          </a>
        </div>
      </article>
      </div>
    </div>
  );
}
