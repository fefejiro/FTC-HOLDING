import Link from "next/link";
import { clientLaunches } from "../../lib/recentWork";

export default function WorkPageClient() {
  return (
    <div className="container page-content client-launches-page">
      <h1>Client Launches</h1>
      <p className="page-intro">
        Recently onboarded clients and delivery snapshots. Live projects are labeled
        clearly so you can see what is in progress.
      </p>

      <div className="cards-grid cards-grid-3">
        {clientLaunches.map((launch) => (
          <article key={launch.slug} className="card client-launch-card">
            <span className="status-pill">{launch.status}</span>
            <p className="card-kicker">{launch.service}</p>
            <h2>{launch.tileTitle}</h2>
            <p className="muted">{launch.subtitle}</p>
            <p>{launch.summary}</p>
            {launch.tags.length ? (
              <div className="proof-tags" aria-label={`${launch.tileTitle} tags`}>
                {launch.tags.map((tag) => (
                  <span key={tag} className="proof-tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="client-launch-actions">
              <Link href={`/work/${launch.slug}`} prefetch={false} className="inline-link">
                View onboarding snapshot
              </Link>
            </div>
          </article>
        ))}
      </div>

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Need a launch like this?</h2>
          <p className="muted">
            Una Labs can scope a fast delivery path with clear milestones and measurable
            outcomes.
          </p>
        </div>
        <div className="product-actions">
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a Project
          </Link>
          <Link href="/ateam" prefetch={false} className="btn btn-secondary">
            Try ATEAM demo
          </Link>
        </div>
      </article>
    </div>
  );
}
