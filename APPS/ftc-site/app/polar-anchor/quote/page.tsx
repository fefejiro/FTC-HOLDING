export const dynamic = 'force-static';
import type { Metadata } from "next";
import PolarImagePanel from "../../components/polar-anchor/PolarImagePanel";
import PolarQuoteForm from "../../components/polar-anchor/PolarQuoteForm";
import PolarStickyCta from "../../components/polar-anchor/PolarStickyCta";
import { polarAnchorConfig } from "../../../lib/polarAnchor";
import { SITE_URL } from "../../../lib/site";

export const metadata: Metadata = {
  title: "Request a Quote | Polar Anchor Logistics",
  description:
    "Request a freight and logistics quote from Polar Anchor for cargo movement, vehicle shipping, customs support, warehousing, transportation, and import-export coordination.",
  alternates: { canonical: `${SITE_URL}/polar-anchor/quote` }
};

export default function QuotePage() {
  return (
    <div className="polar-site-shell">
      <div className="container page-content polar-page-content">
        <div className="polar-quote-grid">
          <section>
            <p className="eyebrow">Quote request</p>
            <h1>Tell us what needs to move.</h1>
            <p className="page-intro">
              Whether you need freight forwarding, customs support, warehousing, transportation, or vehicle shipping coordination, Polar Anchor can scope the next step quickly.
            </p>
            <div className="card polar-quote-side-card">
              <h2>What to include</h2>
              <ul className="feature-list compact-feature-list">
                <li>Shipment type and service needed</li>
                <li>Origin and destination</li>
                <li>Preferred timeline or target date</li>
                <li>Any handling, customs, or warehousing needs</li>
              </ul>
              <p>
                Prefer to talk first? Call <a href={polarAnchorConfig.phoneHref}>{polarAnchorConfig.phoneDisplay}</a> or email <a href={polarAnchorConfig.emailHref}>{polarAnchorConfig.email}</a>.
              </p>
            </div>
            <PolarImagePanel asset={polarAnchorConfig.media.contact} className="polar-quote-media" />
          </section>

          <section className="card polar-quote-form-shell">
            <h2>Request your quote</h2>
            <PolarQuoteForm />
          </section>
        </div>
      </div>
      <PolarStickyCta />
    </div>
  );
}

