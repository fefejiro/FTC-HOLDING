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
          <h1>SayWetin</h1>
          <p className="lead">
            SayWetin is a Nigerian music AI product built by Una Labs to translate lyrics,
            slang, and cultural context into plain-language insight.
          </p>
          <p className="page-intro">{sayWetin.summary}</p>
        </div>
        <BrandVideoPanel
          src="/images/brand/saywetin-showcase.mp4"
          title="SayWetin animated showcase"
          aspect="wide"
          preload="metadata"
          caption={
            <>
              <p className="card-kicker">Contained Showcase</p>
              <p className="muted">
                Muted ambient motion preview for the SayWetin product surface, kept contained
                to avoid distracting from the page copy.
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
          <Link href="/work/saywetin" className="inline-link">
            Read full SayWetin case study
          </Link>
        </p>
      </section>
    </article>
  );
}
