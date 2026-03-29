import Image from "next/image";
import { clientLogos, clientMetrics, type ClientMetric } from "../../lib/clientLogos";

function formatMetric(metric: ClientMetric, value: number) {
  const rounded = Math.round(value);
  return `${metric.prefix ?? ""}${rounded}${metric.suffix ?? ""}`;
}

export default function ClientLogoStrip() {
  const visibleMetrics = clientMetrics.filter((metric) => Number.isFinite(metric.value) && metric.value > 0);

  return (
    <section className="section fade-on-scroll client-logo-section" aria-labelledby="selected-clients-heading">
      <div className="container client-logo-shell">
        <div className="client-logo-copy">
          <p className="eyebrow">Trusted clients</p>
          <h2 id="selected-clients-heading">Trusted by leading organizations</h2>
          <p>Una Labs has delivered consulting and technology work for organizations including:</p>
        </div>

        <div className="client-logo-grid" role="list" aria-label="Selected clients">
          {clientLogos.map((logo) => (
            <div key={logo.name} className="client-logo-card" role="listitem" aria-label={logo.name}>
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                sizes="(max-width: 640px) 76vw, (max-width: 980px) 44vw, 260px"
                className="client-logo-image"
              />
            </div>
          ))}
        </div>

        <div className="client-metrics-strip" aria-label="Studio delivery metrics">
          {visibleMetrics.map((metric) => (
            <article key={metric.label} className="client-metric-card">
              <p className="client-metric-value">{formatMetric(metric, metric.value)}</p>
              <p className="client-metric-label">{metric.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
