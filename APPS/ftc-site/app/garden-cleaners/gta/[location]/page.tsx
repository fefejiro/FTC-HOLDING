export const dynamic = "force-static";
export const dynamicParams = false;

import type { Metadata } from "next";
import Link from "next/link";
import {
  gardenCleanersConfig,
  gardenGtaLocationPages,
  getGardenCleanersMetadata
} from "../../../../lib/gardenCleaners";

type LocationParams = { location: string };

type LocationContent = {
  neighborhoods: string[];
  useCases: string[];
  testimonial: {
    name: string;
    role: string;
    quote: string;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

const locationContentBySlug: Record<string, LocationContent> = {
  scarborough: {
    neighborhoods: ["Woburn", "Guildwood", "Malvern", "Birch Cliff"],
    useCases: ["condo recurring cleaning", "family-home deep cleaning", "move-related turnover"],
    testimonial: {
      name: "K. Adeyemi",
      role: "Condo resident in Scarborough",
      quote:
        "The team was punctual, clear, and detailed. We booked recurring service after the first deep clean because the result was consistently strong."
    },
    faqs: [
      {
        question: "Do you clean condos and homes in Scarborough?",
        answer:
          "Yes. Garden Cleaners supports condo and home cleaning in Scarborough with one-time, deep cleaning, and recurring plans."
      },
      {
        question: "Can I request a weekend cleaning window in Scarborough?",
        answer:
          "Yes. Weekend availability can be requested based on route timing and current booking capacity."
      }
    ]
  },
  "north-york": {
    neighborhoods: ["Willowdale", "Don Mills", "Bayview Village", "York Mills"],
    useCases: ["office and shared-space cleaning", "washroom and touch-point upkeep", "after-hours service windows"],
    testimonial: {
      name: "T. Morgan",
      role: "Office manager in North York",
      quote:
        "Our office needed reliable cleaning outside active client hours. Garden Cleaners kept the space polished without disruption."
    },
    faqs: [
      {
        question: "Do you provide office cleaning in North York?",
        answer:
          "Yes. We support office and commercial cleaning in North York, including recurring upkeep and detail-focused resets."
      },
      {
        question: "Can Garden Cleaners handle recurring corporate schedules?",
        answer:
          "Yes. Recurring plans can be weekly, bi-weekly, or custom based on your space and operating hours."
      }
    ]
  },
  etobicoke: {
    neighborhoods: ["Mimico", "The Kingsway", "Rexdale", "Long Branch"],
    useCases: ["residential reset cleaning", "vacant-unit preparation", "move-in and move-out support"],
    testimonial: {
      name: "A. Patel",
      role: "Property coordinator in Etobicoke",
      quote:
        "Move-out turnover was fast and organized. The unit was ready for listing photos on schedule."
    },
    faqs: [
      {
        question: "Do you support move-out cleaning in Etobicoke?",
        answer:
          "Yes. Garden Cleaners handles move-out and turnover cleaning in Etobicoke with scope aligned to listing or handoff timing."
      },
      {
        question: "Can I combine deep cleaning and recurring service?",
        answer:
          "Yes. Many clients start with a deep-clean reset and then switch to recurring maintenance."
      }
    ]
  },
  markham: {
    neighborhoods: ["Unionville", "Cornell", "Greensborough", "Milliken Mills"],
    useCases: ["recurring home maintenance", "office and retail support", "seasonal deep-clean visits"],
    testimonial: {
      name: "S. Brown",
      role: "Homeowner in Markham",
      quote:
        "Communication was clear and the standard stayed high across visits. We now run a recurring plan for our home."
    },
    faqs: [
      {
        question: "Do you clean both homes and commercial spaces in Markham?",
        answer:
          "Yes. We support residential and commercial cleaning in Markham with routing based on location, scope, and schedule."
      },
      {
        question: "How quickly can I get a Markham quote?",
        answer:
          "Quote turnaround depends on scope detail, but requests are reviewed quickly so service lane and next step are clear."
      }
    ]
  },
  vaughan: {
    neighborhoods: ["Maple", "Woodbridge", "Concord", "Vellore Village"],
    useCases: ["commercial maintenance", "residential recurring plans", "deep-clean reset work"],
    testimonial: {
      name: "D. Ibrahim",
      role: "Business owner in Vaughan",
      quote:
        "The team balanced speed and detail. Our office looked client-ready after each visit and scheduling stayed dependable."
    },
    faqs: [
      {
        question: "Do you provide commercial cleaning in Vaughan?",
        answer:
          "Yes. Garden Cleaners supports office and commercial cleaning in Vaughan with scalable recurring schedules."
      },
      {
        question: "Can I book a one-time deep clean in Vaughan?",
        answer:
          "Yes. One-time deep cleaning is available for first-time resets, seasonal refreshes, and handoff preparation."
      }
    ]
  }
};

function getLocationPage(locationSlug: string) {
  return gardenGtaLocationPages.find((item) => item.slug === locationSlug) ?? null;
}

export function generateStaticParams() {
  return gardenGtaLocationPages.map((item) => ({ location: item.slug }));
}

export function generateMetadata({ params }: { params: LocationParams }): Metadata {
  const locationPage = getLocationPage(params.location);
  const locationName = locationPage?.name ?? "GTA";

  return getGardenCleanersMetadata({
    title: `${locationName} Cleaning Services | Garden Cleaners GTA`,
    description: `Garden Cleaners provides professional house cleaning, office cleaning, deep cleaning, and move-out cleaning in ${locationName}.`,
    pathname: `/gta/${params.location}`
  });
}

export default function GardenGtaLocationPage({ params }: { params: LocationParams }) {
  const locationPage = getLocationPage(params.location);

  if (!locationPage) {
    return null;
  }

  const locationContent = locationContentBySlug[locationPage.slug] ?? locationContentBySlug.scarborough;
  const siblingLocations = gardenGtaLocationPages.filter((item) => item.slug !== locationPage.slug);

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HouseCleaning",
    name: "Garden Cleaners",
    url: `https://gardencleaners.ca/garden-cleaners/gta/${locationPage.slug}`,
    telephone: "+1-289-200-0631",
    email: "gardencleaners@gmail.com",
    areaServed: [{ "@type": "City", name: locationPage.name }, { "@type": "AdministrativeArea", name: "Greater Toronto Area" }],
    serviceType: [
      "Residential cleaning",
      "Commercial cleaning",
      "Deep cleaning",
      "Move-out cleaning",
      "Office cleaning"
    ]
  };

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${locationPage.name} Cleaning Services`,
    provider: {
      "@type": "LocalBusiness",
      name: "Garden Cleaners"
    },
    areaServed: [{ "@type": "City", name: locationPage.name }],
    review: [
      {
        "@type": "Review",
        reviewBody: locationContent.testimonial.quote,
        author: {
          "@type": "Person",
          name: locationContent.testimonial.name
        }
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: locationContent.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Garden Cleaners",
        item: "https://gardencleaners.ca/garden-cleaners"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Toronto",
        item: "https://gardencleaners.ca/garden-cleaners/toronto"
      },
      {
        "@type": "ListItem",
        position: 3,
        name: locationPage.name,
        item: `https://gardencleaners.ca/garden-cleaners/gta/${locationPage.slug}`
      }
    ]
  };

  return (
    <div className="garden-site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="container page-content garden-page-content">
        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">GTA local cleaning page</p>
            <h1>{locationPage.name} Cleaning Services</h1>
            <p>
              Garden Cleaners supports {locationPage.name} clients with {locationPage.focus}. Each request is scoped by property details,
              service depth, and schedule timing before confirmation.
            </p>
          </div>

          <div className="cards-grid cards-grid-3">
            <article className="card garden-proof-card">
              <h2>House Cleaning {locationPage.name}</h2>
              <p>Recurring and one-time residential cleaning adapted to property size, condition, and preferred service rhythm.</p>
            </article>
            <article className="card garden-proof-card">
              <h2>Office Cleaning {locationPage.name}</h2>
              <p>Commercial cleaning designed for cleaner shared spaces, washrooms, touch points, and professional presentation.</p>
            </article>
            <article className="card garden-proof-card">
              <h2>Deep and Move-Out Cleaning {locationPage.name}</h2>
              <p>Detailed reset cleaning for first-time visits, listing prep, handoff workflows, and high-attention property turnover.</p>
            </article>
          </div>

          <div className="cards-grid cards-grid-2">
            <article className="card garden-proof-card">
              <h3>Popular neighborhoods we support in {locationPage.name}</h3>
              <ul className="feature-list compact-feature-list">
                {locationContent.neighborhoods.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </article>
            <article className="card garden-proof-card">
              <h3>Frequent cleaning requests in {locationPage.name}</h3>
              <ul className="feature-list compact-feature-list">
                {locationContent.useCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="cards-grid cards-grid-2">
            <article className="card garden-proof-card">
              <h3>Client feedback from {locationPage.name}</h3>
              <p>&ldquo;{locationContent.testimonial.quote}&rdquo;</p>
              <p className="muted">{locationContent.testimonial.name} · {locationContent.testimonial.role}</p>
            </article>
            <article className="card garden-proof-card">
              <h3>Frequently asked for {locationPage.name}</h3>
              <ul className="feature-list compact-feature-list">
                {locationContent.faqs.map((item) => (
                  <li key={item.question}>
                    <strong>{item.question}</strong> {item.answer}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="hero-actions">
            <Link href={`/garden-cleaners/quote?region=${encodeURIComponent(locationPage.name)}`} className="btn btn-primary" prefetch={false}>
              Get a {locationPage.name} quote
            </Link>
            <Link href="/garden-cleaners/toronto" className="btn btn-secondary" prefetch={false}>
              Back to Toronto and GTA page
            </Link>
            <Link href={gardenCleanersConfig.phoneHref} className="btn btn-secondary" prefetch={false}>
              Call {gardenCleanersConfig.phoneDisplay}
            </Link>
          </div>

          <div className="cards-grid cards-grid-3">
            {siblingLocations.map((location) => (
              <article key={location.slug} className="card garden-proof-card">
                <h3>{location.name} Cleaning Services</h3>
                <p>Explore service coverage and local quote routing for {location.name}.</p>
                <Link href={`/garden-cleaners/gta/${location.slug}`} className="inline-link" prefetch={false}>
                  Open {location.name} page
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
