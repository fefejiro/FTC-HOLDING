import CTABanner from "../components/CTABanner";
import CapabilityCard from "../components/CapabilityCard";
import { capabilities } from "../../lib/content";

export const metadata = {
  title: "Studio | Una Labs",
  description: "AI systems, creative technology, and business intelligence capabilities at Una Labs."
};

export default function CapabilitiesPage() {
  return (
    <div className="container page-content">
      <h1>Studio</h1>
      <p className="page-intro">
        Una Labs combines engineering rigor and creative execution to deliver capability-led
        systems that can evolve into reusable platform modules.
      </p>

      <div className="cards-grid cards-grid-3">
        {capabilities.map((capability) => (
          <CapabilityCard key={capability.slug} capability={capability} />
        ))}
      </div>

      <CTABanner
        title="Need one of these capabilities in your workflow?"
        description="We can integrate directly into existing operations or build net-new products."
        primaryLabel="Start a Project"
        primaryHref="/work-with-ftc"
      />
    </div>
  );
}
