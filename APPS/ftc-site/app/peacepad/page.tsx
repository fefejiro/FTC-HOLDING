export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandImagePanel from "../components/BrandImagePanel";
import BrandVideoPanel from "../components/BrandVideoPanel";
import ProductStatusBadge from "../components/ProductStatusBadge";
import { getProjectCaseStudy } from "../../lib/content";

const peacePad = getProjectCaseStudy("peacepad");

export const metadata: Metadata = {
  title: "PeacePad | Una Labs",
  description:
    "PeacePad is the Una Labs AI communication platform for calmer, more constructive conversations.",
  alternates: {
    canonical: "/peacepad"
  }
};

export default function PeacePadPage() {
  if (!peacePad) notFound();

  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <article className="container case-study">
      <div className="product-hero-layout fade-on-scroll">
        <div className="product-hero-copy">
          <div className="product-hero-top">
            <ProductStatusBadge status={peacePad.status} />
          </div>
          <h1>PeacePad</h1>
          <p className="sunrise-lead">
            PeacePad is an AI communication platform that helps users pause, review tone, and
            choose better outcomes before sending high-stakes messages.
          </p>
          <p className="sunrise-lead">{peacePad.summary}</p>
          <div className="hero-actions">
            {peacePad.googlePlayUrl ? (
              <a
                href={peacePad.googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Get it on Google Play
              </a>
            ) : null}
            <Link href="/work/peacepad" className="btn btn-secondary">
              Read case study
            </Link>
          </div>
        </div>
        <div className="product-media-stack">
          <BrandVideoPanel
            src="/images/brand/unalabs-hero.mp4"
            poster="/images/brand/peacepad-directory-03-compose.png"
            title="PeacePad product demo reel"
            aspect="wide"
            preload="metadata"
            controls
            overlay={
              <div className="hero-media-note">
                <p className="card-kicker">PeacePad Demo Reel</p>
                <strong>See the product framed as a calm, premium intervention experience.</strong>
              </div>
            }
            caption={
              <>
                <p className="card-kicker">Product Demo</p>
                <p className="muted">
                  Motion treatment presenting PeacePad like a product demo surface rather
                  than a static concept card.
                </p>
              </>
            }
          />
          <BrandImagePanel
            src="/images/brand/peacepad-directory-03-compose.png"
            alt="PeacePad premium product concept visual"
            aspect="wide"
            sizes="(max-width: 980px) 100vw, 44vw"
            caption={
              <>
                <p className="card-kicker">Support Visual</p>
                <p className="muted">
                  A premium concept treatment positioning PeacePad as a calm intervention
                  layer for difficult conversations.
                </p>
              </>
            }
          />
        </div>
      </div>

      <section>
        <h2>What It Solves</h2>
        <p>{peacePad.sections.problem}</p>
      </section>

      <section>
        <h2>How It Works</h2>
        <p>{peacePad.sections.solution}</p>
      </section>

      <section>
        <h2>Explore More</h2>
        <p>
          Compare this AI communication platform with{" "}
          <Link href="/saywetin" className="inline-link">
            Nigerian music AI
          </Link>{" "}
          at Una Labs, browse the <Link href="/work" className="inline-link">work</Link>{" "}
          archive, or read the studio story on the{" "}
          <Link href="/about" className="inline-link">
            about page
          </Link>.
        </p>
        <p className="section-link-row">
          <Link href="/work/peacepad" prefetch={false} className="inline-link">
            Read full PeacePad case study
          </Link>
        </p>
      </section>
      </article>
    </div>
  );
}
