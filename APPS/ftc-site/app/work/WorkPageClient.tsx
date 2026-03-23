import Link from "next/link";
import { clientLaunches } from "../../lib/recentWork";

export default function WorkPageClient() {
  const featuredLaunch = clientLaunches[0];

  return (
    <div className="container page-content client-launches-page">
      <section className="client-launches-hero">
        <p className="eyebrow">Client Launches</p>
        <h1>Live delivery snapshots, kept separate from products.</h1>
        <p className="page-intro">
          Client Launches shows real onboarding and setup work in progress. Products stays reserved
          for Una Labs-owned tools like PeacePad, SayWetin, and ATEAM.
        </p>
      </section>

      {featuredLaunch ? (
        <article className="card client-launch-card client-launch-card--featured">
          <div className="featured-launch-head">
            <div>
              <p className="status-pill">{featuredLaunch.status}</p>
              <h2>{featuredLaunch.tileTitle}</h2>
              <p className="muted">{featuredLaunch.service}</p>
            </div>
            <div className="proof-tags" aria-label={`${featuredLaunch.tileTitle} tags`}>
              {featuredLaunch.tags.map((tag) => (
                <span key={tag} className="proof-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <p className="client-launch-summary">{featuredLaunch.summary}</p>

          <div className="featured-launch-grid">
            <div className="client-launch-signal">
              <p className="client-launch-signal-title">Current focus</p>
              <ul className="client-launch-signal-list">
                {(featuredLaunch.currentFocus ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="client-launch-signal">
              <p className="client-launch-signal-title">Next milestone</p>
              <ul className="client-launch-signal-list">
                {(featuredLaunch.nextMilestone ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="client-launch-actions">
            <Link href={`/work/${featuredLaunch.slug}`} prefetch={false} className="btn btn-secondary">
              View onboarding snapshot
            </Link>
            <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
              Start a similar project
            </Link>
          </div>
        </article>
      ) : null}

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Need a launch path like this for your own business?</h2>
          <p className="muted">
            Una Labs can scope the shortest credible setup for your website, lead path, or
            AI-assisted workflow.
          </p>
        </div>
        <div className="product-actions">
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a Project
          </Link>
          <Link href="/ateam" prefetch={false} className="btn btn-secondary">
            Try ATEAM Demo
          </Link>
        </div>
      </article>
    </div>
  );
}
