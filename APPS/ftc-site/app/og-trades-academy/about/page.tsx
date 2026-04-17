export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import { getOgTradesBrandedPath, getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "About OG_Trades Academy | Meet the Founder and Instructor",
    description:
      "Meet OG_Trades, the founder and instructor behind OG_Trades Academy, and learn about the academy's approach to forex education.",
    pathname: "/about",
    host: requestHost
  });
}

export default function OgTradesAboutPage() {
  const requestHost = getRequestHost();
  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <div className="og-founder-grid">
          <section className="card og-founder-card">
            <p className="eyebrow">About the founder</p>
            <h1>Meet OG_Trades, founder and lead instructor of OG_Trades Academy.</h1>
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
          title="Ready to learn inside OG_Trades Academy?"
          description="Move from the founder story into the academy programs, resources, and community support."
          primaryLabel="View Programs"
          primaryHref={getOgTradesBrandedPath("/course", { host: requestHost })}
          secondaryLabel="Browse Resources"
          secondaryHref={getOgTradesBrandedPath("/resources", { host: requestHost })}
        />
      </div>
    </div>
  );
}
