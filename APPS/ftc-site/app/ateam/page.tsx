import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AteamDemoClient from "./AteamDemoClient";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "ATEAM is the AI lab where rough ideas become clear next steps. Test an idea, get a structured output, and continue it into a real project request.",
  alternates: {
    canonical: "/ateam"
  }
};

const workflowStages = [
  {
    title: "Idea in",
    description: "You describe the concept, lane, and outcome you want to move toward."
  },
  {
    title: "Lab review",
    description: "ATEAM frames the scope, surfaces the likely direction, and keeps the ask practical."
  },
  {
    title: "Build path",
    description: "The lab turns the idea into phases, deliverables, and a believable next step."
  },
  {
    title: "Next step",
    description: "You continue the structured brief into a real Una Labs project request."
  }
] as const;

const ateamHighlights = [
  "Guided idea intake without exposing internal operator tooling",
  "Believable workflow preview that helps visitors understand what is feasible",
  "Structured output with phases, deliverables, and clear next steps",
  "Clean handoff into Start a Project without retyping the idea"
] as const;

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
            <p className="eyebrow">ATEAM public demo</p>
            <h1>ATEAM is the AI lab where rough ideas become clear next steps.</h1>
            <p className="lead">
              Test an idea, see the build path it suggests, and continue that output into a real
              project request for Una Labs.
            </p>
          </div>
        </div>

        <div className="ateam-hero-grid">
          <div className="card ateam-hero-story">
            <p className="card-kicker">Why it exists</p>
            <p>
              ATEAM gives first-time visitors a safe, curated way to understand how Una Labs thinks
              about scope, sequencing, and delivery before any build starts.
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

          <article className="card ateam-demo-card">
            <div className="ateam-demo-card-head">
              <div>
                <p className="card-kicker">Interactive demo</p>
                <h2>Run a guided lab pass on your idea</h2>
              </div>
              <span className="ateam-demo-hint">Visible output, compact workflow, clear handoff</span>
            </div>
            <AteamDemoClient />
          </article>
        </div>
      </section>

      <section className="ateam-section">
        <div className="section-heading">
          <p className="eyebrow">Workflow preview</p>
          <h2>Short, understandable, and built for first-time visitors</h2>
          <p>
            The public demo stays compact on purpose. It shows how Una Labs structures an idea
            without exposing internal runtime detail.
          </p>
        </div>
        <div className="ateam-flow-grid">
          {workflowStages.map((stage, index) => (
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
