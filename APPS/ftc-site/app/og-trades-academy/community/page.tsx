export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import { getOgTradesBrandedPath, getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "Community | OG Trades Academy",
    description:
      "Join the OG Trades Academy community to stay connected, learn with other traders, and keep growing between lessons.",
    pathname: "/community",
    host: requestHost
  });
}

export default function OgTradesCommunityPage() {
  const requestHost = getRequestHost();
  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <section>
          <p className="eyebrow">Community</p>
          <h1>Stay connected with OG Trades Academy between lessons, market updates, and new learning opportunities.</h1>
          <p className="page-intro">
            The academy community gives students and traders a place to stay engaged, ask questions, and keep learning together as they build confidence in forex.
          </p>
        </section>

        <section className="section og-section">
          <div className="cards-grid cards-grid-3">
            {ogTradesAcademyConfig.communityBenefits.map((item) => (
              <article key={item.title} className="card">
                <h2>{item.title}</h2>
                <p className="muted">{item.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="og-community-grid">
            <article className="card">
              <p className="card-kicker">Primary join path</p>
              <h2>Join the Telegram community and keep growing with the academy.</h2>
              <p className="muted">
                This is the place for students and traders to stay connected, learn together, ask questions, and keep up with academy updates and future offers.
              </p>
              <div className="hero-cta-row">
                <a href={ogTradesAcademyConfig.communityUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  Join the Telegram community
                </a>
                <a href={ogTradesAcademyConfig.beaconsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  Visit the academy hub
                </a>
              </div>
            </article>

            <article className="card">
              <p className="card-kicker">Social ecosystem</p>
              <div className="og-social-list">
                <a href={ogTradesAcademyConfig.youtubeUrl} target="_blank" rel="noreferrer">
                  <strong>YouTube</strong>
                  <span>@OG_TradesAcademy</span>
                </a>
                <a href={ogTradesAcademyConfig.tiktokUrl} target="_blank" rel="noreferrer">
                  <strong>TikTok</strong>
                  <span>@dobble__g</span>
                </a>
                <a href={ogTradesAcademyConfig.beaconsUrl} target="_blank" rel="noreferrer">
                  <strong>Beacons</strong>
                  <span>ogtradesacademy.com</span>
                </a>
              </div>
            </article>
          </div>
        </section>

        <CTABanner
          title="Want to turn community interest into structured learning?"
          description="Use the programs page for the full 8-week course and the resources page for more public lessons and support."
          primaryLabel="View Programs"
          primaryHref={getOgTradesBrandedPath("/course", { host: requestHost })}
          secondaryLabel="Open Resources"
          secondaryHref={getOgTradesBrandedPath("/resources", { host: requestHost })}
        />
      </div>
    </div>
  );
}
