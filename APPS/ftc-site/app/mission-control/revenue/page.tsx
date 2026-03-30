import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import RevenueOpsConsole from "@/app/components/RevenueOpsConsole";
import { OPS_SITE_URL } from "@/lib/site";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Revenue Ops | Una Labs",
  description:
    "Internal revenue operations console for pipeline stage recording and weekly funnel review.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RevenueOpsPage() {
  if (process.env.NODE_ENV !== "development") {
    const accessJwt = headers().get("cf-access-jwt-assertion");
    if (!accessJwt) {
      redirect(`${OPS_SITE_URL}/`);
    }
  }

  return (
    <div className="container page-content mission-control-page revenue-ops-page">
      <section className="hero mission-control-hero revenue-ops-hero">
        <div className="hero-noise" aria-hidden="true" />
        <div className="mission-control-hero-grid">
          <div className="hero-copy mission-control-copy">
            <p className="eyebrow">Revenue ops</p>
            <h1>Close the loop from request ID to real commercial movement.</h1>
            <p className="lead hero-subtitle">
              The public site now tracks ATEAM starts, handoffs, and intake submissions. This
              private surface records what happens next: qualification, calls, proposals, and won/lost outcomes.
            </p>
            <p className="hero-description">
              Keep this simple. If the lead is real, mark the next commercial step quickly and use
              the weekly review to decide what to fix in the funnel.
            </p>
            <div className="hero-actions">
              <Link href="/mission-control" className="btn btn-secondary">
                Back to mission control
              </Link>
              <Link href="/work" className="btn btn-primary">
                Review public proof
              </Link>
            </div>
          </div>

          <div className="card mission-control-summary-card">
            <p className="status-pill">REVIEW CADENCE</p>
            <h2>What this page is for</h2>
            <ul className="feature-list compact-feature-list mission-control-list">
              <li>Record downstream movement against the intake request ID</li>
              <li>See which offer path is creating real commercial momentum</li>
              <li>Spot where qualified leads stall before calls or proposals</li>
              <li>Use weekly review to tighten proof, offer framing, and follow-up timing</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Internal utility</p>
          <h2>Pipeline updater</h2>
          <p>Use this instead of leaving stage movement buried in chat or email threads.</p>
        </div>
        <RevenueOpsConsole />
      </section>

      <section className="section">
        <article className="card mission-control-panel mission-control-panel-strong">
          <p className="eyebrow">One-week review</p>
          <h2>What to look at after the first 7 days</h2>
          <ul className="feature-list compact-feature-list mission-control-list">
            <li>Which source produces more qualified leads: direct intake or ATEAM workflow?</li>
            <li>Which offer gets selected most often before calls are booked?</li>
            <li>How quickly are successful leads marked qualified after submission?</li>
            <li>Do the strongest proof pages match the offers that are actually closing?</li>
            <li>Where is the bottleneck: qualification, booking, proposal, or close?</li>
          </ul>
          <div className="hero-actions">
            <Link href="/work-with-ftc" className="btn btn-secondary">
              Open project intake
            </Link>
            <a
              href="https://github.com/fefejiro/FTC-HOLDING/blob/main/APPS/ftc-site/docs/UNALABS_WEEKLY_FUNNEL_REVIEW.md"
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open review guide
            </a>
          </div>
        </article>
      </section>
    </div>
  );
}
