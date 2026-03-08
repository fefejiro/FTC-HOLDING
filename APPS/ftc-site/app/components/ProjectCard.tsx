import Link from "next/link";
import type { ProjectCaseStudy } from "../../lib/content";

interface ProjectCardProps {
  project: ProjectCaseStudy;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="card project-card">
      <p className="card-kicker">{project.pillar.replace("-", " ")}</p>
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
      <Link href={`/work/${project.slug}`} className="inline-link">
        View case study
      </Link>
    </article>
  );
}

