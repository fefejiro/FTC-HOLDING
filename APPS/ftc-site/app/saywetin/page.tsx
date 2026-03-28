export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandVideoPanel from "../components/BrandVideoPanel";
import { getProjectCaseStudy } from "../../lib/content";

const sayWetin = getProjectCaseStudy("saywetin");

export const metadata: Metadata = {
  title: "SayWetin | Una Labs",
  description:
    "SayWetin is the Una Labs Nigerian music AI product for audio recognition, lyric meaning, and cultural context.",
  alternates: {
    canonical: "/saywetin"
  }
};

export default function SayWetinPage() {
  if (!sayWetin) notFound();

  return (
    <article className="container page-content case-study">
      <div className="product-hero-layout fade-on-scroll">
        <div className="product-hero-copy">
          {sayWetin.availabilityLabel ? <span className="status-pill">{sayWetin.availabilityLabel}</span> : null}
          <h1>SayWetin</h1>
          <p className="lead">
            SayWetin is a Nigerian music AI product built by Una Labs to translate lyrics,
            slang, and cultural context into plain-language insight.
          </p>
          <p className="page-intro">{sayWetin.summary}</p>
          <div className="hero-actions">
            {sayWetin.googlePlayUrl ? (
              <a
                href={sayWetin.googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Get it on Google Play
              </a>
            ) : null}
            <Link href="/work/saywetin" className="btn btn-secondary">
              Read case study
            </Link>
          </div>
        </div>
        <BrandVideoPanel
          src="/images/brand/saywetin-showcase.mp4"
          poster="/images/brand/saywetin-og.png"
          title="SayWetin animated showcase"
          aspect="wide"
          preload="metadata"
          controls
          overlay={
            <div className="hero-media-note">
              <p className="card-kicker">SayWetin Demo Reel</p>
              <strong>Watch the product motion treatment directly on the page.</strong>
            </div>
          }
          caption={
            <>
              <p className="card-kicker">Product Demo</p>
              <p className="muted">
                Demo-style motion preview for SayWetin, with controls exposed so the product
                reel is clearly visible and reviewable.
              </p>
            </>
          }
        />
      </div>

      <section>
        <h2>What It Solves</h2>
        <p>{sayWetin.sections.problem}</p>
      </section>

      <section>
        <h2>How It Works</h2>
        <p>{sayWetin.sections.solution}</p>
      </section>

      <section>
        <h2>Explore More</h2>
        <p>
          Pair this Nigerian music AI capability with the{" "}
          <Link href="/peacepad" className="inline-link">
            AI communication platform
          </Link>
          , browse the <Link href="/work" className="inline-link">work</Link> archive, and
          learn more on the <Link href="/about" className="inline-link">about page</Link>.
        </p>
        <p className="section-link-row">
          <Link href="/work/saywetin" prefetch={false} className="inline-link">
            Read full SayWetin case study
          </Link>
        </p>
      </section>
    </article>
  );
}
