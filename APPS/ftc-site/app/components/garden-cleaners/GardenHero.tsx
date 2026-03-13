import Link from "next/link";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenHero() {
  return (
    <section className="garden-hero">
      <div className="garden-hero-copy">
        <p className="garden-kicker">Professional cleaning services in Oshawa</p>
        <h1>{gardenCleanersConfig.heroHeadline}</h1>
        <p className="garden-lead">{gardenCleanersConfig.heroSubheadline}</p>
        <div className="hero-actions">
          <Link href={gardenCleanersConfig.primaryCta.href} prefetch={false} className="btn btn-primary">
            {gardenCleanersConfig.primaryCta.label}
          </Link>
          <Link href={gardenCleanersConfig.secondaryCta.href} prefetch={false} className="btn btn-secondary">
            {gardenCleanersConfig.secondaryCta.label}
          </Link>
        </div>
      </div>

      <div className="garden-hero-panel card">
        <p className="garden-panel-kicker">Locally focused service</p>
        <h2>Residential and commercial cleaning built around real schedules.</h2>
        <p>
          Garden Cleaners supports homeowners, property managers, and businesses that need dependable cleaning without unnecessary friction.
        </p>
        <ul className="garden-check-list">
          {gardenCleanersConfig.trustBullets.slice(0, 4).map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
