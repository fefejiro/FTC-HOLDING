import type { Metadata } from "next";
import CTABanner from "../components/CTABanner";
import PolarFaqList from "../components/polar-anchor/PolarFaqList";
import PolarHero from "../components/polar-anchor/PolarHero";
import PolarOperationsFeature from "../components/polar-anchor/PolarOperationsFeature";
import PolarServiceCard from "../components/polar-anchor/PolarServiceCard";
import PolarServiceShowcase from "../components/polar-anchor/PolarServiceShowcase";
import PolarStickyCta from "../components/polar-anchor/PolarStickyCta";
import PolarTestimonials from "../components/polar-anchor/PolarTestimonials";
import PolarTrustStrip from "../components/polar-anchor/PolarTrustStrip";
import { polarAnchorConfig, polarServices } from "../../lib/polarAnchor";
import { SITE_URL } from "../../lib/site";

const whyChooseUs = [
  {
    title: "End-to-end logistics coordination",
    copy:
      "Polar Anchor helps connect freight forwarding, customs support, warehousing, and transportation into one clear operating flow."
  },
  {
    title: "Reliable and professional handling",
    copy:
      "Clients get practical communication, stronger operational follow-through, and a logistics process that feels disciplined instead of reactive."
  },
  {
    title: "Cost-effective value-added service",
    copy:
      "The service is positioned around efficient execution, flexible support, and business-friendly coordination that creates real operational value."
  }
] as const;

const capabilitySplit = [
  {
    title: "Commercial Cargo Logistics",
    copy:
      "Freight coordination for businesses moving commercial goods, containers, and shipment volumes that require dependable handling.",
    bullets: ["Commercial shipment planning", "Container movement support", "Freight and delivery coordination"]
  },
  {
    title: "Import / Export Support",
    copy:
      "Practical logistics support for businesses navigating cross-border movement, customs steps, and document-driven shipment flow.",
    bullets: ["Customs coordination", "Import and export support", "Release and documentation flow"]
  },
  {
    title: "Vehicle Shipping and Handling",
    copy:
      "Operational support for vehicle import clients and dealers who need cleaner movement, handling, and onward transportation coordination.",
    bullets: ["Vehicle release planning", "Handling coordination", "Dealer-focused support"]
  },
  {
    title: "Warehousing and Transportation",
    copy:
      "Storage, staging, and inland movement support when shipments need sequencing, timing control, or a smoother delivery path.",
    bullets: ["Warehousing support", "Cargo staging", "Inland transportation"]
  }
] as const;

export const metadata: Metadata = {
  title: "Polar Anchor | Freight Forwarding and Logistics Services in Canada",
  description:
    "Polar Anchor provides professional freight forwarding, transportation, warehousing, customs clearance, and import-export logistics support across Canada. Request a quote today.",
  alternates: { canonical: `${SITE_URL}/polar-anchor` }
};

export default function HomePage() {
  return (
    <div className="polar-site-shell">
      <div className="container page-content polar-page-content">
        <PolarHero />
        <PolarTrustStrip />
        <PolarOperationsFeature />

        <section className="section polar-section">
          <div className="section-heading">
            <p className="eyebrow">Services overview</p>
            <h2>Modern logistics support for cargo, containers, vehicles, and commercial movement.</h2>
            <p>
              Polar Anchor supports importers, exporters, SMEs, dealers, and businesses that need freight coordination, customs support, warehousing, and transportation handled professionally.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {polarServices.map((service) => (
              <PolarServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </section>

        <section className="section polar-section">
          <div className="section-heading">
            <p className="eyebrow">Why choose Polar Anchor</p>
            <h2>Professional, practical support for businesses that need logistics done properly.</h2>
          </div>
          <div className="cards-grid cards-grid-3 polar-why-grid">
            {whyChooseUs.map((item) => (
              <article key={item.title} className="card polar-why-card">
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <PolarServiceShowcase
          eyebrow="Operations and capability"
          title="The business feels operationally real because the service scope reflects how shipments actually move."
          body="Polar Anchor is presented around real cargo flow, container handling, customs support, warehousing, and transport coordination so the website feels grounded in actual logistics work."
          linkHref="/polar-anchor/about"
          linkLabel="Learn more about Polar Anchor"
          asset={polarAnchorConfig.media.operations}
        />

        <section className="section polar-section">
          <div className="section-heading">
            <p className="eyebrow">Capability split</p>
            <h2>Support across import, export, vehicle shipping, cargo handling, and warehousing.</h2>
          </div>
          <div className="cards-grid cards-grid-3 polar-capability-grid">
            {capabilitySplit.map((item) => (
              <article key={item.title} className="card polar-capability-card">
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <ul className="feature-list compact-feature-list">
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <PolarServiceShowcase
          eyebrow="Customs and trade support"
          title="Import and export coordination with better visibility around release, documentation, and movement."
          body="For clients needing customs support and end-to-end freight coordination, Polar Anchor is positioned to keep the next steps clear and the shipment flow moving."
          linkHref="/polar-anchor/services"
          linkLabel="View all services"
          asset={polarAnchorConfig.media.customs}
          reverse
        />

        <section className="section polar-section">
          <div className="section-heading">
            <p className="eyebrow">Process</p>
            <h2>A simple operating path from quote request to shipment support.</h2>
          </div>
          <div className="cards-grid cards-grid-3 polar-process-grid">
            {polarAnchorConfig.processSteps.map((step, index) => (
              <article key={step} className="card polar-process-card">
                <span className="polar-process-index">{`0${index + 1}`}</span>
                <h3>{step}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section polar-section">
          <div className="section-heading">
            <p className="eyebrow">Trust statements</p>
            <h2>What clients value in the experience.</h2>
          </div>
          <PolarTestimonials />
        </section>

        <section className="section polar-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Practical questions before getting started.</h2>
          </div>
          <PolarFaqList />
        </section>

        <CTABanner
          title="Need reliable freight and logistics support?"
          description="Request your quote today and let Polar Anchor help coordinate your next shipment across freight, customs, warehousing, and transportation."
          primaryLabel="Request a Quote"
          primaryHref="/polar-anchor/quote"
          secondaryLabel="Contact Polar Anchor"
          secondaryHref="/polar-anchor/contact"
        />
      </div>
      <PolarStickyCta />
    </div>
  );
}

