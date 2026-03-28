import Link from "next/link";

export const metadata = {
  title: "Dispatch | Products | Una Labs",
  description:
    "Dispatch is Una Labs' live Ottawa roadside assistance product with customer intake, operator routing, and official incident watch."
};

const dispatchHighlights = [
  "Roadside requests for fuel delivery, lockouts, jump starts, and tire changes",
  "Operator console with live request movement and incident drill-down",
  "Private admin surface for request control and operator management",
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
  return (
    <div className="container page-content products-page">
      <section className="products-intro">
        <p className="eyebrow">Product</p>
        <h1>Dispatch</h1>
        <p className="page-intro">
          Dispatch is the live Ottawa roadside assistance product inside Una Labs. It handles public
          roadside intake, operator routing, and official incident watch in one browser-based system.
        </p>
        <div className="product-actions">
          <a
            href="https://dispatch.unalabs.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open Dispatch
          </a>
          <a
            href="https://dispatch.unalabs.cloud/request"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Open request form
          </a>
        </div>
      </section>

      <section className="cards-grid cards-grid-2 products-primary-grid">
        <article className="card product-spotlight-card">
          <p className="status-pill">Live on Una Labs</p>
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
          <p className="status-pill">Built for Ottawa</p>
          <h2>Why it matters</h2>
          <p>
            The product is tuned for local roadside operations where speed, clarity, and live
            operator feedback matter more than a heavy app-store rollout on day one.
          </p>
          <p className="muted">
            Public access stays on the live Dispatch app. Private operator and admin controls remain
            on separate secured surfaces and are not exposed on the public marketing site.
          </p>
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
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a Project
          </Link>
          <a
            href="https://dispatch.unalabs.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Visit Dispatch
          </a>
        </div>
      </article>
    </div>
  );
}
