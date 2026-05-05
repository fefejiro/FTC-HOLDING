export const dynamic = 'force-static';
import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../../components/CTABanner";
import GardenServiceCard from "../../components/garden-cleaners/GardenServiceCard";
import GardenServiceShowcase from "../../components/garden-cleaners/GardenServiceShowcase";
import type { GardenContentSection } from "../../../lib/gardenContracts";
import { gardenCleanersConfig, gardenServices, getGardenCleanersMetadata } from "../../../lib/gardenCleaners";

const serviceSelectionSection: GardenContentSection = {
  id: "garden-services-selection-guide",
  kind: "workflow",
  eyebrow: "Service selection guide",
  title: "Choose the right cleaning lane before you request a quote.",
  description:
    "The fastest way to get the right plan is to match the request to the actual service condition of the property, not only the property type.",
  cards: [
    {
      title: "Standard recurring upkeep",
      body: "Best when the property is already in reasonable shape and the goal is to keep kitchens, washrooms, floors, and shared spaces consistently maintained.",
      bullets: ["Good fit for homes and offices", "Best for weekly or bi-weekly rhythm", "Lower reset time after the first visit"]
    },
    {
      title: "Deep cleaning and first-visit reset",
      body: "Best when the property needs extra detail work, neglected areas need attention, or the first visit needs to create a cleaner baseline before recurring service.",
      bullets: ["Useful for seasonal resets", "Good fit before recurring plans", "Includes higher-detail attention areas"]
    },
    {
      title: "Turnover, construction, or handoff work",
      body: "Best when the space is tied to a move, listing, renovation, tenant change, or deadline-sensitive handoff where timing and finish matter most.",
      bullets: ["Built for date-sensitive work", "Useful for vacant units and listings", "Better fit for one-time scoped jobs"]
    }
  ]
};

const pricingAnchorSection: GardenContentSection = {
  id: "garden-services-pricing-anchors",
  kind: "estimate_framework",
  eyebrow: "Pricing anchors",
  title: "What usually changes the quote.",
  description:
    "Garden Cleaners scopes pricing around work reality: size, condition, service depth, timing, and route efficiency. These are the main quote drivers clients should expect.",
  cards: [
    {
      title: "Property size and layout",
      body: "Square footage, room count, number of washrooms, stair access, and how much of the property is included all affect labor time.",
      bullets: ["Larger footprints raise visit time", "More washrooms and shared zones increase scope"]
    },
    {
      title: "Current condition and reset level",
      body: "A space that needs heavy reset work, appliance detail, construction cleanup, or move-related turnaround is priced differently than a maintained property.",
      bullets: ["First-visit resets usually scope higher", "Construction residue and vacancy cleanup add detail time"]
    },
    {
      title: "Scheduling and service rhythm",
      body: "Recurring cadence, urgency, region, and whether the work needs a tighter booking window all influence how the request is routed and priced.",
      bullets: ["Recurring plans often reduce repeat friction", "Priority dates may require custom routing"]
    }
  ]
};

export const metadata: Metadata = getGardenCleanersMetadata({
  title: "Cleaning Services | Garden Cleaners Oshawa",
  description:
    "Explore residential, commercial, deep cleaning, move-in, move-out, office, and post-construction cleaning services from Garden Cleaners in Oshawa, Ontario.",
  pathname: "/services"
});

export default function GardenServicesPage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <h1>Cleaning Services</h1>
        <p className="page-intro">Garden Cleaners offers practical, professional cleaning support for residential and commercial clients in Oshawa and surrounding areas.</p>
        <p>
          <Link
            href="/garden-cleaners/portal"
            prefetch={false}
            className="inline-link"
            data-analytics-event="garden_portal_entry_click"
            data-analytics-location="services_intro"
            data-analytics-label="open_regional_portal"
          >
            Open the regional portal
          </Link>
        </p>

        <GardenServiceShowcase
          eyebrow="Deep cleaning and reset work"
          title="A detailed clean for move-related, seasonal, and first-visit service needs."
          body="Deep cleaning is ideal when the space needs more than a standard recurring visit. It gives homes, offices, and managed properties a more polished reset before the next rhythm starts."
          linkHref="/garden-cleaners/quote"
          linkLabel="Book a deep cleaning quote"
          asset={gardenCleanersConfig.media.deepCleaning}
        />

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">{serviceSelectionSection.eyebrow}</p>
            <h2>{serviceSelectionSection.title}</h2>
            <p>{serviceSelectionSection.description}</p>
          </div>
          <div className="cards-grid cards-grid-3">
            {serviceSelectionSection.cards.map((card) => (
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

        <div className="cards-grid cards-grid-3">
          {gardenServices.map((service) => (
            <GardenServiceCard key={service.slug} service={service} />
          ))}
        </div>

        <GardenServiceShowcase
          eyebrow="Sanitization and janitorial support"
          title="Washrooms, shared zones, and touch points maintained with a cleaner, more professional standard."
          body="For offices, shared environments, and recurring upkeep, Garden Cleaners can support washroom cleaning, janitorial resets, and hygiene-focused service where detail matters."
          linkHref="/garden-cleaners/contact"
          linkLabel="Discuss janitorial support"
          asset={gardenCleanersConfig.media.sanitization}
        />

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">{pricingAnchorSection.eyebrow}</p>
            <h2>{pricingAnchorSection.title}</h2>
            <p>{pricingAnchorSection.description}</p>
          </div>
          <div className="cards-grid cards-grid-3">
            {pricingAnchorSection.cards.map((card) => (
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
          <p>
            <Link href="/garden-cleaners/quote" prefetch={false} className="inline-link">
              Request a scoped estimate
            </Link>
          </p>
        </section>

        <CTABanner title="Need help choosing the right cleaning service?" description="Share a few details about the property and timing and we will recommend the right cleaning plan." primaryLabel="Get a Free Quote" primaryHref="/garden-cleaners/quote" secondaryLabel="Contact Garden Cleaners" secondaryHref="/garden-cleaners/contact" />
      </div>
    </div>
  );
}
