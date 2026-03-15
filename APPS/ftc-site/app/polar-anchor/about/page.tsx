import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import PolarImagePanel from "../../components/polar-anchor/PolarImagePanel";
import PolarStickyCta from "../../components/polar-anchor/PolarStickyCta";
import { polarAnchorConfig } from "../../../lib/polarAnchor";
import { SITE_URL } from "../../../lib/site";

export const metadata: Metadata = {
  title: "About Polar Anchor | End-to-End Logistics Support",
  description:
    "Learn about Polar Anchor, a Canada-based logistics and freight company focused on seamless, professional, end-to-end freight, warehousing, customs, and transportation support.",
  alternates: { canonical: `${SITE_URL}/polar-anchor/about` }
};

export default function AboutPage() {
  return (
    <div className="polar-site-shell">
      <div className="container page-content polar-page-content">
        <div className="polar-showcase-grid polar-about-intro-grid">
          <section>
            <h1>About Polar Anchor</h1>
            <p className="page-intro">
              Polar Anchor is a logistics and freight company serving businesses that need dependable shipment coordination, warehousing support, customs guidance, and transportation handled in a seamless and professional manner.
            </p>
          </section>
          <PolarImagePanel asset={polarAnchorConfig.media.about} className="polar-showcase-media" />
        </div>

        <section className="polar-copy-stack">
          <article className="card">
            <h2>Who we are</h2>
            <p>
              Polar Anchor supports importers, exporters, vehicle shipping clients, and SMEs that need practical freight forwarding and logistics coordination across Canada.
            </p>
          </article>
          <article className="card">
            <h2>How we work</h2>
            <p>
              We focus on efficient end-to-end logistics solutions that keep shipment flow clearer, reduce friction across multiple handoffs, and make the next operational step easy to understand.
            </p>
          </article>
          <article className="card">
            <h2>Our operating mindset</h2>
            <p>
              Customer satisfaction is central to our operations while we deliver cost-effective, value-added services that support freight, warehousing, customs, and transportation needs.
            </p>
          </article>
          <article className="card">
            <h2>Why businesses choose Polar Anchor</h2>
            <p>
              Clients choose Polar Anchor for reliable coordination, practical communication, and a business-focused approach that treats logistics as an execution discipline, not just a handoff.
            </p>
          </article>
        </section>

        <CTABanner
          title="Need seamless end-to-end logistics support?"
          description="Tell us what you need to move and Polar Anchor will help define the right freight, customs, warehousing, or transportation path."
          primaryLabel="Request a Quote"
          primaryHref="/polar-anchor/quote"
          secondaryLabel="View Services"
          secondaryHref="/polar-anchor/services"
        />
      </div>
      <PolarStickyCta />
    </div>
  );
}

