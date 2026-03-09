import Link from "next/link";
import type { ProjectCaseStudy } from "../../lib/content";

interface HeroProps {
  projects: ProjectCaseStudy[];
}

export default function Hero({ projects }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div>
          <p className="eyebrow">Una Labs - Creative AI Studio</p>
          <h1>Una Labs — Creative AI Studio</h1>
          <p className="lead">
            Una Labs builds real-world AI products, automation systems, and creative tools
            for founders, operators, and high-growth teams.
          </p>
          <div className="hero-actions">
            <Link
              href="/work-with-ftc"
              className="btn btn-primary"
              data-analytics-event="start_project_click"
              data-analytics-location="hero"
            >
              Start a Project
            </Link>
            <Link
              href="/work"
              className="btn btn-secondary"
              data-analytics-event="view_work_click"
              data-analytics-location="hero"
            >
              View Work
            </Link>
          </div>
          <p className="proof-strip">Featured work: PeacePad | SayWetin | ATEAM</p>
        </div>
        <div className="hero-collage">
          <p className="collage-label">Studio Projects</p>
          <div className="collage-grid">
            {projects.map((project) => (
              <article key={project.slug} className="collage-card">
                <h3>{project.name}</h3>
                <p>{project.tagline}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

