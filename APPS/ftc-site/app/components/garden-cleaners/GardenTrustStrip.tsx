import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenTrustStrip() {
  return (
    <section className="garden-trust-strip" aria-label="Garden Cleaners trust signals">
      {gardenCleanersConfig.trustBullets.map((bullet) => (
        <div key={bullet} className="garden-trust-pill">{bullet}</div>
      ))}
    </section>
  );
}
