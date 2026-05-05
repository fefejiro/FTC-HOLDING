import Link from "next/link";
import GardenImagePanel from "./GardenImagePanel";
import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenDeepCleaningFeature() {
  const feature = gardenCleanersConfig.deepCleaningFeature;

  return (
    <section className="section garden-section garden-feature-section">
      <div className="garden-feature-grid">
        <div className="garden-feature-copy card">
          <p className="garden-kicker">{feature.eyebrow}</p>
          <h2>{feature.title}</h2>
          <p className="garden-lead">{feature.body}</p>
          <ul className="feature-list compact-feature-list garden-feature-list">
            {feature.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="hero-actions">
            <Link href={feature.primaryCta.href} prefetch={false} className="btn btn-primary">
              {feature.primaryCta.label}
            </Link>
            <Link href={feature.secondaryCta.href} prefetch={false} className="btn btn-secondary">
              {feature.secondaryCta.label}
            </Link>
          </div>
        </div>

        <GardenImagePanel asset={gardenCleanersConfig.media.deepCleaning} className="garden-feature-media" />
      </div>
    </section>
  );
}
