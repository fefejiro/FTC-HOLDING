import type { Metadata } from "next";
import PolarImagePanel from "../../components/polar-anchor/PolarImagePanel";
import PolarQuoteForm from "../../components/polar-anchor/PolarQuoteForm";
import PolarStickyCta from "../../components/polar-anchor/PolarStickyCta";
import { polarAnchorConfig } from "../../../lib/polarAnchor";
import { SITE_URL } from "../../../lib/site";

export const metadata: Metadata = {
  title: "Contact Polar Anchor | Request a Freight and Logistics Quote",
  description:
    "Contact Polar Anchor for freight forwarding, transportation, customs support, warehousing, import-export coordination, and logistics consultancy in Canada.",
  alternates: { canonical: `${SITE_URL}/polar-anchor/contact` }
};

export default function ContactPage() {
  return (
    <div className="polar-site-shell">
      <div className="container page-content polar-page-content">
        <div className="polar-contact-grid">
          <section>
            <h1>Contact Polar Anchor</h1>
            <p className="page-intro">
              Reach out for freight forwarding, transportation, warehousing, customs support, vehicle shipping coordination, or a quote for your next commercial movement.
            </p>
            <div className="card polar-contact-card">
              <h2>Contact details</h2>
              <p><strong>Phone:</strong> <a href={polarAnchorConfig.phoneHref}>{polarAnchorConfig.phoneDisplay}</a></p>
              <p><strong>Email:</strong> <a href={polarAnchorConfig.emailHref}>{polarAnchorConfig.email}</a></p>
              <p><strong>Address:</strong> {polarAnchorConfig.addressLine}</p>
              <div className="polar-hours-block">
                <p><strong>Hours</strong></p>
                <ul>
                  {polarAnchorConfig.businessHours.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="muted">
                Service coverage is positioned across Canada, with support for import-export coordination and commercial freight needs.
              </p>
            </div>
            <PolarImagePanel asset={polarAnchorConfig.media.contact} className="polar-contact-media" />
          </section>

          <section className="card polar-contact-form-card">
            <h2>Request a quote</h2>
            <p className="muted">Share the shipment basics and Polar Anchor will follow up with the right next step.</p>
            <PolarQuoteForm />
          </section>
        </div>
      </div>
      <PolarStickyCta />
    </div>
  );
}

