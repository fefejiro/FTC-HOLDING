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
          <p className="eyebrow">FTC - Creative AI Technology Studio</p>
          <h1>Intelligent software. Creative AI. Real-world systems.</h1>
          <p className="lead">
            FTC designs AI-powered tools, automation systems, and digital products for
            businesses, creators, and emerging platforms.
          </p>
          <div className="hero-actions">
            <Link href="/work" className="btn btn-primary">
              View Work
            </Link>
            <Link href="/work-with-ftc" className="btn btn-secondary">
              Work With FTC
            </Link>
          </div>
          <p className="proof-strip">Featured work: PeacePad - SayWetin - ATEAM</p>
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
