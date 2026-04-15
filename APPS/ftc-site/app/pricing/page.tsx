export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Una Labs",
  description:
    "One focused package. We scope, build, and ship your Version 1 in one month — then support it for a month after launch.",
  alternates: {
    canonical: "https://unalabs.cloud/pricing"
  }
};

export default function PricingPage() {
  return (
    <div className="pricing-page main-shell">
      <section className="section section-hero">
        <div className="container">
          <div className="pricing-hero">
            <p className="eyebrow">Transparent pricing</p>
            <h1>One package. One month. One shipped product.</h1>
            <p className="lead">
              We don't do retainers, scope creep, or surprise invoices. You get a focused
              Version 1 build and a full month of support — nothing more, nothing less.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pricing-grid">
            <div className="pricing-card pricing-card--featured">
              <div className="pricing-card-header">
                <p className="pricing-card-label">App Development Package</p>
                <div className="pricing-card-price">
                  <span className="pricing-card-from">Starting at</span>
                  <span className="pricing-card-amount">$3,999</span>
                  <span className="pricing-card-currency">USD</span>
                </div>
              </div>

              <div className="pricing-card-body">
                <ul className="pricing-feature-list">
                  <li>
                    <span className="pricing-feature-check">✓</span>
                    <div>
                      <strong>1-month focused build</strong>
                      <p>Version 1 scoped, designed, and shipped in 30 days</p>
                    </div>
                  </li>
                  <li>
                    <span className="pricing-feature-check">✓</span>
                    <div>
                      <strong>1 month complimentary support</strong>
                      <p>Post-launch monitoring, fixes, and guidance included</p>
                    </div>
                  </li>
                  <li>
                    <span className="pricing-feature-check">✓</span>
                    <div>
                      <strong>Structured intake process</strong>
                      <p>We scope your project before a single line is written</p>
                    </div>
                  </li>
                  <li>
                    <span className="pricing-feature-check">✓</span>
                    <div>
                      <strong>Production deployment</strong>
                      <p>Live, hosted, and configured for real users</p>
                    </div>
                  </li>
                  <li>
                    <span className="pricing-feature-check">✓</span>
                    <div>
                      <strong>Founder-direct communication</strong>
                      <p>No account managers or handoffs — Mike builds it</p>
                    </div>
                  </li>
                </ul>

                <div className="pricing-deposit-note">
                  <p>
                    Not ready to pay in full? Start with a{" "}
                    <strong>$999 deposit</strong> to lock in your spot and begin intake.
                    The remaining balance is due before build starts.
                  </p>
                </div>

                <Link href="/start" className="btn btn-primary pricing-cta">
                  Start Your Build
                </Link>
                <p className="pricing-cta-sub">
                  Takes 5 minutes. No commitment until payment.
                </p>
              </div>
            </div>

            <div className="pricing-side">
              <div className="pricing-faq-card card">
                <h3>Common questions</h3>
                <div className="pricing-faq-list">
                  <div className="pricing-faq-item">
                    <strong>What counts as Version 1?</strong>
                    <p>
                      The core user flow — the thing that needs to work for your first real users.
                      We scope it together during intake so there are no surprises.
                    </p>
                  </div>
                  <div className="pricing-faq-item">
                    <strong>What if my project needs more?</strong>
                    <p>
                      We discuss scope honestly upfront. Complex projects may require a higher
                      starting price — we'll tell you before you pay anything.
                    </p>
                  </div>
                  <div className="pricing-faq-item">
                    <strong>What's the deposit for?</strong>
                    <p>
                      It locks in your place in the build queue and kicks off the intake process.
                      The remaining $3,000 is due before build work begins.
                    </p>
                  </div>
                  <div className="pricing-faq-item">
                    <strong>What tech stack do you use?</strong>
                    <p>
                      Depends on your project. Typically Next.js, React Native, Railway, Cloudflare.
                      Thin, durable stacks that don't need babysitting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pricing-trust-card card">
                <h3>Built by Una Labs</h3>
                <p>
                  PeacePad, SayWetin, and Dispatch are all production-deployed products built
                  and maintained solo. This isn't an agency pitch — it's the same system we
                  use for our own products, applied to yours.
                </p>
                <Link href="/work" className="inline-link" prefetch={false}>
                  View client launches →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pricing-bottom-cta card">
            <h2>Ready to build?</h2>
            <p>
              Fill out the intake form. We'll review your project and confirm fit before
              you're charged anything.
            </p>
            <Link href="/start" className="btn btn-primary">
              Start Your Build
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
