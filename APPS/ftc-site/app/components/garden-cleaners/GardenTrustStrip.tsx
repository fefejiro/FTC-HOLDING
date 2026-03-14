import GardenImagePanel from "./GardenImagePanel";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenTrustStrip() {
  return (
    <section className="section garden-section garden-trust-section" aria-label="Garden Cleaners trust signals">
      <div className="garden-trust-grid">
        <article className="card garden-trust-copy">
          <p className="garden-panel-kicker">Why clients choose Garden Cleaners</p>
          <h2>Dependable cleaning led by people who care about presentation, timing, and trust.</h2>
          <p>
            Garden Cleaners is designed for clients who want a professional team, straightforward communication, and a cleaner space without unnecessary friction.
          </p>
        </article>
        <GardenImagePanel asset={gardenCleanersConfig.media.trust} className="garden-trust-media" />
      </div>
      <div className="garden-trust-strip">
        {gardenCleanersConfig.trustBullets.map((bullet) => (
          <div key={bullet} className="garden-trust-pill">{bullet}</div>
        ))}
      </div>
    </section>
  );
}
