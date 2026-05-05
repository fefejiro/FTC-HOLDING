export default function HeroMockupStack() {
  return (
    <div className="hero-mockup-stack">
      <div className="hero-mockup-glow" aria-hidden="true" />

      {/* Card 3 — deepest / Delivery proof */}
      <div className="hero-mockup-card hero-mockup-card--3" aria-hidden="true">
        <span className="hero-mockup-kicker">03 · Delivery proof</span>
        <ul className="hero-mockup-checks">
          <li><span className="hero-mockup-check">✓</span> Scope documented</li>
          <li><span className="hero-mockup-check">✓</span> Client sign-off recorded</li>
          <li><span className="hero-mockup-check">✓</span> Handoff package ready</li>
        </ul>
        <span className="hero-mockup-ts">Completed · Apr 30, 2026</span>
      </div>

      {/* Card 2 — mid / Proposal */}
      <div className="hero-mockup-card hero-mockup-card--2" aria-hidden="true">
        <span className="hero-mockup-kicker">02 · Proposal</span>
        <div className="hero-mockup-price-row">
          <span className="hero-mockup-price">$2,500</span>
          <span className="hero-mockup-badge">Scoped</span>
        </div>
        <div className="hero-mockup-field" />
        <div className="hero-mockup-field hero-mockup-field--short" />
      </div>

      {/* Card 1 — top / Intake */}
      <div className="hero-mockup-card hero-mockup-card--1" aria-hidden="true">
        <span className="hero-mockup-kicker">01 · Intake</span>
        <div className="hero-mockup-field" />
        <div className="hero-mockup-field hero-mockup-field--short" />
        <div className="hero-mockup-field hero-mockup-field--xshort" />
        <span className="hero-mockup-tag">Request received</span>
      </div>
    </div>
  );
}
