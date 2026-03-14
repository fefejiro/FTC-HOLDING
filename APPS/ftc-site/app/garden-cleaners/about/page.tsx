import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import GardenImagePanel from "../../components/garden-cleaners/GardenImagePanel";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export const metadata: Metadata = {
  title: 'About Garden Cleaners | Oshawa Cleaning Company',
  description:
    'Learn about Garden Cleaners, a locally focused cleaning company serving Oshawa, Ontario with dependable residential and commercial cleaning services.',
  alternates: { canonical: 'https://unalabs.cloud/garden-cleaners/about' }
};

export default function GardenAboutPage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <div className="garden-showcase-grid garden-about-intro-grid">
          <section>
            <h1>About Garden Cleaners</h1>
            <p className="page-intro">
              Garden Cleaners is a professional cleaning service focused on dependable work, practical communication, and spotless results for clients across Oshawa and nearby areas.
            </p>
          </section>
          <GardenImagePanel asset={gardenCleanersConfig.media.about} className="garden-showcase-media" />
        </div>

        <section className="garden-copy-stack">
          <article className="card"><h2>Who we are</h2><p>Garden Cleaners serves homeowners, offices, property managers, and move-related projects with cleaning support designed to be reliable, straightforward, and easy to book.</p></article>
          <article className="card"><h2>Our commitment to quality</h2><p>The goal is simple: show up on time, clean thoroughly, and leave the space in better shape than clients expect.</p></article>
          <article className="card"><h2>Why clients choose us</h2><p>Clients choose Garden Cleaners for flexible scheduling, attention to detail, and a professional approach that works for both residential and commercial spaces.</p></article>
          <article className="card"><h2>Service area</h2><p>Garden Cleaners is based in {gardenCleanersConfig.locationCity}, {gardenCleanersConfig.locationRegion}, and serves Durham Region with practical, locally focused support.</p></article>
        </section>

        <CTABanner title="Ready to book with a local cleaning team?" description="Tell us what kind of property you need cleaned and we will help you scope the right service." primaryLabel="Request a Quote" primaryHref="/garden-cleaners/quote" secondaryLabel="View Services" secondaryHref="/garden-cleaners/services" />
      </div>
    </div>
  );
}
