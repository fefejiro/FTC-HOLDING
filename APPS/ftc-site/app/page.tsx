import type { Metadata } from "next";
import Link from "next/link";
import WorkIntakeForm from "./components/WorkIntakeForm";
import { projectCaseStudies } from "../lib/content";

const buildAreas = [
  {
    title: "AI Automation",
    summary: "Automate repetitive business processes with practical AI workflows and triggers."
  },
  {
    title: "AI Internal Tools",
    summary: "Build private tools that help teams move faster with better context and less manual work."
  },
  {
    title: "AI Assistants",
    summary: "Create assistants that answer, guide, and support users inside real product flows."
  },
  {
    title: "AI Micro-Products",
    summary: "Launch focused AI products around one problem, one workflow, or one customer need."
  }
] as const;

const workSteps = [
  "Tell us your idea or problem",
  "We design and build the AI solution",
  "Launch and improve together"
] as const;

const labExperiments = [
  {
    title: "Prototype Demos",
    summary: "Quick interactive demos to test whether an idea deserves a full product build."
  },
  {
    title: "Workflow Experiments",
    summary: "Small AI systems that explore how automation can remove friction from daily operations."
  },
  {
    title: "Labs Concepts",
    summary: "Early-stage interface and capability experiments that can evolve into real products."
  }
] as const;

export const metadata: Metadata = {
  title: "Una Labs — Creative AI Studio Building AI Products",
  description:
    "Una Labs is a creative AI studio building real-world AI products including PeacePad and SayWetin. Explore our work in automation, AI tools, and product innovation.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  const featuredProducts = projectCaseStudies.filter(
    (project) => project.slug === "peacepad" || project.slug === "saywetin"
  );

  return (
    <div className="home-page">
      <section className="section section-hero fade-on-scroll">
        <div className="container">
          <section className="hero home-hero">
            <div className="hero-noise" aria-hidden="true" />
            <div className="hero-grid home-hero-grid">
              <div className="hero-copy home-hero-copy">
                <p className="eyebrow">AI Product Studio</p>
                <h1>
                  Unalabs
                  <br />
                  AI Product Studio
                </h1>
                <p className="lead">
                  We design and build AI-powered tools, automations, and digital products
                  for businesses.
                </p>
                <div className="hero-actions">
                  <a href="#start-project" className="btn btn-primary">
                    Start a Project
                  </a>
                  <a href="#products" className="btn btn-secondary">
                    Explore Our Products
                  </a>
                </div>
                <p className="hero-trust">
                  Built by the team behind PeacePad and SayWetin.
                </p>
              </div>

              <div className="hero-collage home-hero-panel">
                <p className="collage-label">Studio Snapshot</p>
                <div className="home-hero-panel-grid">
                  <article className="collage-card">
                    <h2>Fast early builds</h2>
                    <p>Most projects launch within 4-8 weeks with a focused scope and clear outcomes.</p>
                  </article>
                  <article className="collage-card">
                    <h2>Product-minded delivery</h2>
                    <p>We combine product strategy, UX, and AI implementation in one studio workflow.</p>
                  </article>
                  <article className="collage-card">
                    <h2>Real-world AI</h2>
                    <p>We build tools people can actually use, not demos that stop at the concept stage.</p>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="section fade-on-scroll" id="what-we-build">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Section 2</p>
            <h2>What We Build</h2>
            <p>
              We focus on practical AI products that help teams automate, decide faster, and
              launch new digital experiences with less overhead.
            </p>
          </div>
          <div className="build-grid">
            {buildAreas.map((area) => (
              <article key={area.title} className="card build-card">
                <h3>{area.title}</h3>
                <p>{area.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="products">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Section 3</p>
            <h2>Our Products</h2>
            <p>
              PeacePad and SayWetin show how Una Labs turns communication, culture, and AI
              into usable products.
            </p>
          </div>
          <div className="product-grid">
            {featuredProducts.map((product) => (
              <article key={product.slug} className="card product-spotlight-card">
                <p className="card-kicker">{product.status.replace("-", " ")}</p>
                <h3>{product.name}</h3>
                <p>{product.summary}</p>
                <Link
                  href={`/${product.slug}`}
                  prefetch={false}
                  className="btn btn-secondary product-spotlight-link"
                >
                  {product.slug === "peacepad" ? "View PeacePad" : "View SayWetin"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="how-we-work">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Section 4</p>
            <h2>How We Work</h2>
            <p>
              Our process is simple: define the problem, build the right AI system, and keep
              improving it after launch.
            </p>
          </div>
          <div className="process-grid">
            {workSteps.map((step, index) => (
              <article key={step} className="card process-card">
                <span className="process-step-number">0{index + 1}</span>
                <h3>{step}</h3>
              </article>
            ))}
          </div>
          <p className="process-note">Most projects launch within 4-8 weeks.</p>
        </div>
      </section>

      <section className="section fade-on-scroll" id="experiments">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Section 5</p>
            <h2>Experiments / Labs</h2>
            <p>
              We regularly test demos, prototypes, and small AI concepts that can mature into
              future products or internal tools.
            </p>
          </div>
          <div className="experiments-grid">
            {labExperiments.map((experiment) => (
              <article key={experiment.title} className="card experiment-card">
                <h3>{experiment.title}</h3>
                <p>{experiment.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="start-project">
        <div className="container start-project-grid">
          <div className="intake-aside">
            <div className="section-heading home-section-heading">
              <p className="eyebrow">Section 6</p>
              <h2>Start a Project</h2>
              <p>
                Tell us what you want to build, your budget range, and your ideal timeline.
                We will reply with the most useful next step.
              </p>
            </div>
            <p className="intake-lead">
              Clear inputs help us scope faster and give you a better response.
            </p>
            <div className="card intake-note-card">
              <h3>Good fit for Una Labs</h3>
              <p>
                New product ideas, AI automations, internal tools, assistants, and focused
                prototypes.
              </p>
            </div>
          </div>

          <section className="intake-card home-intake-card">
            <WorkIntakeForm />
          </section>
        </div>
      </section>
    </div>
  );
}
