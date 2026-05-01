export const dynamic = "force-static";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CTABanner from "../../components/CTABanner";
import GardenQuoteForm from "../../components/garden-cleaners/GardenQuoteForm";
import GardenPortalAccessPanel from "../../components/garden-cleaners/GardenPortalAccessPanel";
import { gardenCleanersKeywords } from "../../../lib/gardenCleaners";

const regionalServiceWindows = [
  {
    region: "Oshawa",
    summary: "Core daily service zone",
    typicalWindow: "Same-week availability",
    focus: ["Residential recurring", "Office cleaning", "Move in and move out cleaning"],
    ctaText: "Get same-week quote"
  },
  {
    region: "Whitby",
    summary: "Priority regional coverage",
    typicalWindow: "48 to 72 hour booking window",
    focus: ["Deep cleaning", "Commercial support", "Post construction cleanup"],
    ctaText: "Book 48-72h window"
  },
  {
    region: "Ajax",
    summary: "Durham east route support",
    typicalWindow: "2 to 4 day booking window",
    focus: ["Recurring home cleaning", "Office sanitization", "Turnover reset"],
    ctaText: "Start Ajax quote"
  },
  {
    region: "Pickering",
    summary: "Extended route coverage",
    typicalWindow: "2 to 5 day booking window",
    focus: ["Commercial maintenance", "Deep cleaning", "Move related service"],
    ctaText: "Request Pickering slot"
  },
  {
    region: "Courtice",
    summary: "Flexible regional scheduling",
    typicalWindow: "2 to 5 day booking window",
    focus: ["Residential cleaning", "Listing preparation", "Post construction support"],
    ctaText: "Request Courtice quote"
  },
  {
    region: "Durham Region",
    summary: "Custom route by request",
    typicalWindow: "Scoped after intake",
    focus: ["Multi-site projects", "Property manager coverage", "Regional commercial plans"],
    ctaText: "Request custom regional plan"
  }
] as const;

export const metadata: Metadata = {
  title: "Regional Portal | Garden Cleaners Oshawa",
  description:
    "Explore the Garden Cleaners regional portal with service coverage, booking windows, client request flow, and operations routing across Oshawa and Durham Region.",
  keywords: gardenCleanersKeywords,
  icons: {
    icon: "/brand/garden-cleaners-mark.svg",
    shortcut: "/brand/garden-cleaners-mark.svg",
    apple: "/brand/garden-cleaners-mark.svg"
  },
  alternates: { canonical: "https://gardencleaners.ca/portal" },
  openGraph: {
    title: "Regional Portal | Garden Cleaners Oshawa",
    description:
      "Explore the Garden Cleaners regional portal with service coverage, client request flow, and operations routing across Oshawa and Durham Region.",
    url: "https://gardencleaners.ca/portal",
    siteName: "Garden Cleaners",
    type: "website",
    images: [
      {
        url: "https://gardencleaners.ca/images/garden-cleaners/gc-office-space-clean.png",
        width: 1200,
        height: 630,
        alt: "Garden Cleaners regional operations portal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Regional Portal | Garden Cleaners Oshawa",
    description:
      "Explore the Garden Cleaners regional portal with service coverage, client request flow, and operations routing across Oshawa and Durham Region.",
    images: ["https://gardencleaners.ca/images/garden-cleaners/gc-office-space-clean.png"]
  }
};

export default function GardenRegionalPortalPage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        {/* Move Portal Access Panel to the top for first viewport visibility */}
        <GardenPortalAccessPanel />

        <section className="section garden-section">
          <p className="eyebrow">Regional Portal</p>
          <h1>Regional service coverage, client intake, and operations routing</h1>
          <p className="page-intro">
            Use this portal to see where Garden Cleaners is operating, how client requests move through review, and what the current regional routing model looks like.
            The client and staff lanes below are the live portal build direction for future gated access.
          </p>
          <div className="hero-actions">
            <Link
              href="/garden-cleaners/quote"
              prefetch={false}
              className="btn btn-primary"
              data-analytics-event="garden_portal_cta_click"
              data-analytics-location="portal_hero"
              data-analytics-label="request_regional_quote"
            >
              Request Regional Quote
            </Link>
            <Link
              href="/garden-cleaners/contact"
              prefetch={false}
              className="btn btn-secondary"
              data-analytics-event="garden_portal_cta_click"
              data-analytics-location="portal_hero"
              data-analytics-label="contact_operations"
            >
              Contact Operations
            </Link>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Portal lanes</p>
            <h2>Client visibility on one side, operations control on the other.</h2>
            <p>
              This portal is being shaped around two lanes: a client-facing request timeline and an internal routing view for staff managing region, urgency, and assignment.
            </p>
          </div>
          <div className="garden-split-grid">
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Client lane</p>
              <h2>Track request status without extra back-and-forth.</h2>
              <ul className="feature-list compact-feature-list">
                <li>View current quote stage and service requested</li>
                <li>Confirm region and latest routing status</li>
                <li>Understand the next expected operations step</li>
              </ul>
            </article>
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Operations lane</p>
              <h2>Triage new requests and keep routing realistic.</h2>
              <ul className="feature-list compact-feature-list">
                <li>Review incoming requests by region and urgency</li>
                <li>Assign staff coverage for scoped jobs</li>
                <li>Keep same-week and regional commitments clear</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Coverage map by region</p>
            <h2>Current regional lanes and scheduling windows</h2>
            <p>
              Booking windows are operational targets, not hard guarantees. Time-sensitive requests can be flagged in the quote form for priority triage.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {regionalServiceWindows.map((region) => (
              <article key={region.region} className="card garden-service-card">
                <h3>{region.region}</h3>
                <p className="muted">{region.summary}</p>
                <p>
                  <strong>Typical window:</strong> {region.typicalWindow}
                </p>
                <ul className="feature-list compact-feature-list">
                  {region.focus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link
                  href={`/garden-cleaners/quote?region=${encodeURIComponent(region.region)}`}
                  prefetch={false}
                  className="inline-link"
                  data-analytics-event="garden_portal_region_quote_click"
                  data-analytics-location="portal_region_card"
                  data-analytics-label={region.region}
                >
                  {region.ctaText}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* <GardenPortalAccessPanel /> moved to top */}

        <section className="section garden-section">
          <div className="garden-split-grid">
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Commercial routing</p>
              <h2>Office and commercial requests are grouped by route efficiency.</h2>
              <p>
                Multi-unit and office requests are batched by geography and service complexity so quality stays high and arrival windows remain predictable.
              </p>
            </article>
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Time-sensitive requests</p>
              <h2>Need fast turnaround for a move, listing, or handoff?</h2>
              <p>
                Include your date constraint in the quote form and select your region. The operations team will confirm whether expedited routing is available.
              </p>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="garden-split-grid">
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Start a regional request</p>
              <h2>Submit directly from the portal.</h2>
              <p>
                This form routes the request through the portal lane so the intake can later appear in the client timeline and staff queue views.
              </p>
              <Suspense fallback={<div className="garden-quote-form-skeleton" aria-hidden="true" />}>
                <GardenQuoteForm source="portal_page" />
              </Suspense>
            </article>
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Portal rollout path</p>
              <h2>What comes next in the authenticated build.</h2>
              <ul className="feature-list compact-feature-list">
                <li>Client sign-in for request history and status visibility</li>
                <li>Staff sign-in for routing, assignment, and queue updates</li>
                <li>Linked quote records instead of preview data</li>
              </ul>
              <p>
                Until gated access is live, use the quote form here and the contact route for special scheduling or commercial routing questions.
              </p>
            </article>
          </div>
        </section>

        <CTABanner
          title="Need confirmation for your exact address?"
          description="Share your location, service type, and preferred timing. Garden Cleaners will confirm the right service lane and next available window."
          primaryLabel="Get a Regional Quote"
          primaryHref="/garden-cleaners/quote"
          secondaryLabel="View Services"
          secondaryHref="/garden-cleaners/services"
        />

        <div className="garden-portal-sticky-cta" aria-label="Regional portal quick actions">
          <Link
            href="/garden-cleaners/quote"
            prefetch={false}
            className="btn btn-primary"
            data-analytics-event="garden_portal_sticky_click"
            data-analytics-location="portal_sticky"
            data-analytics-label="get_regional_quote"
          >
            Get Regional Quote
          </Link>
          <Link
            href="/garden-cleaners/contact"
            prefetch={false}
            className="btn btn-secondary"
            data-analytics-event="garden_portal_sticky_click"
            data-analytics-location="portal_sticky"
            data-analytics-label="contact_ops"
          >
            Contact Ops
          </Link>
        </div>
      </div>
    </div>
  );
}
