import Link from "next/link";
import GardenImagePanel from "./GardenImagePanel";
import { gardenCleanersConfig, getGardenCleanersPortalUrl } from "../../../lib/gardenCleaners";

export default function GardenHero() {
  return (
    <section className="garden-hero">
      <div className="garden-hero-copy card">
        <p className="garden-kicker">Premium cleaning services in Oshawa and Durham Region</p>
        <h1>Professional cleaning that feels dependable before the first visit.</h1>
        <p className="garden-lead">
          Garden Cleaners combines service-business hospitality with operational consistency, so homes and workspaces stay ready, polished, and easy to manage.
        </p>

        <div className="garden-hero-trust-cues" aria-label="Trust cues">
          <span>Insured professional team</span>
          <span>Flexible residential and commercial scheduling</span>
          <span>Regional portal for updates and support</span>
        </div>

        <div className="hero-actions">
          <Link href={gardenCleanersConfig.primaryCta.href} prefetch={false} className="btn btn-primary">
            Get a Premium Quote
          </Link>
          <Link href={getGardenCleanersPortalUrl()} prefetch={false} className="btn btn-secondary">
            Open Client Portal
          </Link>
          <Link href={gardenCleanersConfig.secondaryCta.href} prefetch={false} className="btn btn-secondary">
            Explore Services
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
          <Link href={getGardenCleanersPortalUrl()} prefetch={false} className="garden-contact-chip garden-contact-chip--portal">
            Sign In / Portal
          </Link>
        </div>

        <div className="garden-hero-visual-states" aria-label="Service visual states">
          <article className="garden-hero-state-card">
            <strong>Residential reset</strong>
            <p>Detailed room refresh before guests, events, or a calmer week.</p>
          </article>
          <article className="garden-hero-state-card">
            <strong>Office presentation</strong>
            <p>Reliable upkeep for client-facing spaces and team environments.</p>
          </article>
          <article className="garden-hero-state-card">
            <strong>Turnover readiness</strong>
            <p>Move-in, move-out, and handoff cleaning with tighter timelines.</p>
          </article>
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
          <p className="garden-panel-kicker">One ecosystem: website + portal</p>
          <h2>Book, track, and coordinate cleaning from one trusted system.</h2>
          <p>
            Public pages handle booking and service clarity. The portal keeps signed-in clients informed with role-based lanes for customers, staff, and admin operations.
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
