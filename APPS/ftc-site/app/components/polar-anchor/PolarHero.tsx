import Link from "next/link";
import PolarImagePanel from "./PolarImagePanel";
import { polarAnchorConfig } from "../../../lib/polarAnchor";

export default function PolarHero() {
  return (
    <section className="polar-hero">
      <div className="polar-hero-copy card">
        <p className="polar-kicker">Freight forwarding and logistics services in Canada</p>
        <h1>{polarAnchorConfig.heroHeadline}</h1>
        <p className="polar-lead">{polarAnchorConfig.heroSubheadline}</p>
        <div className="hero-actions">
          <Link href={polarAnchorConfig.primaryCta.href} prefetch={false} className="btn btn-primary">
            {polarAnchorConfig.primaryCta.label}
          </Link>
          <Link href={polarAnchorConfig.secondaryCta.href} prefetch={false} className="btn btn-secondary">
            {polarAnchorConfig.secondaryCta.label}
          </Link>
        </div>
        <div className="polar-mini-proof-row">
          {polarAnchorConfig.heroHighlights.map((item) => (
            <span key={item} className="polar-mini-proof-pill">{item}</span>
          ))}
        </div>
      </div>

      <div className="polar-hero-panel-stack">
        <PolarImagePanel asset={polarAnchorConfig.media.hero} priority className="polar-hero-media" />
        <div className="polar-hero-panel card">
          <p className="polar-panel-kicker">Just in time connections</p>
          <h2>Built for businesses that need cargo movement handled clearly and professionally.</h2>
          <p>
            Polar Anchor combines freight forwarding, transportation, warehousing, customs support, and import-export coordination into one modern service experience.
          </p>
          <ul className="polar-check-list">
            {polarAnchorConfig.trustBullets.slice(0, 4).map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
