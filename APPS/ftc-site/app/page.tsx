import Link from "next/link";
import CTABanner from "./components/CTABanner";
import CapabilityCard from "./components/CapabilityCard";
import Hero from "./components/Hero";
import ProjectCard from "./components/ProjectCard";
import ServiceCard from "./components/ServiceCard";
import { capabilities, projectCaseStudies, serviceTracks } from "../lib/content";

export default function HomePage() {
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
            <h2>What We Build</h2>
            <p>
              Una Labs builds intelligent systems, creative tools, and automation
              platforms that help people communicate, create, and operate with clarity.
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
            <h2>Selected Work</h2>
            <p>
              Projects and systems developed by Una Labs across AI, automation, and
              creative technology.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {projectCaseStudies.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          <p className="section-link-row">
            <Link
              href="/work"
              className="inline-link"
              data-analytics-event="view_work_click"
              data-analytics-location="home_selected_work"
            >
              Explore all case studies
            </Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>What We Can Build Together</h2>
            <p>We work across business workflows, creator systems, and startup products.</p>
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
