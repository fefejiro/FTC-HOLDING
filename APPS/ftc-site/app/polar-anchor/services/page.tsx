export const dynamic = 'force-static';
import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import PolarServiceCard from "../../components/polar-anchor/PolarServiceCard";
import PolarServiceShowcase from "../../components/polar-anchor/PolarServiceShowcase";
import PolarStickyCta from "../../components/polar-anchor/PolarStickyCta";
import { polarAnchorConfig, polarServices } from "../../../lib/polarAnchor";
import { SITE_URL } from "../../../lib/site";

export const metadata: Metadata = {
  title: "Services | Polar Anchor Logistics and Freight Solutions",
  description:
    "Explore freight forwarding, transportation, warehousing, customs clearance, import-export support, logistics consultancy, and vehicle shipping services from Polar Anchor.",
  alternates: { canonical: `${SITE_URL}/polar-anchor/services` }
};

export default function ServicesPage() {
  return (
    <div className="polar-site-shell">
      <div className="container page-content polar-page-content">
        <h1>Logistics Services</h1>
        <p className="page-intro">
          Polar Anchor provides freight and logistics support for businesses moving cargo, vehicles, and commercial shipments with professionalism, clarity, and operational follow-through.
        </p>

        <PolarServiceShowcase
          eyebrow="Freight and operations"
          title="A stronger operating layer across freight forwarding, transportation, and shipment support."
          body="Polar Anchor is structured for businesses that need freight, customs, warehousing, and transport support to work together instead of feeling disconnected."
          linkHref="/polar-anchor/quote"
          linkLabel="Request a quote"
          asset={polarAnchorConfig.media.operations}
        />

        <div className="cards-grid cards-grid-3">
          {polarServices.map((service) => (
            <PolarServiceCard key={service.slug} service={service} />
          ))}
        </div>

        <PolarServiceShowcase
          eyebrow="Vehicle shipping and customs support"
          title="Support for auto logistics, release flow, documentation, and specialized shipment handling."
          body="Vehicle imports and specialized cargo often need tighter coordination. Polar Anchor presents a cleaner, more client-ready way to manage those moving parts."
          linkHref="/polar-anchor/contact"
          linkLabel="Talk to operations"
          asset={polarAnchorConfig.media.vehicles}
          reverse
        />

        <CTABanner
          title="Need help choosing the right logistics service?"
          description="Share your shipment type, route, and timing. Polar Anchor will recommend the most practical next step."
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

