export const runtime = "edge";
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
    title: "OG_Trades Academy | Founder-Led Forex Education, Mentorship, and Community",
    description:
      "Discover OG_Trades Academy, a founder-led forex education and trader support platform offering beginner training, crash courses, signals, mentorship, and Telegram community access.",
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
  const resourcesHref = getOgTradesBrandedPath("/resources", { host: requestHost });
  const telegramInviteHref = "https://t.me/TELEGRAM_LINK_TBD";
  const pricingPaths = [
    {
      title: "Crash Course",
      subtitle: "Fast-track forex essentials in a shorter format.",
      price: "[PRICE_TBD]",
      fit: "For beginners who want a quick and focused launch path."
    },
    {
      title: "8-Week Course",
      subtitle: "The full step-by-step beginner curriculum.",
      price: "$199",
      fit: "For serious learners who want structure, progression, and accountability."
    },
    {
      title: "Signals Access",
      subtitle: "Stay connected to setup ideas and market focus.",
      price: "[PRICE_TBD]",
      fit: "For developing traders building confidence in live market context."
    },
    {
      title: "Full Academy Access",
      subtitle: "Courses, signals, community, and mentorship-style support.",
      price: "[PRICE_TBD]",
      fit: "For traders who want the complete OG Trades Academy experience."
    }
  ] as const;
  const authorityPoints = [
    "Founder-led teaching style with practical forex walkthroughs",
    "Risk-first learning system built around discipline and consistency",
    "Structured tracks designed for beginners and developing traders",
    "Active learning ecosystem: courses, public lessons, signals, and community"
  ] as const;
  const testimonialPlaceholders = [
    "[TESTIMONIAL_1_TBD]",
    "[TESTIMONIAL_2_TBD]",
    "[TESTIMONIAL_3_TBD]"
  ] as const;
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
  const founderSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: ogTradesAcademyConfig.founderName,
    jobTitle: "Founder and Forex Instructor",
    worksFor: {
      "@type": "Organization",
      name: ogTradesAcademyConfig.companyName
    },
    sameAs: [
      ogTradesAcademyConfig.youtubeUrl,
      ogTradesAcademyConfig.instagramUrl,
      ogTradesAcademyConfig.tiktokUrl
    ]
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(founderSchema) }} />
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
                  Watch public lessons on YouTube
                </a>
              </div>

              <div className="og-founder-placeholder-grid" aria-label="Founder content placeholders">
                <p>
                  <strong>[FOUNDER_NAME_TBD]</strong>
                </p>
                <p>
                  <strong>[FOUNDER_YEARS_EXPERIENCE_TBD]</strong>
                </p>
                <p>
                  <strong>[FOUNDER_PERSONAL_STORY_TBD]</strong>
                </p>
                <p>
                  <strong>[WHY_HE_STARTED_TBD]</strong>
                </p>
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
                <p className="card-kicker">Who the academy helps</p>
                <div className="proof-tags">
                  <span className="proof-tag">Beginners</span>
                  <span className="proof-tag">Curious traders</span>
                  <span className="proof-tag">Growth-minded learners</span>
                </div>
                <p className="muted">
                  Students come to OG_Trades Academy for clear instruction, founder-led guidance, and a learning environment that makes forex feel more approachable, credible, and professional.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Academy overview</p>
            <h2>More than a single course, the academy is built as a full forex learning and trader support ecosystem.</h2>
            <p>
              OG_Trades Academy brings together education, mentorship-style guidance, community support, and practical market learning so traders can keep growing with more structure at every stage.
            </p>
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

        <section id="services" className="section og-section anchor-offset">
          <div className="section-heading">
            <p className="eyebrow">Services</p>
            <h2>Choose the training, support, and learning path that fits where you are right now.</h2>
            <p>
              The academy is designed to serve new and developing traders through structured offers, shorter learning experiences, mentorship-style support, and ongoing community connection.
            </p>
          </div>

          <div className="cards-grid cards-grid-3 og-services-grid">
            {ogTradesAcademyConfig.services.map((service) => (
              <article key={service.title} className="card og-service-card">
                <div className="og-service-header">
                  <h3>{service.title}</h3>
                  <span className="og-service-price">{service.price}</span>
                </div>
                <p className="muted">{service.summary}</p>
                <p className="og-service-audience">
                  <strong>What it is for:</strong> {service.audience}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Choose your path</p>
            <h2>Premium tracks designed for where you are now and where you want to go next.</h2>
            <p>
              Final pricing and offer stacks are being finalized. The structure below reflects the four core academy paths.
            </p>
          </div>

          <div className="og-pricing-grid">
            {pricingPaths.map((path) => (
              <article key={path.title} className="card og-pricing-card">
                <p className="card-kicker">OG Trades Academy</p>
                <h3>{path.title}</h3>
                <p className="og-pricing-subtitle">{path.subtitle}</p>
                <p className="og-pricing-price">{path.price}</p>
                <p className="muted">{path.fit}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Why OG Trades Academy</p>
            <h2>Built for trust, clarity, and repeatable trader development.</h2>
          </div>

          <div className="og-authority-grid">
            {authorityPoints.map((point) => (
              <article key={point} className="card og-authority-card">
                <p>{point}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Learning in action</p>
            <h2>See how the founder teaches through public lessons, market breakdowns, and forex education content.</h2>
            <p>
              The academy is supported by real teaching across YouTube and public content, giving new traders a way to learn the style, mindset, and discipline behind the programs.
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
            <p className="eyebrow">Student proof</p>
            <h2>Testimonials are being prepared for this page refresh.</h2>
            <p>Placeholders are intentionally shown below until approved client quotes are provided.</p>
          </div>

          <div className="og-testimonial-grid">
            {testimonialPlaceholders.map((item) => (
              <article key={item} className="card og-testimonial-card">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">Community and support</p>
            <h2>Keep learning with other students and traders inside the academy community.</h2>
            <p>
              Alongside the courses and lessons, the academy gives people a place to stay connected, ask questions, and keep building confidence over time.
            </p>
          </div>

          <div className="cards-grid cards-grid-3">
            {ogTradesAcademyConfig.communityBenefits.map((item) => (
              <article key={item.title} className="card">
                <h3>{item.title}</h3>
                <p className="muted">{item.summary}</p>
              </article>
            ))}
          </div>
          <div className="hero-cta-row og-section-actions">
            <Link href={communityHref} prefetch={false} className="btn btn-primary">
              Explore community access
            </Link>
            <a href={telegramInviteHref} target="_blank" rel="noreferrer" className="btn btn-secondary">
              Join Telegram [LINK_TBD]
            </a>
            <Link href={resourcesHref} prefetch={false} className="btn btn-secondary">
              Browse free resources
            </Link>
          </div>
        </section>

        <section className="section og-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions about learning with OG_Trades Academy.</h2>
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

        <section className="section og-section">
          <article className="card og-risk-panel">
            <p className="eyebrow">Risk disclosure</p>
            <h2>Trading involves risk.</h2>
            <p>
              OG Trades Academy focuses on education, discipline, risk management, and market understanding. We do not guarantee profits.
            </p>
          </article>
        </section>

        <CTABanner
          title="Choose the OG_Trades Academy path that fits your next step."
          description="Explore the academy programs, mentorship-style support, and community access built to help traders keep growing."
          primaryLabel="View Programs"
          primaryHref={courseHref}
          secondaryLabel="Join the Community"
          secondaryHref={communityHref}
        />
      </div>
    </div>
  );
}
