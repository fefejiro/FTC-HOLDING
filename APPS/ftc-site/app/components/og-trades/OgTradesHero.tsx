import Link from "next/link";
import { ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";

export default function OgTradesHero() {
  const primaryIsExternal = ogTradesAcademyConfig.primaryCta.href.startsWith("http");

  return (
    <section className="hero og-hero">
      <div className="hero-noise" />
      <div className="hero-grid premium-hero-grid og-hero-grid">
        <div className="premium-hero-copy og-hero-copy">
          <p className="eyebrow">{ogTradesAcademyConfig.hero.eyebrow}</p>
          <span className="hero-urgency-pill">
            <span>1</span>
            {`${ogTradesAcademyConfig.courseName} | ${ogTradesAcademyConfig.priceNow}`}
          </span>
          <h1 className="hero-primary-title og-hero-title">{ogTradesAcademyConfig.hero.headline}</h1>
          <p className="hero-subtitle">{ogTradesAcademyConfig.hero.subheadline}</p>

          <ul className="hero-credibility-bullets">
            {ogTradesAcademyConfig.hero.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="hero-cta-row">
            {primaryIsExternal ? (
              <a
                href={ogTradesAcademyConfig.primaryCta.href}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                {ogTradesAcademyConfig.primaryCta.label}
              </a>
            ) : (
              <Link href={ogTradesAcademyConfig.primaryCta.href} prefetch={false} className="btn btn-primary">
                {ogTradesAcademyConfig.primaryCta.label}
              </Link>
            )}
            <Link href={ogTradesAcademyConfig.secondaryCta.href} prefetch={false} className="btn btn-secondary">
              {ogTradesAcademyConfig.secondaryCta.label}
            </Link>
            <Link href="/og-trades-academy/course#curriculum" prefetch={false} className="inline-link">
              Explore the curriculum
            </Link>
          </div>
        </div>

        <div className="og-hero-visual card">
          <div className="og-chart-card">
            <div className="og-chart-head">
              <div>
                <p className="card-kicker">Trading flow preview</p>
                <h2>Build a repeatable process before you chase setups.</h2>
              </div>
              <span className="status-pill">Risk-first</span>
            </div>

            <div className="og-chart-shell" aria-hidden="true">
              <div className="og-chart-grid" />
              <div className="og-chart-line og-chart-line--one" />
              <div className="og-chart-line og-chart-line--two" />
              <div className="og-chart-candles">
                {Array.from({ length: 10 }).map((_, index) => (
                  <span
                    key={index}
                    className={`og-chart-candle ${index % 3 === 0 ? "loss" : "gain"}`}
                  />
                ))}
              </div>
            </div>

            <div className="og-proof-grid">
              {ogTradesAcademyConfig.stats.map((item) => (
                <article key={item.label} className="og-proof-card">
                  <p className="og-proof-label">{item.label}</p>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
