import Link from "next/link";
import PolarImagePanel from "./PolarImagePanel";
import { polarAnchorConfig } from "../../../lib/polarAnchor";

export default function PolarOperationsFeature() {
  const feature = polarAnchorConfig.operationsFeature;

  return (
    <section className="section polar-section polar-feature-section">
      <div className="polar-feature-grid">
        <div className="polar-feature-copy card">
          <p className="polar-kicker">{feature.eyebrow}</p>
          <h2>{feature.title}</h2>
          <p className="polar-lead">{feature.body}</p>
          <ul className="feature-list compact-feature-list polar-feature-list">
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

        <PolarImagePanel asset={polarAnchorConfig.media.operations} className="polar-feature-media" />
      </div>
    </section>
  );
}
