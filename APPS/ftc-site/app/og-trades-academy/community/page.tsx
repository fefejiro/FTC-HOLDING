export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import { getOgTradesBrandedPath, getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "Community | OG_Trades Academy",
    description:
      "Community benefits, social channels, and the join path for the OG_Trades Academy audience.",
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
          <h1>Give the audience a reason to stay connected between lessons, launches, and market breakdowns.</h1>
          <p className="page-intro">
            The community page turns a simple link-in-bio redirect into a stronger membership pathway with clearer expectations and channel hierarchy.
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
              <h2>Use the existing hub while the dedicated community stack grows.</h2>
              <p className="muted">
                The current redirect remains valuable for continuity, but this page adds enough structure that it feels like a real product surface instead of a loose outbound link.
              </p>
              <div className="hero-cta-row">
                <a href={ogTradesAcademyConfig.communityUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  Open the community hub
                </a>
                <a href={ogTradesAcademyConfig.beaconsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  Visit the Beacons page
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
          title="Want to move from community interest into structured learning?"
          description="Use the course page for curriculum depth and the resources hub for embedded lessons and supporting content."
          primaryLabel="See the Course"
          primaryHref={getOgTradesBrandedPath("/course", { host: requestHost })}
          secondaryLabel="Open Resources"
          secondaryHref={getOgTradesBrandedPath("/resources", { host: requestHost })}
        />
      </div>
    </div>
  );
}
