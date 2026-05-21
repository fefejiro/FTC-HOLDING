export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../../components/CTABanner";
import {
  gardenCleanersConfig,
  gardenGtaLocationPages,
  gardenCleanersSeoAreas,
  getGardenCleanersMetadata,
  getGardenCleanersPortalUrl
} from "../../../lib/gardenCleaners";

const torontoLocalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "HouseCleaning",
  name: "Garden Cleaners",
  url: "https://gardencleaners.ca/garden-cleaners/toronto",
  telephone: "+1-289-200-0631",
  email: "gardencleaners@gmail.com",
  areaServed: gardenCleanersSeoAreas.map((area) => ({ "@type": "City", name: area })),
  address: {
    "@type": "PostalAddress",
    addressLocality: "Oshawa",
    addressRegion: "ON",
    addressCountry: "CA"
  },
  serviceType: [
    "Residential cleaning",
    "Commercial cleaning",
    "Move-in and move-out cleaning",
    "Deep cleaning",
    "Office cleaning"
  ]
};

const torontoFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do you serve Toronto and the GTA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Garden Cleaners supports Toronto and the GTA with routing based on location, scope, and service window availability."
      }
    },
    {
      "@type": "Question",
      name: "What cleaning services are available in Toronto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We provide residential cleaning, commercial cleaning, deep cleaning, move-related cleaning, and recurring service plans."
      }
    },
    {
      "@type": "Question",
      name: "How do I request a Toronto cleaning quote?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the online quote form and include your Toronto area, property details, and preferred schedule. Our team follows up with the right service lane and next step."
      }
    }
  ]
};

export const metadata: Metadata = getGardenCleanersMetadata({
  title: "Toronto Cleaning Services | Garden Cleaners GTA",
  description:
    "Garden Cleaners provides professional cleaning services in Toronto and the GTA, including house cleaning, office cleaning, deep cleaning, and move-out cleaning.",
  pathname: "/toronto"
});

export default function GardenCleanersTorontoPage() {
  return (
    <div className="garden-site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(torontoLocalBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(torontoFaqSchema) }} />

      <div className="container page-content garden-page-content">
        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Toronto and GTA cleaning</p>
            <h1>Professional Cleaning Services in Toronto and the Greater Toronto Area</h1>
            <p>
              Garden Cleaners supports homeowners, offices, and managed properties across Toronto and the GTA with reliable, detail-focused cleaning.
              From deep cleans to recurring schedules, each service path is routed for practical timing and consistent quality.
            </p>
            <p>
              <Link href={getGardenCleanersPortalUrl()} prefetch={false} className="inline-link">
                Open regional client portal
              </Link>
            </p>
          </div>

          <div className="cards-grid cards-grid-3">
            <article className="card garden-proof-card">
              <h2>House Cleaning Toronto</h2>
              <p>
                Recurring and one-time home cleaning for condos, apartments, and family homes with scope based on layout, condition, and timing.
              </p>
            </article>
            <article className="card garden-proof-card">
              <h2>Commercial and Office Cleaning Toronto</h2>
              <p>
                Low-disruption office cleaning and janitorial support for businesses that need a consistently clean and client-ready workspace.
              </p>
            </article>
            <article className="card garden-proof-card">
              <h2>Deep and Move-Out Cleaning GTA</h2>
              <p>
                Detailed reset cleaning for move-in, move-out, listing prep, and post-renovation handoff workflows.
              </p>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Coverage focus</p>
            <h2>Service routing across Toronto and nearby GTA zones</h2>
            <p>
              Primary coverage includes Toronto, Scarborough, North York, Etobicoke, Markham, Vaughan, and Durham Region.
              Availability is confirmed at quote time to keep schedules realistic and quality predictable.
            </p>
          </div>

          <div className="hero-actions">
            <Link href="/garden-cleaners/quote?region=Toronto" className="btn btn-primary" prefetch={false}>
              Get a Toronto quote
            </Link>
            <Link href="/garden-cleaners/services" className="btn btn-secondary" prefetch={false}>
              View all cleaning services
            </Link>
            <Link href="/garden-cleaners/contact" className="btn btn-secondary" prefetch={false}>
              Contact operations
            </Link>
          </div>

          <div className="cards-grid cards-grid-3">
            {gardenGtaLocationPages.map((location) => (
              <article key={location.slug} className="card garden-proof-card">
                <h3>{location.name} Cleaning Services</h3>
                <p>Local page focused on {location.focus}.</p>
                <Link href={`/garden-cleaners/gta/${location.slug}`} prefetch={false} className="inline-link">
                  Explore {location.name} page
                </Link>
              </article>
            ))}
          </div>
        </section>

        <CTABanner
          title="Need a trusted Toronto cleaning team?"
          description="Share your location, property details, and preferred schedule to receive the right quote path for your GTA service request."
          primaryLabel="Request a GTA quote"
          primaryHref="/garden-cleaners/quote?region=Toronto"
          secondaryLabel={`Call ${gardenCleanersConfig.phoneDisplay}`}
          secondaryHref={gardenCleanersConfig.phoneHref}
        />
      </div>
    </div>
  );
}
