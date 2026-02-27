import Hero from './components/Hero';
import OverviewCards from './components/OverviewCards';
import CredibilityStrip from './components/CredibilityStrip';
import DifferentiatorSection from './components/DifferentiatorSection';
import VenturesSection from './components/VenturesSection';
import CallToAction from './components/CallToAction';
import { logger } from '../lib/logger';
import { getSupabase } from '../lib/supabase';


// Log page initialization during build/render
if (typeof window === 'undefined') {
  logger.info('HomePage rendering');
}

// verify supabase client imported (will not run on server)
if (typeof window !== 'undefined') {
  const s = getSupabase();
  console.log('supabase client', s);
}

export default function HomePage() {
  return (
    <>
      <section className="section">
        <Hero>
          <h1>From Manual Complexity to Intelligent Systems</h1>
          <p>Our team combines operational experience with applied artificial intelligence to deliver pragmatic outcomes.</p>
        </Hero>
      </section>

      <section className="section">
        <h2>Our Service Pillars</h2>
        <div className="cards-grid">
          <div className="card">
            <h3>Enterprise Systems & Infrastructure Consulting</h3>
            <p className="muted">Practical integration, operational resilience, and governance-ready delivery.</p>
            <a href="/services/enterprise-systems-infrastructure">Learn more</a>
          </div>
          <div className="card">
            <h3>Intelligent Systems & Automation Engineering</h3>
            <p className="muted">Automation and operational intelligence designed for governance and scale.</p>
            <a href="/services/intelligent-systems-automation">Learn more</a>
          </div>
          <div className="card">
            <h3>Product & Technical Architecture Advisory</h3>
            <p className="muted">Architecture that supports clarity, maintainability, and growth.</p>
            <a href="/services/product-technical-architecture">Learn more</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="credibility-strip">
          <p>Incorporated 2019 — experience with LCBO, Canadian Tire, Home Depot, Ontario Ministry</p>
        </div>
      </section>

      <section className="section">
        <DifferentiatorSection />
      </section>

      <section className="section">
        <h2>Founder-led initiatives</h2>
        <div className="ventures">
          <div className="venture-card"><a href="https://peacepad.ca/" target="_blank" rel="noreferrer">PeacePad</a></div>
          <div className="venture-card"><a href="https://saywetin.app/" target="_blank" rel="noreferrer">SayWetin</a></div>
        </div>
      </section>

      <section className="section cta-area">
        <CallToAction />
      </section>
    </>
  );
}