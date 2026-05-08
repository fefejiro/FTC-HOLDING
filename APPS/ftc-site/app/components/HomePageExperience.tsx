import Link from "next/link";
import { clientLaunches } from "../../lib/recentWork";
import { projectCaseStudies } from "../../lib/content";
import { engagementOffers } from "../../lib/engagementOffers";

function getProductHref(slug: string) {
  if (slug === "peacepad") return "/products/peacepad";
  if (slug === "saywetin") return "/saywetin";
  if (slug === "dispatch") return "/products/dispatch";
  return "/products";
}

const FLOW_STEPS = [
  {
    num: "01",
    label: "Describe the need",
    detail: "Rough request, idea, or problem. No polish required."
  },
  {
    num: "02",
    label: "Structured scope",
    detail: "ATEAM turns the input into a brief, lane, and recommended direction."
  },
  {
    num: "03",
    label: "Proposal + deposit",
    detail: "One clear offer. Pay a deposit through Stripe to confirm the engagement."
  },
  {
    num: "04",
    label: "Delivery",
    detail: "Governed execution, approval gates, and a handoff-ready output."
  }
];

export default function HomePageExperience() {
  const primaryProducts = projectCaseStudies.filter((p) => p.slug !== "ateam").slice(0, 3);
  const featuredLaunch = clientLaunches[0];

  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <section className="section sunrise-hero-section">
        <div className="container">
          <div className="sunrise-hero-shell">
            <div className="sunrise-hero-copy">
              <p className="sunrise-kicker">Una Labs</p>
              <h1>From client request to delivered project, with proof.</h1>
              <p className="sunrise-lead">
                Una Labs structures your intake, scopes the work with AI, and gives every project a live workspace.
                Your clients can see what is done, what is in progress, and what comes next.
              </p>
              <div className="sunrise-action-row">
                <Link href="/start" prefetch={false} className="sunrise-btn sunrise-btn--primary">
                  Start Your Project
                </Link>
                <Link href="/login" prefetch={false} className="sunrise-btn sunrise-btn--secondary">
                  Login
                </Link>
              </div>
            </div>

            <div className="sunrise-preview-card" aria-hidden="true">
              <div className="sunrise-browser-bar">
                <span />
                <span />
                <span />
                <div className="sunrise-browser-address">app.unalabs.cloud/project/MRD-2041</div>
              </div>
              <div className="sunrise-preview-content">
                <div className="sunrise-preview-header-row">
                  <strong>Enterprise Intake Automation</strong>
                  <span>In Progress</span>
                </div>
                <div className="sunrise-progress-track">
                  <div className="sunrise-progress-fill" />
                </div>
                <div className="sunrise-preview-panel">
                  <p>Milestone tracker</p>
                  <ul>
                    <li><span>Kickoff and discovery</span><strong>Apr 3</strong></li>
                    <li><span>Intake form live</span><strong>Apr 7</strong></li>
                    <li><span>Email sequence configured</span><strong>Apr 11</strong></li>
                    <li className="is-active"><span>CRM integration</span><strong>Apr 15</strong></li>
                    <li><span>Final handoff and sign-off</span><strong>Apr 18</strong></li>
                  </ul>
                </div>
                <div className="sunrise-stats-row">
                  <div><strong>3/4</strong><span>Deliverables done</span></div>
                  <div><strong>0</strong><span>Blockers</span></div>
                  <div><strong>3d</strong><span>Until sign-off</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="sunrise-proof-grid">
            <article className="sunrise-proof-card">
              <h3>Full site</h3>
              <p className="sunrise-proof-label">Not a mockup</p>
              <p>Positioning, pages, intake, and conversion paths built as real launch-ready routes.</p>
            </article>
            <article className="sunrise-proof-card">
              <h3>Local SEO</h3>
              <p className="sunrise-proof-label">Built in</p>
              <p>Canonical URLs, structured metadata, and local search setup are part of delivery, not an add-on.</p>
            </article>
            <article className="sunrise-proof-card">
              <h3>Workflow scope</h3>
              <p className="sunrise-proof-label">Functional</p>
              <p>Request handling, approvals, and operational handoff are wired into the build path from day one.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section sunrise-section">
        <div className="container">
          <div className="sunrise-section-heading">
            <p className="sunrise-kicker">How it works</p>
            <h2>One delivery path from rough ask to shipped outcome</h2>
            <p>No vague consulting loop. The request gets structured, priced, approved, and delivered in a visible sequence.</p>
          </div>
          <div className="sunrise-steps-grid">
            {FLOW_STEPS.map((step) => (
              <article key={step.num} className="sunrise-step-card">
                <span className="sunrise-step-number">{step.num}</span>
                <h3>{step.label}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section sunrise-section">
        <div className="container">
          <div className="sunrise-section-heading">
            <p className="sunrise-kicker">Engagement paths</p>
            <h2>Pick the right way in</h2>
            <p>Each track matches a different level of clarity, urgency, and build depth.</p>
          </div>
          <div className="sunrise-offers-grid">
            {engagementOffers.map((offer, index) => (
              <article key={offer.value} className={`sunrise-offer-card${index === 0 ? " is-featured" : ""}`}>
                <p className="sunrise-offer-meta">{offer.meta}</p>
                <h3>{offer.title}</h3>
                <p className="sunrise-offer-price">{offer.price}</p>
                <p>{offer.summary}</p>
                <p className="sunrise-offer-ideal"><strong>Best for:</strong> {offer.idealFor}</p>
                <Link href={`/work-with-ftc?offer=${offer.value}`} prefetch={false} className={index === 0 ? "sunrise-btn sunrise-btn--primary" : "sunrise-btn sunrise-btn--secondary"}>
                  Start with this track
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section sunrise-section">
        <div className="container">
          <div className="sunrise-feature-band">
            <div>
              <p className="sunrise-kicker">Delivery proof</p>
              <h2>{featuredLaunch?.brand.wordmark ?? "Recent client launch"}</h2>
              <p>
                {featuredLaunch?.service ?? "Recent delivery work"} moved through the same intake, scope, and governed execution model.
              </p>
              <Link href={`/work/${featuredLaunch?.slug ?? "garden-cleaners"}`} prefetch={false} className="sunrise-inline-link">
                View launch proof
              </Link>
            </div>
            <div className="sunrise-mini-proof-grid">
              {clientLaunches.slice(0, 3).map((launch) => (
                <article key={launch.slug} className="sunrise-mini-proof-card">
                  <h3>{launch.brand.wordmark}</h3>
                  <p>{launch.offerProof.label}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section sunrise-section">
        <div className="container">
          <div className="sunrise-section-heading">
            <p className="sunrise-kicker">Studio products</p>
            <h2>Built inside the same operating system</h2>
            <p>Dispatch, SayWetin, and PeacePad are product proofs of the same workflow-led delivery model.</p>
          </div>
          <div className="sunrise-products-grid">
            {primaryProducts.map((project) => (
              <article key={project.slug} className="sunrise-product-card">
                <p className="sunrise-product-label">{project.availabilityLabel ?? project.pillar.replace("-", " ")}</p>
                <h3>{project.name}</h3>
                <p>{project.summary}</p>
                <Link href={getProductHref(project.slug)} prefetch={false} className="sunrise-inline-link">
                  View product
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section sunrise-section sunrise-section--final">
        <div className="container">
          <div className="sunrise-final-cta">
            <div>
              <p className="sunrise-kicker">Start here</p>
              <h2>Describe what you need. We will scope the next move.</h2>
              <p>Bring the brief, the rough idea, or the messy operational problem. Una Labs turns it into the clearest next deliverable.</p>
            </div>
            <div className="sunrise-action-row">
              <Link href="/work-with-ftc" prefetch={false} className="sunrise-btn sunrise-btn--primary">
                Start your request
              </Link>
              <Link href="/services" prefetch={false} className="sunrise-btn sunrise-btn--secondary">
                View services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
