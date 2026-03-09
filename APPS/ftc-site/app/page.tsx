import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "./components/CTABanner";
import CapabilityCard from "./components/CapabilityCard";
import Hero from "./components/Hero";
import ProjectCard from "./components/ProjectCard";
import ServiceCard from "./components/ServiceCard";
import { capabilities, projectCaseStudies, serviceTracks } from "../lib/content";

export const metadata: Metadata = {
  title: "Una Labs — Creative AI Studio Building AI Products",
  description:
    "Una Labs is a creative AI studio building real-world AI products including PeacePad and SayWetin. Explore our work in automation, AI tools, and product innovation.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  const peacePadProject = projectCaseStudies.find((project) => project.slug === "peacepad");
  const sayWetinProject = projectCaseStudies.find((project) => project.slug === "saywetin");

  return (
    <>
      <section className="section section-hero">
        <div className="container">
          <Hero projects={projectCaseStudies} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>AI Product Development</h2>
            <p>
              Una Labs is a creative AI studio shipping product-grade systems that solve
              communication, language, and automation problems in the real world.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {capabilities.map((capability) => (
              <CapabilityCard key={capability.slug} capability={capability} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Automation Systems</h2>
            <p>
              We design automation frameworks, orchestration layers, and AI-enabled
              workflows that reduce manual operations and improve decision quality.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {serviceTracks.map((track) => (
              <ServiceCard key={track.audience} track={track} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Creative AI Studio</h2>
            <p>
              From prototyping to deployment, Una Labs blends product strategy, software
              architecture, and applied AI to deliver tools people use daily.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/about" className="inline-link">
              Learn how Una Labs builds and ships practical AI products
            </Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Products</h2>
            <p>
              Explore the Una Labs product portfolio across PeacePad, SayWetin, and ATEAM.
              Visit the full <Link href="/work" className="inline-link">work library</Link> or
              browse the <Link href="/projects" className="inline-link">projects hub</Link>.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {projectCaseStudies.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          <p className="section-link-row">
            <Link href="/work" className="inline-link" data-analytics-event="view_work_click" data-analytics-location="home_selected_work">
              Explore all case studies
            </Link>{" "}
            <Link href="/about" className="inline-link">
              and learn more about Una Labs
            </Link>
            {" "}
            <Link href="/blog" className="inline-link">
              or read our AI product blog
            </Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>PeacePad</h2>
            <p>
              PeacePad is an{" "}
              <Link href="/peacepad" className="inline-link">
                AI communication platform
              </Link>{" "}
              built by Una Labs to help people de-escalate high-stakes conversations before
              messages are sent.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/peacepad" className="inline-link">
              Read the PeacePad product overview
            </Link>
            {peacePadProject ? (
              <>
                {" "}
                <Link href={`/work/${peacePadProject.slug}`} className="inline-link">
                  or view the detailed case study
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>SayWetin</h2>
            <p>
              SayWetin is a{" "}
              <Link href="/saywetin" className="inline-link">
                Nigerian music AI
              </Link>{" "}
              product that combines audio recognition with local language and cultural
              intelligence.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/saywetin" className="inline-link">
              Read the SayWetin product overview
            </Link>
            {sayWetinProject ? (
              <>
                {" "}
                <Link href={`/work/${sayWetinProject.slug}`} className="inline-link">
                  or view the detailed case study
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <CTABanner
            title="Have an idea, workflow, or system to build?"
            description="Una Labs helps turn concepts into intelligent tools, creative systems, and modern digital products."
            primaryLabel="Start a Project"
            primaryHref="/work-with-ftc"
            secondaryLabel="View Work"
            secondaryHref="/work"
          />
        </div>
      </section>
    </>
  );
}
