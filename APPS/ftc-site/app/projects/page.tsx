export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";
import ProjectCard from "../components/ProjectCard";
import { projectCaseStudies } from "../../lib/content";

export const metadata: Metadata = {
  title: "Projects | Una Labs",
  description:
    "Explore Una Labs projects across AI product development, automation systems, and creative AI applications.",
  alternates: {
    canonical: "/projects"
  }
};

export default function ProjectsPage() {
  return (
    <div className="container page-content">
      <h1>Projects</h1>
      <p className="page-intro">
        The Una Labs projects hub includes product tracks, case studies, and deployed
        systems across communication, audio intelligence, and automation.
      </p>

      <p className="section-link-row">
        <Link href="/peacepad" className="inline-link">
          AI communication platform
        </Link>{" "}
        |{" "}
        <Link href="/saywetin" className="inline-link">
          Nigerian music AI
        </Link>{" "}
        |{" "}
        <Link href="/work" className="inline-link">
          Full work library
        </Link>{" "}
        |{" "}
        <Link href="/about" className="inline-link">
          About Una Labs
        </Link>
      </p>

      <div className="cards-grid cards-grid-3">
        {projectCaseStudies.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
}
