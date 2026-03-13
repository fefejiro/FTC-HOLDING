import type { Metadata } from "next";
import Link from "next/link";
import ClientLogoStrip from "./components/ClientLogoStrip";
import GooglePlayBadge from "./components/GooglePlayBadge";
import WorkIntakeForm from "./components/WorkIntakeForm";
import { getProjectCaseStudy, type ProjectCaseStudy } from "../lib/content";

const buildAreas = [
  {
    title: "AI Automation",
    description: "Automate repetitive business workflows using AI systems.",
    icon: "A"
  },
  {
    title: "AI Internal Tools",
    description: "Custom internal tools that help teams work faster and smarter.",
    icon: "T"
  },
  {
    title: "AI Assistants",
    description: "Chat, voice, and workflow assistants trained for business tasks.",
    icon: "S"
  },
  {
    title: "AI Micro Products",
    description:
      "Small AI applications businesses can use internally or offer customers.",
    icon: "M"
  }
] as const;

const labItems = [
  "AI automation systems",
  "browser extension experiments",
  "messaging intelligence tools",
  "cultural language AI models",
  "AI copilots"
] as const;

const heroSnapshotCards = [
  {
    title: "Products in market",
    copy: "PeacePad and SayWetin are both live on Google Play, showing real shipped product work."
  },
  {
    title: "Service + product delivery",
    copy: "Una Labs supports both install-ready products and client delivery work that improves growth or operations."
  },
  {
    title: "Fast decision cycles",
    copy: "Focused projects usually move from brief to a clear implementation path within days, not months."
  }
] as const;

const homeProductOfferContent: Record<
  string,
  {
    offerCopy: string;
    supportPoints: string[];
    caseStudyLabel: string;
  }
> = {
  peacepad: {
    offerCopy:
      "Install PeacePad now or review how the product handles difficult conversations before delivery.",
    supportPoints: [
      "Pause before sending",
      "Review tone before delivery",
      "Choose a calmer next action"
    ],
    caseStudyLabel: "Read launch case study"
  },
  saywetin: {
    offerCopy:
      "Install SayWetin now or explore how the app explains Nigerian songs, slang, and cultural context.",
    supportPoints: [
      "Recognize Nigerian songs",
      "Explain slang and cultural meaning",
      "Provide contextual interpretation"
    ],
    caseStudyLabel: "Read launch case study"
  }
} as const;

const projectFitPoints = [
  "AI product MVPs and install-ready apps",
  "Workflow automations and internal tools",
  "Service-business visibility and conversion work",
  "Narrow experiments that need a fast, high-quality launch path"
] as const;

const featuredProductSlugs = ["peacepad", "saywetin"] as const;
const featuredProducts = featuredProductSlugs
  .map((slug) => getProjectCaseStudy(slug))
  .filter((project): project is ProjectCaseStudy => Boolean(project));

function getProductHref(project: ProjectCaseStudy): string {
  return project.slug === "peacepad" ? "/peacepad" : "/saywetin";
}

export const metadata: Metadata = {
  title: "Una Labs - Creative AI Studio Building AI Products",
  description:
    "Una Labs is a creative AI studio building real-world AI products including PeacePad and SayWetin. Explore our work in automation, AI tools, and product innovation.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="section section-hero fade-on-scroll">
        <div className="container">
          <section className="hero home-hero">
            <div className="hero-noise" aria-hidden="true" />
            <div className="hero-grid home-hero-grid">
              <div className="hero-copy home-hero-copy">
                <p className="eyebrow">AI Product &amp; Automation Studio</p>
                <h1>Unalabs</h1>
                <p className="lead hero-subtitle">AI Product &amp; Automation Studio</p>
                <p className="hero-description">
                  We design and build AI-powered tools, automations, and digital products
                  for modern businesses.
                </p>
                <div className="hero-actions">
                  <a href="#start-project" className="btn btn-primary">
                    Start a Project
                  </a>
                  <a href="#products" className="btn btn-secondary">
                    Explore Our Products
                  </a>
                </div>
                <div className="hero-credibility">
                  <p className="hero-credibility-title">Products shipped by Unalabs:</p>
                  <ul className="hero-credibility-list">
                    {featuredProducts.map((project) => (
                      <li key={project.slug}>
                        <Link
                          href={getProductHref(project)}
                          prefetch={false}
                          className="hero-credibility-link"
                        >
                          {project.name}
                          {project.availabilityLabel ? ` (${project.availabilityLabel})` : ""}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="hero-collage home-hero-panel">
                <p className="collage-label">Studio Snapshot</p>
                <div className="home-hero-panel-grid">
                  {heroSnapshotCards.map((card) => (
                    <article key={card.title} className="collage-card">
                      <h2>{card.title}</h2>
                      <p>{card.copy}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <ClientLogoStrip />

      <section className="section fade-on-scroll" id="what-we-build">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">What We Build</p>
            <h2>Practical AI systems for teams and products</h2>
            <p>
              We focus on narrow, useful AI products that solve operational, workflow, and
              customer-facing problems without unnecessary complexity.
            </p>
          </div>
          <div className="build-grid">
            {buildAreas.map((area) => (
              <article key={area.title} className="card build-card">
                <span className="build-icon" aria-hidden="true">
                  {area.icon}
                </span>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="products">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Our Products</p>
            <h2>Products built and shipped by Unalabs</h2>
            <p>
              Explore the products, install the live apps, or review the case studies behind
              the build decisions.
            </p>
          </div>
          <div className="product-grid">
            {featuredProducts.map((project) => {
              const offer = homeProductOfferContent[project.slug];

              return (
                <article key={project.slug} className="card product-spotlight-card">
                  {project.availabilityLabel ? (
                    <p className="status-pill">{project.availabilityLabel}</p>
                  ) : null}
                  <h3>{project.name}</h3>
                  <p>{project.summary}</p>
                  {offer?.supportPoints.length ? (
                    <ul className="feature-list compact-feature-list">
                      {offer.supportPoints.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="product-offer-copy">{offer?.offerCopy ?? project.summary}</p>
                  <div className="product-card-cta-stack">
                    <div className="product-actions product-actions-stack">
                      {project.googlePlayUrl ? (
                        <a
                          href={project.googlePlayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary product-spotlight-link"
                        >
                          Install on Google Play
                        </a>
                      ) : null}
                      <Link
                        href={getProductHref(project)}
                        prefetch={false}
                        className="btn btn-secondary product-spotlight-link"
                      >
                        {`See ${project.name} overview`}
                      </Link>
                    </div>
                    {project.googlePlayUrl ? (
                      <GooglePlayBadge href={project.googlePlayUrl} title={project.name} />
                    ) : null}
                  </div>
                  <Link href={`/work/${project.slug}`} prefetch={false} className="inline-link">
                    {offer?.caseStudyLabel ?? "Read product case study"}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="client-work">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Client Work</p>
            <h2>Client delivery for businesses that need visibility or launch support</h2>
            <p>
              Not every engagement is a new app. Some clients need stronger search visibility,
              better positioning, or a faster path to inbound inquiries.
            </p>
          </div>
          <article className="card client-work-card">
            <div className="client-work-header">
              <div>
                <p className="status-pill">SEO OPTIMIZATION IN PROGRESS</p>
                <h3>Emergency Prompt Roadside Assist</h3>
              </div>
            </div>
            <p>
              SEO optimization and digital visibility improvements for a local roadside
              assistance service.
            </p>
            <div>
              <p className="client-work-label">Work performed:</p>
              <ul className="feature-list compact-feature-list">
                <li>Google Business profile audit</li>
                <li>SEO visibility improvements</li>
                <li>content and listing optimization</li>
                <li>search discoverability improvements</li>
              </ul>
            </div>
            <p className="product-offer-copy">
              Best fit for local service businesses that need better search presence before
              investing in a larger build.
            </p>
            <div className="product-actions">
              <Link href="/work" prefetch={false} className="btn btn-secondary product-spotlight-link">
                View Case Study
              </Link>
              <a href="#start-project" className="btn btn-primary product-spotlight-link">
                Start a Project
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="section fade-on-scroll" id="lab">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">In the Lab</p>
            <h2>Active experiments and prototype tracks</h2>
            <p>Experiments and prototypes currently being explored by Unalabs.</p>
          </div>
          <div className="card lab-card">
            <ul className="lab-list">
              {labItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="start-project">
        <div className="container start-project-grid">
          <div className="intake-aside">
            <div className="section-heading home-section-heading">
              <p className="eyebrow">Start a Project</p>
              <h2>Start with the business problem or product idea</h2>
              <p>
                Tell us what you need to launch, automate, or improve. Una Labs will tell you
                quickly if it is a fit and what the next step should be.
              </p>
            </div>
            <p className="intake-reassurance">
              No obligation. We review every request and reply within 24 hours.
            </p>
            <div className="card intake-note-card">
              <h3>Good fit right now</h3>
              <ul className="feature-list compact-feature-list intake-fit-list">
                {projectFitPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="product-offer-copy">
                Built by the team behind PeacePad and SayWetin, with room for both market-facing
                products and practical client delivery work.
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

