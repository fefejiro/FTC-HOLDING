export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import { getOgTradesBrandedPath, getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "Free Forex Resources and Video Lessons | OG_Trades Academy",
    description:
      "Explore free forex resources, practical learning tools, and public video lessons from OG_Trades Academy.",
    pathname: "/resources",
    host: requestHost
  });
}

export default function OgTradesResourcesPage() {
  const requestHost = getRequestHost();

  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <section>
          <p className="eyebrow">Resources hub</p>
          <h1>Free resources and video lessons to help you keep learning forex with more clarity.</h1>
          <p className="page-intro">
            This page brings together beginner-friendly tools, practical learning materials, and public lessons from OG_Trades Academy so traders can keep building knowledge at their own pace.
          </p>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Free learning tools</p>
            <h2>Use these resources to strengthen your foundation, improve your routine, and learn with more structure.</h2>
          </div>
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
            <p className="eyebrow">How these resources help</p>
            <h2>Start with the basics, build better habits, and stay connected to the academy's teaching style.</h2>
          </div>
          <div className="cards-grid cards-grid-3">
            <article className="card">
              <h3>Build your forex foundation</h3>
              <p className="muted">
                Start with beginner-friendly resources that explain key terms, chart habits, and the core ideas new traders need to understand first.
              </p>
            </article>
            <article className="card">
              <h3>Practice with more structure</h3>
              <p className="muted">
                Use checklists, journal prompts, and guided tools to make your study and chart review more consistent over time.
              </p>
            </article>
            <article className="card">
              <h3>Learn before and after paid programs</h3>
              <p className="muted">
                These resources work well for people who are just starting, as well as students who want extra support alongside the academy's paid offers.
              </p>
            </article>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Video lessons</p>
            <h2>Watch OG_Trades teach through market breakdowns, forex education, and practical trading guidance.</h2>
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

        <CTABanner
          title="Want more support beyond the free resources?"
          description="Explore the academy programs or join the Telegram community to keep learning with more structure and connection."
          primaryLabel="View Programs"
          primaryHref={getOgTradesBrandedPath("/course", { host: requestHost })}
          secondaryLabel="Join the Community"
          secondaryHref={getOgTradesBrandedPath("/community", { host: requestHost })}
        />
      </div>
    </div>
  );
}
