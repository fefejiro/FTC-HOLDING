export const dynamic = 'force-static';
import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../components/CTABanner";
import GardenDeepCleaningFeature from "../components/garden-cleaners/GardenDeepCleaningFeature";
import GardenFaqList from "../components/garden-cleaners/GardenFaqList";
import GardenHero from "../components/garden-cleaners/GardenHero";
import GardenServiceCard from "../components/garden-cleaners/GardenServiceCard";
import GardenServiceShowcase from "../components/garden-cleaners/GardenServiceShowcase";
import GardenTestimonials from "../components/garden-cleaners/GardenTestimonials";
import GardenTrustStrip from "../components/garden-cleaners/GardenTrustStrip";
import type { GardenContentSection } from "../../lib/gardenContracts";
import { gardenCleanersConfig, gardenCleanersSeoAreas, gardenServices, getGardenCleanersMetadata, getGardenCleanersPortalUrl } from "../../lib/gardenCleaners";

const workflowSection: GardenContentSection = {
  id: "garden-home-workflow",
  kind: "workflow",
  eyebrow: "How it works",
  title: "A simple three-step path from request to premium-ready handoff.",
  description:
    "The process is designed to stay fast, clear, and low-friction for homeowners, offices, and property managers.",
  cards: [
    {
      title: "1. Share the property details",
      body: "Submit the quote form with your location, service type, timing, and any access or turnover notes that matter."
    },
    {
      title: "2. Get the right service plan",
      body: "Garden Cleaners reviews the scope and recommends the right cleaning lane, frequency, and next scheduling step."
    },
    {
      title: "3. Confirm the visit window",
      body: "Once the scope is clear, the team confirms the service window and prepares for a polished, ready-for-use finish."
    }
  ]
};

const estimateFrameworkSection: GardenContentSection = {
  id: "garden-home-estimate-framework",
  kind: "estimate_framework",
  eyebrow: "Estimate framework",
  title: "Clear quote anchors before you book.",
  description:
    "Quotes are shaped by the real drivers of the work so clients know what affects scope before the first visit is scheduled.",
  cards: [
    {
      title: "Recurring home cleaning",
      body: "Anchored by property size, room count, current condition, and whether the schedule is weekly, bi-weekly, or custom.",
      bullets: ["Best for maintenance rhythm", "Lower friction after first reset", "Built around consistent timing"]
    },
    {
      title: "Deep cleaning and move-related work",
      body: "Anchored by level of reset, appliance and cabinet detail, vacancy state, and any date-sensitive handoff requirements.",
      bullets: ["Ideal for first visits", "Good fit for listings and turnover", "Useful when standard cleaning is not enough"]
    },
    {
      title: "Office and managed spaces",
      body: "Anchored by square footage, shared zones, washrooms, touch points, service timing, and client-facing presentation needs.",
      bullets: ["After-hours options possible", "Works for recurring support", "Useful for multi-room commercial spaces"]
    }
  ]
};

const coverageSection: GardenContentSection = {
  id: "garden-home-coverage",
  kind: "coverage",
  eyebrow: "Regional coverage",
  title: "Built for Oshawa first, with practical Durham Region coverage.",
  description:
    "Regional routing keeps response times realistic and helps Garden Cleaners match each request to the right scheduling lane.",
  cards: gardenCleanersConfig.serviceAreas.map((area) => ({
    title: area,
    body:
      area === "Oshawa"
        ? "Primary daily operating zone for residential, office, and higher-frequency repeat service requests."
        : `${area} requests are handled through regional routing with scope reviewed against timing, property type, and crew availability.`,
    ctaLabel: area === "Oshawa" ? "Start an Oshawa quote" : `Route ${area} request`,
    ctaHref: `/garden-cleaners/quote${area === "Oshawa" ? "" : `?region=${encodeURIComponent(area)}`}`
  }))
};

const serviceStandardsSection: GardenContentSection = {
  id: "garden-home-service-standards",
  kind: "service_standards",
  eyebrow: "Service standards",
  title: "Operational standards that keep the service polished and dependable.",
  description:
    "The premium layer is not only the clean itself. It is the consistency of scope review, arrival planning, and finish expectations across residential and commercial work.",
  cards: [
    {
      title: "Clear pre-visit scope",
      body: "Every request is reviewed against property type, timing, and service depth before the team confirms the next step.",
      bullets: ["Useful for first-time clients", "Helps prevent scope drift", "Keeps quote expectations tighter"]
    },
    {
      title: "Reliable service windows",
      body: "Scheduling is routed around region, workload, and handoff requirements so service timing stays realistic instead of over-promised.",
      bullets: ["Better fit for office timing", "Supports turnover deadlines", "Designed for repeat scheduling"]
    },
    {
      title: "Presentation-focused finish",
      body: "The work is aimed at the details clients notice first: shared surfaces, washrooms, reset zones, and the overall ready-for-use feel of the space.",
      bullets: ["Built for homes and offices", "Strong fit for move-related cleaning", "Supports client-facing spaces"]
    }
  ]
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "HouseCleaning",
  "name": "Garden Cleaners",
  "description": "Professional residential and commercial cleaning services in Oshawa, Ontario. Deep cleaning, move-in/move-out, recurring cleaning, and office cleaning across Durham Region.",
  "url": "https://gardencleaners.ca/",
  "email": "contact@gardencleaners.ca",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Oshawa",
    "addressRegion": "Ontario",
    "addressCountry": "CA"
  },
  "areaServed": gardenCleanersSeoAreas.map((area) => ({ "@type": "City", "name": area })),
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "08:00", "closes": "18:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "15:00" }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Cleaning Services",
    "itemListElement": gardenServices.map((s) => ({
      "@type": "Offer",
      "itemOffered": { "@type": "Service", "name": s.title, "description": s.summary }
    }))
  }
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": gardenCleanersConfig.faqs.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
  }))
};

export const metadata: Metadata = getGardenCleanersMetadata({
  title: "Garden Cleaners | Professional Cleaning Services in Oshawa, Ontario",
  description:
    "Garden Cleaners provides reliable residential and commercial cleaning services in Oshawa, Ontario. Get a free quote for professional, spotless cleaning.",
  pathname: "/"
});

export default function GardenCleanersHomePage() {
  return (
    <div className="garden-site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      <div className="container page-content garden-page-content">
        <GardenHero />
        <GardenTrustStrip />
        <GardenDeepCleaningFeature />

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">{workflowSection.eyebrow}</p>
            <h2>{workflowSection.title}</h2>
            <p>{workflowSection.description}</p>
          </div>
          <div className="cards-grid cards-grid-3">
            {workflowSection.cards.map((card) => (
              <article key={card.title} className="card garden-proof-card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Services overview</p>
            <h2>Professional cleaning support for homes, offices, and property turnover.</h2>
            <p>
              Garden Cleaners supports residential clients, commercial spaces, move-related cleaning, and detailed reset work across Oshawa and surrounding areas.
            </p>
            <p>
              <Link
                href={getGardenCleanersPortalUrl()}
                prefetch={false}
                className="inline-link"
                data-analytics-event="garden_portal_entry_click"
                data-analytics-location="home_services_overview"
                data-analytics-label="open_regional_portal"
              >
                Open client portal access
              </Link>
              {" · "}
              <Link href="/garden-cleaners/toronto" prefetch={false} className="inline-link">
                See Toronto and GTA cleaning service coverage
              </Link>
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {gardenServices.slice(0, 6).map((service) => (
              <GardenServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </section>

        <section className="section garden-section garden-portal-benefits-section">
          <div className="section-heading">
            <p className="eyebrow">Client portal benefits</p>
            <h2>After booking, clients stay informed through a role-based portal.</h2>
            <p>
              The portal is part of the service experience, not an afterthought. Customers can follow service status, staff can update progress, and admin can monitor delivery performance.
            </p>
          </div>
          <div className="cards-grid cards-grid-4 garden-portal-benefits-grid">
            <article className="card garden-proof-card">
              <h3>Customer lane</h3>
              <p>Track status, view service history, and request help without email back-and-forth.</p>
            </article>
            <article className="card garden-proof-card">
              <h3>Staff lane</h3>
              <p>Assigned jobs, notes, and completion updates stay aligned with operations.</p>
            </article>
            <article className="card garden-proof-card">
              <h3>Admin lane</h3>
              <p>Quotes, jobs, assignments, and reporting summaries are visible in one place.</p>
            </article>
            <article className="card garden-proof-card">
              <h3>Faster support</h3>
              <p>Clients can request quote follow-up, issue support, and operations contact from clear action points.</p>
            </article>
          </div>
          <div className="hero-actions">
            <Link href={getGardenCleanersPortalUrl()} prefetch={false} className="btn btn-primary">
              Sign in to Client Portal
            </Link>
            <Link href="/garden-cleaners/quote" prefetch={false} className="btn btn-secondary">
              Start with a Quote
            </Link>
          </div>
        </section>

        <section className="section garden-section">
          <div className="garden-split-grid">
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Residential</p>
              <h2>Dependable home cleaning built around real schedules.</h2>
              <p>
                From recurring upkeep to deep cleaning before guests, listings, or a fresh start, the service is built to keep homes clean without adding stress.
              </p>
              <Link href="/garden-cleaners/quote" prefetch={false} className="inline-link">Get a residential quote</Link>
            </article>
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Commercial</p>
              <h2>Professional cleaning for businesses, offices, and managed properties.</h2>
              <p>
                Garden Cleaners works with business owners and property managers who need a clean, reliable environment and a service rhythm they can count on.
              </p>
              <Link href="/garden-cleaners/contact" prefetch={false} className="inline-link">Discuss a commercial plan</Link>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">{estimateFrameworkSection.eyebrow}</p>
            <h2>{estimateFrameworkSection.title}</h2>
            <p>{estimateFrameworkSection.description}</p>
          </div>
          <div className="cards-grid cards-grid-3">
            {estimateFrameworkSection.cards.map((card) => (
              <article key={card.title} className="card garden-proof-card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                {card.bullets?.length ? (
                  <ul className="feature-list compact-feature-list">
                    {card.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <GardenServiceShowcase
          eyebrow="Commercial and office support"
          title="Consistent cleaning for offices, teams, and client-facing spaces."
          body="Office, retail, and managed-property cleaning plans are designed to fit real schedules, reduce friction, and keep the space presentable between visits."
          linkHref="/garden-cleaners/services"
          linkLabel="Explore commercial services"
          asset={gardenCleanersConfig.media.commercial}
        />

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Quality promise</p>
            <h2>Detail-oriented cleaning with a practical, polished finish.</h2>
            <p>
              Whether the job is a family home, office, or turnover clean, the focus stays the same: dependable service, thoughtful detail, and a noticeably cleaner space.
            </p>
          </div>
          <div className="garden-proof-grid">
            <article className="card garden-proof-card">
              <h3>What clients notice</h3>
              <ul className="feature-list compact-feature-list">
                <li>Cleaner high-touch surfaces and shared spaces</li>
                <li>Better presentation for homes, tenants, and offices</li>
                <li>Consistent communication and flexible scheduling</li>
              </ul>
            </article>
            <article className="card garden-proof-card">
              <h3>Where the service fits best</h3>
              <ul className="feature-list compact-feature-list">
                <li>Move-in and move-out preparation</li>
                <li>Recurring home or office support</li>
                <li>Post-construction cleanup and reset</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">{serviceStandardsSection.eyebrow}</p>
            <h2>{serviceStandardsSection.title}</h2>
            <p>{serviceStandardsSection.description}</p>
          </div>
          <div className="cards-grid cards-grid-3">
            {serviceStandardsSection.cards.map((card) => (
              <article key={card.title} className="card garden-proof-card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                {card.bullets?.length ? (
                  <ul className="feature-list compact-feature-list">
                    {card.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">{coverageSection.eyebrow}</p>
            <h2>{coverageSection.title}</h2>
            <p>{coverageSection.description}</p>
          </div>
          <div className="cards-grid cards-grid-3">
            {coverageSection.cards.map((card) => (
              <article key={card.title} className="card garden-service-card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                {card.ctaHref && card.ctaLabel ? (
                  <Link
                    href={card.ctaHref}
                    prefetch={false}
                    className="inline-link"
                    data-analytics-event="garden_portal_entry_click"
                    data-analytics-location="home_regional_coverage"
                    data-analytics-label={card.title}
                  >
                    {card.ctaLabel}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Client feedback</p>
            <h2>What clients value most about Garden Cleaners.</h2>
            <p>
              Trust is earned through punctuality, communication, and a finish that feels ready for family life, team operations, or property handoff.
            </p>
          </div>
          <GardenTestimonials />
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions before booking.</h2>
          </div>
          <GardenFaqList />
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Official references</p>
            <h2>Use these official Garden Cleaners references for booking and support.</h2>
            <p>
              These are the primary pages and contact points for quotes, service scope, portal routing, and direct contact.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            <article className="card garden-proof-card">
              <h3>Booking references</h3>
              <ul className="feature-list compact-feature-list">
                <li><Link href="/garden-cleaners/quote" prefetch={false} className="inline-link">Get a Free Quote</Link></li>
                <li><Link href="/garden-cleaners/services" prefetch={false} className="inline-link">Services</Link></li>
                <li><Link href={getGardenCleanersPortalUrl()} prefetch={false} className="inline-link">Regional Portal</Link></li>
              </ul>
            </article>
            <article className="card garden-proof-card">
              <h3>Direct contact</h3>
              <ul className="feature-list compact-feature-list">
                <li><a href={gardenCleanersConfig.phoneHref} className="inline-link">{gardenCleanersConfig.phoneDisplay}</a></li>
                <li><a href={gardenCleanersConfig.emailHref} className="inline-link">{gardenCleanersConfig.email}</a></li>
                <li><Link href="/garden-cleaners/contact" prefetch={false} className="inline-link">Contact page</Link></li>
              </ul>
            </article>
            <article className="card garden-proof-card">
              <h3>Service coverage</h3>
              <ul className="feature-list compact-feature-list">
                {gardenCleanersConfig.serviceAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <CTABanner
          title="Ready for a cleaner, better-managed property experience?"
          description="Request a quote or open the portal to move from inquiry to scheduled service with clear visibility."
          primaryLabel="Request Premium Quote"
          primaryHref="/garden-cleaners/quote"
          secondaryLabel="Open Client Portal"
          secondaryHref={getGardenCleanersPortalUrl()}
        />
      </div>
    </div>
  );
}
