import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <article className="container page-content case-study">
      <h1>PeacePad</h1>
      <p className="lead">
        PeacePad is an AI communication platform that helps users pause, review tone, and
        choose better outcomes before sending high-stakes messages.
      </p>
      <p className="page-intro">{peacePad.summary}</p>

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
          <Link href="/work/peacepad" className="inline-link">
            Read full PeacePad case study
          </Link>
        </p>
      </section>
    </article>
  );
}
