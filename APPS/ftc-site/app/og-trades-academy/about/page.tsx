export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import { getOgTradesBrandedPath, getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "About OG_Trades Academy | Risk-First Forex Education",
    description:
      "Meet the founder, trading focus, and educational philosophy behind OG_Trades Academy.",
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
            <p className="eyebrow">About the brand</p>
            <h1>OG_Trades Academy is built around discipline, structure, and practical market education.</h1>
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
              <span className="proof-tag">FundingPips trader</span>
              <span className="proof-tag">YouTube educator</span>
            </div>
          </aside>
        </div>

        <section className="section og-section">
          <div className="cards-grid cards-grid-2">
            <article className="card">
              <h2>What the audience learns</h2>
              <ul className="feature-list compact-feature-list">
                {ogTradesAcademyConfig.courseHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="card">
              <h2>What makes the teaching style credible</h2>
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
            <p className="eyebrow">Public proof points</p>
            <h2>Existing content already supports a stronger premium positioning.</h2>
          </div>
          <div className="cards-grid cards-grid-3">
            <article className="card">
              <h3>Prop-firm accountability</h3>
              <p className="muted">
                Videos around $100K FundingPips challenges and drawdown management reinforce seriousness and active market context.
              </p>
            </article>
            <article className="card">
              <h3>Strategy depth</h3>
              <p className="muted">
                The LASER strategy breakdown and USDJPY trade analysis show enough specificity to become high-value education content.
              </p>
            </article>
            <article className="card">
              <h3>Mindset positioning</h3>
              <p className="muted">
                Risk management lessons tied to banking experience give the brand a disciplined voice instead of a hype-first posture.
              </p>
            </article>
          </div>
        </section>

        <CTABanner
          title="Want the full OG_Trades learning experience?"
          description="Move from the founder story into the course syllabus, resources stack, and community pathway."
          primaryLabel="See the Course"
          primaryHref={getOgTradesBrandedPath("/course", { host: requestHost })}
          secondaryLabel="Browse Resources"
          secondaryHref={getOgTradesBrandedPath("/resources", { host: requestHost })}
        />
      </div>
    </div>
  );
}
