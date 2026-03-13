import type { Metadata } from "next";
import CTABanner from "../../components/CTABanner";
import GardenServiceCard from "../../components/garden-cleaners/GardenServiceCard";
import { gardenServices } from "../../../lib/gardenCleaners";

export const metadata: Metadata = {
  title: 'Cleaning Services | Garden Cleaners Oshawa',
  description:
    'Explore residential, commercial, deep cleaning, move-in, move-out, office, and post-construction cleaning services from Garden Cleaners in Oshawa, Ontario.',
  alternates: { canonical: 'https://unalabs.cloud/garden-cleaners/services' }
};

export default function GardenServicesPage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <h1>Cleaning Services</h1>
        <p className="page-intro">Garden Cleaners offers practical, professional cleaning support for residential and commercial clients in Oshawa and surrounding areas.</p>
        <div className="cards-grid cards-grid-3">
          {gardenServices.map((service) => (
            <GardenServiceCard key={service.slug} service={service} />
          ))}
        </div>
        <CTABanner title="Need help choosing the right cleaning service?" description="Share a few details about the property and timing and we will recommend the right cleaning plan." primaryLabel="Get a Free Quote" primaryHref="/garden-cleaners/quote" secondaryLabel="Contact Garden Cleaners" secondaryHref="/garden-cleaners/contact" />
      </div>
    </div>
  );
}
