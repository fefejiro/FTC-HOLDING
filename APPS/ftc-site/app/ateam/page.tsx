import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AteamDemoClient from "./AteamDemoClient";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "ATEAM is the guided lab system behind Una Labs, turning rough ideas into structured execution plans.",
  alternates: {
    canonical: "/ateam"
  }
};

const workflowStages = [
  {
    title: "Project Intake",
    description: "Capture goals, constraints, and success metrics before scope drifts."
  },
  {
    title: "Routing & Scope",
    description: "Match the request to the right build lane and sequence the work."
  },
  {
    title: "Specialist Pass",
    description: "Assign research, UX, and execution planning to the right roles."
  },
  {
    title: "Structured Output",
    description: "Deliver a clear plan, stack recommendation, and next-step checklist."
  }
];

const ateamHighlights = [
  "Guided intake and brief structuring",
  "Workflow routing across specialized roles",
  "Build-ready outputs instead of vague notes",
  "CTA-ready handoff into a scoped project"
];

export default function AteamPage() {
  return (
    <article className="container page-content ateam-page">
      <section className="ateam-section ateam-hero">
        <div className="ateam-hero-mark" aria-hidden="true">
          <Image
            src="/images/brand/ATeam Logo.png"
            alt=""
            width={64}
            height={64}
            priority
          />
        </div>
        <p className="eyebrow">ATEAM Public Demo</p>
        <h1>ATEAM</h1>
        <p className="lead">
          ATEAM is the guided lab system behind Una Labs. It turns raw ideas into
          structured execution plans without exposing internal admin tooling.
        </p>
        <div className="ateam-hero-grid">
          <div className="ateam-hero-copy">
            <p>
              Use this demo to see how Una Labs frames scope, routes work, and prepares
              delivery-ready outputs before any build starts.
            </p>
            <ul className="ateam-hero-list">
              {ateamHighlights.map((item) => (
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
          <div className="card ateam-demo-card">
            <p className="card-kicker">Interactive demo</p>
            <AteamDemoClient />
          </div>
        </div>
      </section>

      <section className="ateam-section">
        <div className="section-heading">
          <p className="eyebrow">Workflow Preview</p>
          <h2>How the lab routes work</h2>
          <p>ATEAM keeps delivery clear by moving ideas through a consistent flow.</p>
        </div>
        <div className="ateam-flow-grid">
          {workflowStages.map((stage) => (
            <article key={stage.title} className="card ateam-flow-card">
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ateam-section">
        <article className="card ateam-output-card">
          <p className="eyebrow">What you get</p>
          <h2>Structured output you can act on</h2>
          <p className="muted">
            Expect a clear summary, suggested stack, phased plan, and next steps
            that reduce ambiguity for decision-makers and builders.
          </p>
        </article>
      </section>

      <section className="ateam-section">
        <article className="card final-cta-card">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Ready to move an idea into execution?</h2>
            <p className="muted">
              ATEAM becomes even sharper once your scope, constraints, and delivery
              windows are defined with the studio.
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
