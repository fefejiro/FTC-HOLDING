import Link from "next/link";
import type { ProjectCaseStudy } from "../../lib/content";

interface ProjectCardProps {
  project: ProjectCaseStudy;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const productHref =
    project.slug === "peacepad"
      ? "/peacepad"
      : project.slug === "saywetin"
        ? "/saywetin"
        : "/projects";

  const statusLabel =
    project.status === "live"
      ? "Live"
      : project.status === "active-development"
        ? "Active Development"
        : "Internal Runtime";

  return (
    <article className="card project-card">
      <p className="card-kicker">{project.pillar.replace("-", " ")}</p>
      <span className="status-pill">{statusLabel}</span>
      <h3>{project.name}</h3>
      <p className="muted">{project.tagline}</p>
      <p>{project.summary}</p>
      <ul className="chip-list">
        {project.tags.map((tag) => (
          <li key={tag} className="chip">
            {tag}
          </li>
        ))}
      </ul>
      <Link href={productHref} prefetch={false} className="inline-link">
        View product
      </Link>
      <Link
        href={`/work/${project.slug}`}
        prefetch={false}
        className="inline-link"
        data-analytics-event="case_study_click"
        data-analytics-label={project.slug}
        data-analytics-location="project_card"
      >
        View case study
      </Link>
    </article>
  );
}
