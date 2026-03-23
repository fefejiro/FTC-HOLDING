import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AteamDemoClient from "./AteamDemoClient";
import { ateamModeHighlights, ateamModeStages, ateamModeSummary } from "../../lib/ateamMode";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "ATEAM is the AI lab where Memory, Office, Team, and Factory turn rough ideas into clear next steps.",
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
            <p className="eyebrow">ATEAM mode preview</p>
            <h1>ATEAM shows how Memory, Office, Team, and Factory turn rough ideas into next steps.</h1>
            <p className="lead">
              Test an idea, see the ATEAM-mode path it suggests, and continue that output into a
              real project request for Una Labs.
            </p>
          </div>
        </div>

        <div className="ateam-hero-grid">
          <div className="card ateam-hero-story">
            <p className="card-kicker">Why it exists</p>
            <p>
              {ateamModeSummary} Una Labs exposes that path publicly in a controlled way so people
              can understand the system before any build starts.
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
                <h2>Run an ATEAM-mode pass on your idea</h2>
              </div>
              <span className="ateam-demo-hint">Memory, Office, Team, Factory, then a clear handoff</span>
            </div>
            <AteamDemoClient />
          </article>
        </div>
      </section>

      <section className="ateam-section">
        <div className="section-heading">
          <p className="eyebrow">ATEAM mode</p>
          <h2>The four public-facing stages now match the real runtime language</h2>
          <p>
            The public preview stays compact on purpose, but it now names the same operating
            surfaces people will hear about inside ATEAM itself.
          </p>
        </div>
        <div className="ateam-flow-grid">
          {ateamModeStages.map((stage, index) => (
            <article key={stage.title} className="card ateam-flow-card">
              <span className="process-step-number">{index + 1}</span>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
            </article>
          ))}
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
