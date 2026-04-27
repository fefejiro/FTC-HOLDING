export const dynamic = 'force-static';
import type { Metadata } from "next";
import GardenImagePanel from "../../components/garden-cleaners/GardenImagePanel";
import GardenQuoteForm from "../../components/garden-cleaners/GardenQuoteForm";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export const metadata: Metadata = {
  title: 'Contact Garden Cleaners | Oshawa, Ontario',
  description:
    'Contact Garden Cleaners for residential or commercial cleaning service in Oshawa, Ontario and surrounding areas.',
  alternates: { canonical: 'https://gardencleaners.ca/garden-cleaners/contact' }
};

export default function GardenContactPage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <div className="garden-contact-grid">
          <section>
            <h1>Contact Garden Cleaners</h1>
            <p className="page-intro">
              Reach out for scheduling questions, service availability, or a quick quote for your home, office, or property turnover clean.
            </p>
            <div className="card garden-contact-card">
              <h2>Contact details</h2>
              <p><strong>Phone:</strong> <a href={gardenCleanersConfig.phoneHref}>{gardenCleanersConfig.phoneDisplay}</a></p>
              <p><strong>Email:</strong> <a href={gardenCleanersConfig.emailHref}>{gardenCleanersConfig.email}</a></p>
              <p><strong>Location:</strong> {gardenCleanersConfig.addressLine}</p>
              <div className="garden-hours-block">
                <p><strong>Business hours</strong></p>
                <ul>
                  {gardenCleanersConfig.businessHours.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="muted">Service area includes Oshawa, Durham Region, and nearby communities based on scheduling availability.</p>
            </div>
            <GardenImagePanel asset={gardenCleanersConfig.media.contact} className="garden-contact-media" />
          </section>

          <section className="card garden-contact-form-card">
            <h2>Request a quote</h2>
            <p className="muted">Share the basics and Garden Cleaners will follow up with the right next step.</p>
            <GardenQuoteForm source="contact_page" />
          </section>
        </div>
      </div>
    </div>
  );
}
