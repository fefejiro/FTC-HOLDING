import { notFound } from "next/navigation";
import { getProjectCaseStudy, projectCaseStudies } from "../../../lib/content";

export function generateStaticParams() {
  return projectCaseStudies.map((project) => ({ slug: project.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const project = getProjectCaseStudy(params.slug);
  if (!project) {
    return {
      title: "Case Study | FTC"
    };
  }

  return {
    title: `${project.name} | FTC Work`,
    description: project.summary
  };
}

export default function WorkDetailPage({ params }: { params: { slug: string } }) {
  const project = getProjectCaseStudy(params.slug);
  if (!project) notFound();

  return (
    <article className="container page-content case-study">
      <h1>{project.name}</h1>
      <p className="lead">{project.tagline}</p>
      <p className="page-intro">{project.summary}</p>

      <section>
        <h2>Problem</h2>
        <p>{project.sections.problem}</p>
      </section>

      <section>
        <h2>Insight</h2>
        <p>{project.sections.insight}</p>
      </section>

      <section>
        <h2>Solution</h2>
        <p>{project.sections.solution}</p>
      </section>

      <section>
        <h2>Capabilities</h2>
        <ul>
          {project.sections.capabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Technology</h2>
        <ul>
          {project.sections.technology.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Outcome</h2>
        <p>{project.sections.outcome}</p>
      </section>
    </article>
  );
}

