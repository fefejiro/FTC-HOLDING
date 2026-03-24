import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AteamDemoClient from "./AteamDemoClient";
import { ateamModeHighlights, ateamModeStages, ateamModeSummary } from "../../lib/ateamMode";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "ATEAM inside Una Labs keeps Memory, Office, Team, and Factory visible from the first idea to the build handoff.",
  alternates: {
    canonical: "/ateam"
  }
};

export default function AteamPage() {
  return (
    <article className="container page-content ateam-page">
      <section className="ateam-section ateam-section--hero">
        <div className="ateam-hero-topline">
          <div className="ateam-hero-mark" aria-hidden="true">
            <Image
              src="/images/brand/ATeam Logo.png"
              alt=""
              width={64}
              height={64}
              priority
            />
          </div>
          <div className="ateam-hero-heading">
            <p className="eyebrow">Inside ATEAM</p>
            <h1>ATEAM inside Una Labs keeps the path from idea to handoff visible.</h1>
            <p className="lead">
              This is not a generic four-step explainer. It is the public-facing shell of the same
              Memory, Office, Team, and Factory surfaces that shape ATEAM itself inside Una Labs.
            </p>
          </div>
        </div>

        <div className="ateam-hero-grid">
          <div className="card ateam-hero-story">
            <p className="card-kicker">Inside Una Labs</p>
            <div className="ateam-hero-surface-preview">
              <img
                src="/images/brand/Calender Ateam.png"
                alt="ATEAM calendar and routing surface inside Una Labs"
              />
            </div>
            <p>
              {ateamModeSummary} Una Labs exposes a controlled version of that system publicly so
              people can feel the product, not just read a step list about it.
            </p>
            <ul className="ateam-hero-list">
              {ateamModeHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="hero-actions">
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
                Start a Project
              </Link>
              <Link href="/work" prefetch={false} className="btn btn-secondary">
                View Client Launches
              </Link>
            </div>
          </div>

          <article className="card ateam-demo-card">
            <div className="ateam-demo-card-head">
              <div>
                <p className="card-kicker">Interactive demo</p>
                <h2>Run an ATEAM pass on your idea</h2>
              </div>
              <span className="ateam-demo-hint">Inside one system: Memory, Office, Team, Factory</span>
            </div>
            <AteamDemoClient />
          </article>
        </div>
      </section>

      <section className="ateam-section">
        <div className="section-heading">
          <p className="eyebrow">ATEAM inside Una Labs</p>
          <h2>Memory, Office, Team, and Factory are product surfaces, not stage labels.</h2>
          <p>
            The public demo stays lighter than the private runtime, but the language and the feel
            now follow the real ATEAM surfaces instead of generic numbered steps.
          </p>
        </div>
        <div className="ateam-flow-grid">
          {ateamModeStages.map((stage) => {
            const tone = stage.title.toLowerCase();

            return (
              <article key={stage.title} className={`card ateam-flow-card ateam-flow-card--${tone}`}>
                <div className={`ateam-surface-visual ateam-surface-visual--${tone}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p className="ateam-surface-eyebrow">{stage.eyebrow}</p>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
                <p className="ateam-surface-note">{stage.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ateam-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Want to turn the demo output into a real scoped request?</h2>
            <p className="muted">
              Continue with the idea after the demo, or jump straight into intake if you already
              know the project you want to launch.
            </p>
          </div>
          <div className="product-actions">
            <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
              Start a Project
            </Link>
            <Link href="/products" prefetch={false} className="btn btn-secondary">
              View Products
            </Link>
          </div>
        </article>
      </section>
    </article>
  );
}
