"use client";

import { useState, useEffect, useRef } from "react";

const FEATURES = [
  {
    icon: "📋",
    label: "Intake & Scoping",
    benefit: "Rough requests become structured briefs in 48 hours."
  },
  {
    icon: "📊",
    label: "Real-Time Dashboard",
    benefit: "Every project visible — status, gates, timeline."
  },
  {
    icon: "📄",
    label: "Proposals & Pricing",
    benefit: "One clear offer. No negotiation theatre."
  },
  {
    icon: "✅",
    label: "Approval Gates",
    benefit: "Client signs off before money or work moves forward."
  },
  {
    icon: "💳",
    label: "Stripe Payments",
    benefit: "Deposit collected upfront. No chasing invoices."
  },
  {
    icon: "🔗",
    label: "Delivery Proof",
    benefit: "Every output documented. Handoff-ready from day one."
  },
  {
    icon: "🤖",
    label: "AI Automation",
    benefit: "Intake, brief generation, and notifications automated."
  },
  {
    icon: "📈",
    label: "Reporting",
    benefit: "Impact documented. Reusable across engagements."
  }
] as const;

export default function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const total = FEATURES.length;

  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused.current) {
        setActive((prev) => (prev + 1) % total);
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [total]);

  return (
    <section className="section feature-carousel-section">
      <div className="container">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">What ATEAM handles</p>
          <h2>From rough request to paid delivery — all of it.</h2>
        </div>

        <div
          className="feature-carousel-track"
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { paused.current = false; }}
        >
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              className={`feature-card${i === active ? " feature-card--active" : ""}`}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              type="button"
            >
              <span className="feature-card-icon" aria-hidden="true">{f.icon}</span>
              <strong className="feature-card-label">{f.label}</strong>
              <p className="feature-card-benefit">{f.benefit}</p>
            </button>
          ))}
        </div>

        <div className="feature-carousel-dots" role="tablist" aria-label="Feature navigation">
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              className={`carousel-dot${i === active ? " carousel-dot--active" : ""}`}
              onClick={() => setActive(i)}
              aria-selected={i === active}
              aria-label={f.label}
              role="tab"
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
