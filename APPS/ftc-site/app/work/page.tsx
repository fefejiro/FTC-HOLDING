import Link from "next/link";
import ProjectCard from "../components/ProjectCard";
import { capabilities, projectCaseStudies } from "../../lib/content";

type SearchParams = {
  pillar?: string | string[];
};

export const metadata = {
  title: "Work | FTC",
  description: "Portfolio and case studies for FTC projects and capability systems."
};

function resolvePillar(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "all";
  return value ?? "all";
}

export default function WorkPage({ searchParams }: { searchParams?: SearchParams }) {
  const selectedPillar = resolvePillar(searchParams?.pillar);
  const filtered =
    selectedPillar === "all"
      ? projectCaseStudies
      : projectCaseStudies.filter((item) => item.pillar === selectedPillar);

  return (
    <div className="container page-content">
      <h1>Work</h1>
      <p className="page-intro">
        FTC projects are structured as capability proofs. Each case study shows the
        problem, insight, solution, and delivery outcome.
      </p>

      <div className="filter-row" aria-label="Work filters">
        <Link href="/work" className={`filter-chip ${selectedPillar === "all" ? "active" : ""}`}>
          All
        </Link>
        {capabilities.map((capability) => (
          <Link
            key={capability.slug}
            href={`/work?pillar=${capability.slug}`}
            className={`filter-chip ${selectedPillar === capability.slug ? "active" : ""}`}
          >
            {capability.title}
          </Link>
        ))}
      </div>

      <div className="cards-grid cards-grid-3">
        {filtered.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
}

