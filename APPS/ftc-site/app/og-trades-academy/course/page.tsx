export const dynamic = "force-static";

import type { Metadata } from "next";
import OgTradesEnrollmentForm from "../../components/og-trades/OgTradesEnrollmentForm";
import { ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { SITE_URL } from "../../../lib/site";

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: ogTradesAcademyConfig.courseName,
  description:
    "An 8-week beginner forex program covering currency pairs, market structure, risk management, chart analysis, psychology, and practical strategy building.",
  provider: {
    "@type": "Organization",
    name: ogTradesAcademyConfig.companyName,
    sameAs: ogTradesAcademyConfig.beaconsUrl
  },
  offers: {
    "@type": "Offer",
    price: "199",
    priceCurrency: "USD",
    url: ogTradesAcademyConfig.coursePurchaseUrl,
    availability: "https://schema.org/InStock"
  }
};

export const metadata: Metadata = {
  title: "8 Week Beginner Forex Course | OG_Trades Academy",
  description:
    "Explore the OG_Trades Academy 8 Week Beginner Forex Course: structured weekly curriculum, course highlights, pricing, and enrollment details.",
  alternates: { canonical: `${SITE_URL}/og-trades-academy/course` }
};

export default function OgTradesCoursePage() {
  return (
    <div className="og-site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />

      <div className="container page-content og-page-content">
        <div className="og-course-hero">
          <section className="card og-course-hero-copy">
            <p className="eyebrow">Flagship course</p>
            <h1>{ogTradesAcademyConfig.courseName}</h1>
            <p className="page-intro">
              A premium sales page for the academy’s core offer, built to replace the thin Beacons product experience with stronger trust, richer curriculum detail, and clearer conversion paths.
            </p>

            <div className="og-course-price-callout">
              <div>
                <span>Now</span>
                <strong>{ogTradesAcademyConfig.priceNow}</strong>
              </div>
              <div>
                <span>Was</span>
                <strong>{ogTradesAcademyConfig.priceWas}</strong>
              </div>
              <div>
                <span>Format</span>
                <strong>{ogTradesAcademyConfig.courseDuration}</strong>
              </div>
            </div>

            <ul className="feature-list compact-feature-list">
              {ogTradesAcademyConfig.courseHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="hero-cta-row">
              <a href={ogTradesAcademyConfig.coursePurchaseUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                Buy now on Beacons
              </a>
              <a href="#enrollment" className="btn btn-secondary">Ask a question first</a>
              <a href="#curriculum" className="inline-link">Review the curriculum</a>
            </div>
          </section>

          <aside className="card og-course-product-card">
            <div className="og-product-image-frame og-product-image-frame--large">
              <img
                src={ogTradesAcademyConfig.courseImageUrl}
                alt="OG_Trades Academy forex trading course artwork"
                className="og-course-image"
              />
            </div>
            <p className="muted">
              This existing course artwork becomes a stronger hero asset when paired with syllabus depth, FAQs, and an enrollment form.
            </p>
          </aside>
        </div>

        <section id="curriculum" className="section og-section anchor-offset">
          <div className="section-heading">
            <p className="eyebrow">Curriculum</p>
            <h2>Eight weeks of guided progression from beginner concepts into structured execution.</h2>
          </div>
          <div className="og-curriculum-grid">
            {ogTradesAcademyConfig.curriculum.map((week) => (
              <article key={week.week} className="card og-week-card">
                <p className="card-kicker">{week.week}</p>
                <h3>{week.title}</h3>
                <p className="muted">{week.summary}</p>
                <ul className="feature-list compact-feature-list">
                  {week.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="section og-section">
          <div className="og-course-detail-grid">
            <article className="card">
              <h2>Who this is built for</h2>
              <ul className="feature-list compact-feature-list">
                <li>Complete beginners who need a clear learning path.</li>
                <li>Early traders who understand the basics but lack structure.</li>
                <li>Learners drawn to prop-firm challenges but not ready to rush execution.</li>
                <li>Students who want risk management and psychology treated as core, not optional.</li>
              </ul>
            </article>
            <article className="card">
              <h2>What the page should convert on</h2>
              <ul className="feature-list compact-feature-list">
                <li>Direct course purchase through the current Beacons checkout.</li>
                <li>High-intent enrollment inquiries for people with questions before buying.</li>
                <li>Community joins for visitors who want to warm up before purchasing.</li>
                <li>Email capture for launch reminders, future drops, and nurture campaigns.</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="enrollment" className="section og-section anchor-offset">
          <div className="og-form-layout">
            <article className="card">
              <p className="eyebrow">Enrollment interest</p>
              <h2>Capture serious leads even when they are not ready to buy on the first visit.</h2>
              <p className="muted">
                This form gives OG_Trades Academy a first-party lead path that can later be connected to email automation, follow-up workflows, and student onboarding.
              </p>
              <OgTradesEnrollmentForm />
            </article>

            <article className="card">
              <h2>FAQ</h2>
              <div className="og-faq-list">
                {ogTradesAcademyConfig.faqs.map((faq) => (
                  <article key={faq.question} className="og-faq-card og-faq-card--inline">
                    <h3>{faq.question}</h3>
                    <p className="muted">{faq.answer}</p>
                  </article>
                ))}
              </div>
              <p className="og-disclaimer">{ogTradesAcademyConfig.disclaimer}</p>
            </article>
          </div>
        </section>
      </div>

      <div className="og-mobile-enroll-bar">
        <a
          href={ogTradesAcademyConfig.coursePurchaseUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
        >
          Buy the Course for {ogTradesAcademyConfig.priceNow}
        </a>
        <a href="#enrollment" className="btn btn-secondary">
          Ask a Question
        </a>
      </div>
    </div>
  );
}
