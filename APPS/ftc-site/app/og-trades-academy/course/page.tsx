export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import OgTradesEnrollmentForm from "../../components/og-trades/OgTradesEnrollmentForm";
import { getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

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

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "8 Week Beginner Forex Course | OG_Trades Academy",
    description:
      "Explore the OG_Trades Academy 8 Week Beginner Forex Course: structured weekly curriculum, course highlights, pricing, and enrollment details.",
    pathname: "/course",
    host: requestHost
  });
}

export default function OgTradesCoursePage() {
  return (
    <div className="og-site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />

      <div className="container page-content og-page-content">
        <div className="og-course-hero">
          <section className="card og-course-hero-copy">
            <p className="eyebrow">Flagship program</p>
            <h1>{ogTradesAcademyConfig.courseName}</h1>
            <p className="page-intro">
              The academy's flagship beginner program helps new traders build their foundation with structure, guidance, and a risk-first approach to learning forex.
            </p>

            <div className="og-course-price-callout">
              <div>
                <span>Price</span>
                <strong>{ogTradesAcademyConfig.priceNow}</strong>
              </div>
              <div>
                <span>Format</span>
                <strong>{ogTradesAcademyConfig.courseDuration}</strong>
              </div>
              <div>
                <span>Focus</span>
                <strong>Beginner friendly</strong>
              </div>
            </div>

            <ul className="feature-list compact-feature-list">
              {ogTradesAcademyConfig.courseHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="hero-cta-row">
              <a href={ogTradesAcademyConfig.coursePurchaseUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                Enroll in the 8 Week Course
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
              Students can use this program to move from confusion to a clearer forex learning routine with lessons, practice, and consistent review.
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
                <li>Anyone looking for extra income and a more structured way to learn forex.</li>
                <li>People who are curious about trading and want a beginner-friendly entry point.</li>
                <li>Complete beginners who need a clear path instead of random lessons.</li>
                <li>Developing traders who want to grow their knowledge, discipline, and consistency.</li>
              </ul>
            </article>
            <article className="card">
              <h2>What students build during the program</h2>
              <ul className="feature-list compact-feature-list">
                <li>A stronger understanding of market structure, chart setup, and core forex concepts.</li>
                <li>Better habits around risk management, trade planning, and emotional discipline.</li>
                <li>More confidence in how to prepare, review, and improve over time.</li>
                <li>A practical foundation they can keep developing through community and future academy offers.</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="enrollment" className="section og-section anchor-offset">
          <div className="og-form-layout">
            <article className="card">
              <p className="eyebrow">Enrollment interest</p>
              <h2>Ask a question before you enroll.</h2>
              <p className="muted">
                If you want help deciding whether this is the right starting point, send a note here and the academy can follow up with more guidance.
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
          Enroll for {ogTradesAcademyConfig.priceNow}
        </a>
        <a href="#enrollment" className="btn btn-secondary">
          Ask a Question
        </a>
      </div>
    </div>
  );
}
