import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../components/CTABanner";
import GardenFaqList from "../components/garden-cleaners/GardenFaqList";
import GardenHero from "../components/garden-cleaners/GardenHero";
import GardenServiceCard from "../components/garden-cleaners/GardenServiceCard";
import GardenTestimonials from "../components/garden-cleaners/GardenTestimonials";
import GardenTrustStrip from "../components/garden-cleaners/GardenTrustStrip";
import { gardenServices } from "../../lib/gardenCleaners";

export const metadata: Metadata = {
  title: 'Garden Cleaners | Professional Cleaning Services in Oshawa, Ontario',
  description:
    'Garden Cleaners provides reliable residential and commercial cleaning services in Oshawa, Ontario. Get a free quote for professional, spotless cleaning.',
  alternates: { canonical: 'https://unalabs.cloud/garden-cleaners' }
};

export default function GardenCleanersHomePage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <GardenHero />
        <GardenTrustStrip />

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Services overview</p>
            <h2>Professional cleaning support for homes, offices, and property turnover.</h2>
            <p>
              Garden Cleaners supports residential clients, commercial spaces, move-related cleaning, and detailed reset work across Oshawa and surrounding areas.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {gardenServices.slice(0, 6).map((service) => (
              <GardenServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </section>

        <section className="section garden-section">
          <div className="garden-split-grid">
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Residential</p>
              <h2>Dependable home cleaning built around real schedules.</h2>
              <p>
                From recurring upkeep to deep cleaning before guests, listings, or a fresh start, the service is built to keep homes clean without adding stress.
              </p>
              <Link href="/garden-cleaners/quote" prefetch={false} className="inline-link">Get a residential quote</Link>
            </article>
            <article className="card garden-split-card">
              <p className="garden-panel-kicker">Commercial</p>
              <h2>Professional cleaning for businesses, offices, and managed properties.</h2>
              <p>
                Garden Cleaners works with business owners and property managers who need a clean, reliable environment and a service rhythm they can count on.
              </p>
              <Link href="/garden-cleaners/contact" prefetch={false} className="inline-link">Discuss a commercial plan</Link>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Quality promise</p>
            <h2>Detail-oriented cleaning with a practical, polished finish.</h2>
            <p>
              Whether the job is a family home, office, or turnover clean, the focus stays the same: dependable service, thoughtful detail, and a noticeably cleaner space.
            </p>
          </div>
          <div className="garden-proof-grid">
            <article className="card garden-proof-card">
              <h3>What clients notice</h3>
              <ul className="feature-list compact-feature-list">
                <li>Cleaner high-touch surfaces and shared spaces</li>
                <li>Better presentation for homes, tenants, and offices</li>
                <li>Consistent communication and flexible scheduling</li>
              </ul>
            </article>
            <article className="card garden-proof-card">
              <h3>Where the service fits best</h3>
              <ul className="feature-list compact-feature-list">
                <li>Move-in and move-out preparation</li>
                <li>Recurring home or office support</li>
                <li>Post-construction cleanup and reset</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">Client feedback</p>
            <h2>What clients value about the experience.</h2>
          </div>
          <GardenTestimonials />
        </section>

        <section className="section garden-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions before booking.</h2>
          </div>
          <GardenFaqList />
        </section>

        <CTABanner
          title="Need a cleaning plan that fits your schedule?"
          description="Request a free quote and Garden Cleaners will follow up with the right next step for your property."
          primaryLabel="Get a Free Quote"
          primaryHref="/garden-cleaners/quote"
          secondaryLabel="Contact Garden Cleaners"
          secondaryHref="/garden-cleaners/contact"
        />
      </div>
    </div>
  );
}
