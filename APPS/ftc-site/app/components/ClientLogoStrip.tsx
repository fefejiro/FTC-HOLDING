"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { clientLogos, clientMetrics, type ClientMetric } from "../../lib/clientLogos";

function formatMetric(metric: ClientMetric, value: number) {
  const rounded = Math.round(value);
  return `${metric.prefix ?? ""}${rounded}${metric.suffix ?? ""}`;
}

export default function ClientLogoStrip() {
  const metricsRef = useRef<HTMLDivElement | null>(null);
  const [counts, setCounts] = useState<number[]>(() => clientMetrics.map(() => 0));
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = metricsRef.current;
    if (!element || hasAnimated) {
      return;
    }

    let rafId = 0;
    const durationMs = 1100;
    const targets = clientMetrics.map((metric) => metric.value);

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        setHasAnimated(true);
        const start = performance.now();

        const step = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCounts(targets.map((target) => target * eased));
          if (progress < 1) {
            rafId = window.requestAnimationFrame(step);
          }
        };

        rafId = window.requestAnimationFrame(step);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [hasAnimated]);

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

        <div ref={metricsRef} className="client-metrics-strip" aria-label="Studio delivery metrics">
          {clientMetrics.map((metric, index) => (
            <article key={metric.label} className="client-metric-card">
              <p className="client-metric-value">{formatMetric(metric, counts[index] || 0)}</p>
              <p className="client-metric-label">{metric.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
