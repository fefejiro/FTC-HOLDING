import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "./components/CTABanner";
import CapabilityCard from "./components/CapabilityCard";
import Hero from "./components/Hero";
import ProjectCard from "./components/ProjectCard";
import ServiceCard from "./components/ServiceCard";
import { capabilities, projectCaseStudies, serviceTracks } from "../lib/content";

export const metadata: Metadata = {
  title: "Una Labs \u2014 Creative AI Studio Building AI Products",
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
      <section className="section section-hero fade-on-scroll">
        <div className="container">
          <Hero projects={projectCaseStudies} />
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>AI Product Development</h2>
            <p>
              We build production-focused AI systems with clear business outcomes across
              communication, automation, and cultural intelligence.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {capabilities.map((capability) => (
              <CapabilityCard key={capability.slug} capability={capability} />
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>Products</h2>
            <p>
              Discover flagship products from Una Labs, including PeacePad, SayWetin, and
              ATEAM. Each product is designed as a real-world capability engine.
            </p>
          </div>
          <div className="cards-grid cards-grid-3 product-showcase-grid">
            {projectCaseStudies.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          <p className="section-link-row">
            <Link href="/products" className="inline-link">
              Explore all products
            </Link>{" "}
            <Link href="/projects" className="inline-link">
              or browse the projects hub
            </Link>
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>The Studio Model</h2>
            <p>
              Una Labs operates as a creative AI studio exploring real-world applications of
              artificial intelligence across communication, automation, and cultural
              technology.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/about" className="inline-link">
              Learn more about our studio philosophy
            </Link>
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>Automation Systems</h2>
            <p>
              We design automation architecture for startup teams, creators, and operational
              businesses that need repeatable intelligent workflows.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {serviceTracks.map((track) => (
              <ServiceCard key={track.audience} track={track} />
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>Work / Project Grid</h2>
            <p>
              Review case studies showing how Una Labs ships AI products from concept to
              production.
            </p>
          </div>
          <div className="cards-grid cards-grid-3 work-glass-grid">
            {projectCaseStudies.map((project) => (
              <ProjectCard key={`work-${project.slug}`} project={project} />
            ))}
          </div>
          <p className="section-link-row">
            <Link
              href="/work"
              className="inline-link"
              data-analytics-event="view_work_click"
              data-analytics-location="home_work_grid"
            >
              Explore all case studies
            </Link>{" "}
            <Link href="/blog" className="inline-link">
              and read product insights on the blog
            </Link>
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>PeacePad</h2>
            <p>
              PeacePad is an{" "}
              <Link href="/peacepad" className="inline-link">
                AI communication platform
              </Link>{" "}
              designed to help users choose calmer responses in high-stakes conversations.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/peacepad" className="inline-link">
              Read the PeacePad overview
            </Link>
            {peacePadProject ? (
              <>
                {" "}
                <Link href={`/work/${peacePadProject.slug}`} className="inline-link">
                  or view the case study
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>SayWetin</h2>
            <p>
              SayWetin is a{" "}
              <Link href="/saywetin" className="inline-link">
                Nigerian music AI
              </Link>{" "}
              product combining audio recognition with local language and cultural context.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/saywetin" className="inline-link">
              Read the SayWetin overview
            </Link>
            {sayWetinProject ? (
              <>
                {" "}
                <Link href={`/work/${sayWetinProject.slug}`} className="inline-link">
                  or view the case study
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <CTABanner
            title="Have an idea to ship?"
            description="Una Labs helps founders and teams build practical AI products with speed, clarity, and technical depth."
            primaryLabel="Explore Our Work"
            primaryHref="/work"
            secondaryLabel="View Products"
            secondaryHref="/products"
          />
        </div>
      </section>
    </>
  );
}
