import PolarImagePanel from "./PolarImagePanel";
import { polarAnchorConfig } from "../../../lib/polarAnchor";

export default function PolarTrustStrip() {
  return (
    <section className="section polar-section polar-trust-section" aria-label="Polar Anchor trust signals">
      <div className="polar-trust-grid">
        <article className="card polar-trust-copy">
          <p className="polar-panel-kicker">Why choose Polar Anchor</p>
          <h2>Trustworthy, efficient logistics support for real commercial movement.</h2>
          <p>
            Polar Anchor is positioned for importers, exporters, dealers, and SMEs who need a partner that can coordinate freight, customs, transport, and warehousing in a seamless and professional manner.
          </p>
        </article>
        <PolarImagePanel asset={polarAnchorConfig.media.trust} className="polar-trust-media" />
      </div>
      <div className="polar-trust-strip">
        {polarAnchorConfig.trustBullets.map((bullet) => (
          <div key={bullet} className="polar-trust-pill">{bullet}</div>
        ))}
      </div>
    </section>
  );
}
