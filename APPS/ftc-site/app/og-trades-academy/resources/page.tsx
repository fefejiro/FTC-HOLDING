export const dynamic = "force-static";

import type { Metadata } from "next";
import { ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { SITE_URL } from "../../../lib/site";

export const metadata: Metadata = {
  title: "Trading Resources and Video Library | OG_Trades Academy",
  description:
    "Free resources, SEO-ready content ideas, and the full embedded OG_Trades Academy YouTube video library.",
  alternates: { canonical: `${SITE_URL}/og-trades-academy/resources` }
};

export default function OgTradesResourcesPage() {
  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <section>
          <p className="eyebrow">Resources hub</p>
          <h1>Turn public trading content into a searchable education engine.</h1>
          <p className="page-intro">
            This page gives OG_Trades Academy a proper content spine: downloadable resource concepts, SEO article clusters, and the full embedded video library.
          </p>
        </section>

        <section className="section og-section">
          <div className="cards-grid cards-grid-2">
            {ogTradesAcademyConfig.resources.map((resource) => (
              <article key={resource.title} className="card">
                <p className="card-kicker">{resource.format}</p>
                <h2>{resource.title}</h2>
                <p className="muted">{resource.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Content cluster</p>
            <h2>Existing videos already map cleanly into blog articles and lead magnets.</h2>
          </div>
          <div className="cards-grid cards-grid-3">
            <article className="card">
              <h3>LASER strategy article</h3>
              <p className="muted">Expand the beginner strategy video into a long-form breakdown with charts, FAQs, and internal links to the course page.</p>
            </article>
            <article className="card">
              <h3>Risk management from banking</h3>
              <p className="muted">Use the banking background story to create a memorable authority article around discipline, capital protection, and trader behavior.</p>
            </article>
            <article className="card">
              <h3>FundingPips progression case study</h3>
              <p className="muted">Package the leaderboard and $100K account content into a narrative proof page that supports both trust and discovery traffic.</p>
            </article>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Full video library</p>
            <h2>All current YouTube videos, embedded directly into the site.</h2>
          </div>
          <div className="cards-grid cards-grid-2 og-video-library-grid">
            {ogTradesAcademyConfig.videos.map((video) => (
              <article key={video.href} className="card og-video-card">
                <div className="og-video-frame">
                  <iframe
                    src={video.embedUrl}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="og-video-copy">
                  <div className="og-video-meta-row">
                    <p className="card-kicker">{video.duration}</p>
                    <a href={video.href} target="_blank" rel="noreferrer" className="inline-link">
                      Open on YouTube
                    </a>
                  </div>
                  <h3>{video.title}</h3>
                  <p className="muted">{video.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

