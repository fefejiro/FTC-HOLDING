export const dynamic = 'force-static';
import type { Metadata } from "next";
import GardenImagePanel from "../../components/garden-cleaners/GardenImagePanel";
import GardenQuoteForm from "../../components/garden-cleaners/GardenQuoteForm";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export const metadata: Metadata = {
  title: 'Get a Free Quote | Garden Cleaners',
  description:
    'Request a free quote from Garden Cleaners for residential, commercial, deep cleaning, move-in, move-out, or post-construction cleaning in Oshawa, Ontario.',
  alternates: { canonical: 'https://gardencleaners.ca/garden-cleaners/quote' }
};

export default function GardenQuotePage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <div className="garden-quote-grid">
          <section>
            <p className="eyebrow">Free quote request</p>
            <h1>Tell us what needs cleaning.</h1>
            <p className="page-intro">
              Whether you need a one-time deep clean, recurring service, office cleaning, or a move-related reset, Garden Cleaners can scope the next step quickly.
            </p>
            <div className="card garden-quote-side-card">
              <h2>What to include</h2>
              <ul className="feature-list compact-feature-list">
                <li>Type of property</li>
                <li>Service needed</li>
                <li>Preferred timeline</li>
                <li>Any special notes about the space</li>
              </ul>
              <p>
                Prefer to talk first? Call <a href={gardenCleanersConfig.phoneHref}>{gardenCleanersConfig.phoneDisplay}</a> or email <a href={gardenCleanersConfig.emailHref}>{gardenCleanersConfig.email}</a>.
              </p>
            </div>
            <GardenImagePanel asset={gardenCleanersConfig.media.quote} className="garden-quote-media" />
          </section>

          <section className="card garden-quote-form-shell">
            <h2>Request your quote</h2>
            <GardenQuoteForm source="quote_page" />
          </section>
        </div>
      </div>
    </div>
  );
}
