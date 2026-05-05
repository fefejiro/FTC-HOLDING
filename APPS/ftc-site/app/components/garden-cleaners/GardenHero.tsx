import Link from "next/link";
import GardenImagePanel from "./GardenImagePanel";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenHero() {
  return (
    <section className="garden-hero">
      <div className="garden-hero-copy card">
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
        <div className="garden-hero-contact-bar">
          <a href={gardenCleanersConfig.phoneHref} className="garden-contact-chip">
            <span className="garden-contact-chip-icon" aria-hidden="true">📞</span>
            {gardenCleanersConfig.phoneDisplay}
          </a>
          <a href={gardenCleanersConfig.emailHref} className="garden-contact-chip">
            <span className="garden-contact-chip-icon" aria-hidden="true">✉️</span>
            {gardenCleanersConfig.email}
          </a>
          <Link href="/garden-cleaners/portal" prefetch={false} className="garden-contact-chip garden-contact-chip--portal">
            Sign In / Portal
          </Link>
        </div>
        <div className="garden-mini-proof-row">
          {gardenCleanersConfig.heroHighlights.map((item) => (
            <span key={item} className="garden-mini-proof-pill">{item}</span>
          ))}
        </div>
      </div>

      <div className="garden-hero-panel-stack">
        <GardenImagePanel asset={gardenCleanersConfig.media.hero} priority className="garden-hero-media" />
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
      </div>
    </section>
  );
}
