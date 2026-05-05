

import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import { getOgTradesBrandedPath, getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";

export function generateMetadata(): Metadata {
  return getOgTradesMetadata({
    title: "About OG Trades Academy | Meet the Founder and Instructor",
    description:
      "Meet OG Trades, the founder and instructor behind OG Trades Academy, and learn about the academy approach to forex education.",
    pathname: "/about",
    host: undefined
  });
}

export default function OgTradesAboutPage() {
  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <div className="og-founder-grid">
          <section className="card og-founder-card">
            <p className="eyebrow">About the founder</p>
            <h1>Meet OG Trades, founder and lead instructor of OG Trades Academy.</h1>
            {ogTradesAcademyConfig.founderStory.paragraphs.map((paragraph) => (
              <p key={paragraph} className="muted">
                {paragraph}
              </p>
            ))}
          </section>

          <aside className="card og-founder-visual">
            <div className="og-avatar-frame">
              <img
                src={ogTradesAcademyConfig.profileImageUrl}
                alt="OG_Trades Academy founder profile"
                className="og-founder-avatar"
              />
            </div>
            <div className="proof-tags">
              <span className="proof-tag">Banking background</span>
              <span className="proof-tag">Forex educator</span>
              <span className="proof-tag">Founder-led academy</span>
            </div>
          </aside>
        </div>

        <section className="section og-section">
          <div className="cards-grid cards-grid-2">
            <article className="card">
              <h2>What students come here to learn</h2>
              <ul className="feature-list compact-feature-list">
                {ogTradesAcademyConfig.courseHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="card">
              <h2>What shapes the teaching style</h2>
              <ul className="feature-list compact-feature-list">
                {ogTradesAcademyConfig.founderHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Academy approach</p>
            <h2>A forex academy built around clarity, discipline, and long-term growth.</h2>
          </div>
          <div className="cards-grid cards-grid-3">
            {ogTradesAcademyConfig.contentPillars.map((pillar) => (
              <article key={pillar.title} className="card">
                <h3>{pillar.title}</h3>
                <p className="muted">{pillar.summary}</p>
                <ul className="feature-list compact-feature-list">
                  {pillar.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <CTABanner
          title="Ready to learn inside OG Trades Academy?"
          description="Move from the founder story into the academy programs, resources, and community support."
          primaryLabel="View Programs"
          primaryHref={getOgTradesBrandedPath("/course")}
          secondaryLabel="Browse Resources"
          secondaryHref={getOgTradesBrandedPath("/resources")}
        />
      </div>
    </div>
  );
}
