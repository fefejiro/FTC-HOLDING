export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../components/CTABanner";
import OgTradesHero from "../components/og-trades/OgTradesHero";
import {
  getOgTradesAbsoluteUrl,
  getOgTradesBrandedPath,
  getOgTradesMetadata,
  ogTradesAcademyConfig
} from "../../lib/ogTradesAcademy";
import { getRequestHost } from "../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "OG_Trades Academy | Beginner Forex Education and Trading Community",
    description:
      "A premium forex education hub for beginner traders: 8-week beginner course, risk-first training, YouTube lessons, and community access.",
    pathname: "/",
    host: requestHost
  });
}

export default function OgTradesAcademyHomePage() {
  const requestHost = getRequestHost();
  const canonicalUrl = getOgTradesAbsoluteUrl("/", { host: requestHost });
  const aboutHref = getOgTradesBrandedPath("/about", { host: requestHost });
  const courseHref = getOgTradesBrandedPath("/course", { host: requestHost });
  const communityHref = getOgTradesBrandedPath("/community", { host: requestHost });
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ogTradesAcademyConfig.companyName,
    url: canonicalUrl,
    sameAs: [
      ogTradesAcademyConfig.beaconsUrl,
      ogTradesAcademyConfig.youtubeUrl,
      ogTradesAcademyConfig.tiktokUrl,
      ogTradesAcademyConfig.instagramUrl
    ],
    logo: ogTradesAcademyConfig.profileImageUrl
  };
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: ogTradesAcademyConfig.courseName,
    description:
      "An 8-week beginner forex course covering market structure, risk management, chart analysis, entry and exit planning, and trading mindset.",
    provider: {
      "@type": "Organization",
      name: ogTradesAcademyConfig.companyName,
      sameAs: ogTradesAcademyConfig.beaconsUrl
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      instructor: {
        "@type": "Person",
        name: ogTradesAcademyConfig.founderName
      }
    },
    offers: {
      "@type": "Offer",
      category: "Forex trading education",
      price: "199",
      priceCurrency: "USD",
      url: ogTradesAcademyConfig.coursePurchaseUrl,
      availability: "https://schema.org/InStock"
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: "1"
    }
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ogTradesAcademyConfig.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
  const featuredVideos = ogTradesAcademyConfig.videos.slice(0, 3);

  return (
    <div className="og-site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="container page-content og-page-content">
        <OgTradesHero />

        <section className="section og-section">
          <div className="og-trust-strip">
            {ogTradesAcademyConfig.trustStatements.map((item) => (
              <div key={item} className="og-trust-item">
                <span />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="og-founder-grid">
            <article className="card og-founder-card">
              <p className="eyebrow">Founder and instructor</p>
              <h2>{ogTradesAcademyConfig.founderStory.headline}</h2>
              {ogTradesAcademyConfig.founderStory.paragraphs.map((paragraph) => (
                <p key={paragraph} className="muted">
                  {paragraph}
                </p>
              ))}
              <ul className="feature-list compact-feature-list">
                {ogTradesAcademyConfig.founderHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="hero-cta-row">
                <Link href={aboutHref} prefetch={false} className="btn btn-secondary">
                  Read the founder story
                </Link>
                <a href={ogTradesAcademyConfig.youtubeUrl} target="_blank" rel="noreferrer" className="inline-link">
                  Watch the YouTube channel
                </a>
              </div>
            </article>

            <article className="card og-founder-visual">
              <div className="og-avatar-frame">
                <img
                  src={ogTradesAcademyConfig.profileImageUrl}
                  alt="OG_Trades Academy founder profile"
                  className="og-founder-avatar"
                />
              </div>
              <div className="og-social-proof">
                <p className="card-kicker">Linked ecosystem</p>
                <div className="proof-tags">
                  <span className="proof-tag">@OG_TradesAcademy</span>
                  <span className="proof-tag">@dobble__g</span>
                  <span className="proof-tag">FundingPips focus</span>
                </div>
                <p className="muted">
                  The new site is structured to turn the current YouTube, Beacons, and community presence into one premium learning hub.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Flagship offer</p>
            <h2>The 8-week beginner program becomes the center of the brand.</h2>
            <p>
              Instead of sending people straight to a link-in-bio shop, the course gets a dedicated sales experience with clearer positioning, curriculum depth, and stronger trust signals.
            </p>
          </div>

          <div className="og-course-overview-grid">
            <article className="card og-course-product-card">
              <div className="og-product-image-frame">
                <img
                  src={ogTradesAcademyConfig.courseImageUrl}
                  alt="OG_Trades Academy forex trading course artwork"
                  className="og-course-image"
                />
              </div>
              <div className="og-price-row">
                <div>
                  <p className="card-kicker">{ogTradesAcademyConfig.courseName}</p>
                  <h3>{ogTradesAcademyConfig.priceNow}</h3>
                </div>
                <div className="og-price-meta">
                  <span>{ogTradesAcademyConfig.priceWas}</span>
                  <p>{ogTradesAcademyConfig.priceNote}</p>
                </div>
              </div>
            </article>

            <article className="card og-course-copy-card">
              <h3>What students can expect</h3>
              <ul className="feature-list compact-feature-list">
                {ogTradesAcademyConfig.courseHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="hero-cta-row">
                <Link href={courseHref} prefetch={false} className="btn btn-primary">
                  See the full syllabus
                </Link>
                <a href={ogTradesAcademyConfig.coursePurchaseUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  Open the current checkout
                </a>
              </div>
            </article>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Featured video lessons</p>
            <h2>Use the existing YouTube catalog as live proof, not just outbound social content.</h2>
            <p>
              The strongest videos already cover the exact topics the site should rank for: prop-firm progression, risk management, USDJPY breakdowns, and beginner strategy education.
            </p>
          </div>

          <div className="cards-grid cards-grid-3 og-video-grid">
            {featuredVideos.map((video) => (
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
                  <p className="card-kicker">{video.duration}</p>
                  <h3>{video.title}</h3>
                  <p className="muted">{video.summary}</p>
                  <a href={video.href} target="_blank" rel="noreferrer" className="inline-link">
                    Watch on YouTube
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">SEO and content engine</p>
            <h2>Every public lesson can become a search-ready article, guide, or lead magnet.</h2>
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
          <p className="page-intro">
            Planned blog cluster ideas include LASER strategy breakdowns, USDJPY analysis, risk management lessons from banking, and FundingPips progression case studies.
          </p>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions before enrollment.</h2>
          </div>
          <div className="og-faq-list">
            {ogTradesAcademyConfig.faqs.map((faq) => (
              <article key={faq.question} className="card og-faq-card">
                <h3>{faq.question}</h3>
                <p className="muted">{faq.answer}</p>
              </article>
            ))}
          </div>
          <p className="og-disclaimer">{ogTradesAcademyConfig.disclaimer}</p>
        </section>

        <CTABanner
          title="Ready to turn OG_Trades Academy into a premium learning hub?"
          description="Explore the full course page, view the trading resources stack, or jump straight into the community pathway."
          primaryLabel="View the Course Page"
          primaryHref={courseHref}
          secondaryLabel="Join the Community"
          secondaryHref={communityHref}
        />
      </div>
    </div>
  );
}
