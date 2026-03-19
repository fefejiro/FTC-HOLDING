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
    title: "48-hour service installs",
    copy: "Fast-launch lead capture, instant follow-up, and missed-call recovery systems for local businesses."
  },
  {
    title: "Products in market",
    copy: "PeacePad and SayWetin are both live on Google Play, showing real shipped product work."
  },
  {
    title: "Fast decision cycles",
    copy: "Focused projects usually move from brief to a clear implementation path within days, not months."
  }
] as const;

const heroSignalItems = [
  "Fast websites and lead systems without long build cycles",
  "Shipped products in market, not just pitch decks",
  "Operator-led delivery for businesses that need movement now"
] as const;

const serviceOfferBullets = [
  "Lead capture forms that route every inquiry into one simple workflow",
  "Instant email or text replies so prospects hear back right away",
  "Missed-call text-back for after-hours or busy business owners",
  "Owner alerts and lightweight tracking so follow-up does not slip"
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
  title: "Una Labs - Fast Websites, Lead Automation, and AI Product Delivery",
  description:
    "Una Labs builds fast websites, instant lead follow-up systems, and practical AI products for businesses that need execution fast.",
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
                <p className="eyebrow">Fast Websites, Lead Automation, and AI Delivery</p>
                <div className="hero-heading-block">
                  <span className="hero-kicker">Operator-led execution for businesses that need movement</span>
                  <h1>Una Labs</h1>
                </div>
                <p className="lead hero-subtitle">Fast websites, lead automation, and AI product execution with sharper positioning and less overbuild.</p>
                <p className="hero-description">
                  We help businesses launch fast websites, instant lead follow-up systems,
                  and practical AI tools with a tighter delivery path, clearer priorities,
                  and a more premium execution standard.
                </p>
                <ul className="hero-signal-list" aria-label="Studio strengths">
                  {heroSignalItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="hero-actions hero-actions-elevated">
                  <a href="#start-project" className="btn btn-primary">
                    Get a 48-Hour Setup
                  </a>
                  <a href="#offer" className="btn btn-secondary">
                    Review the Offer
                  </a>
                </div>
                <div className="hero-credibility hero-credibility-elevated">
                  <p className="hero-credibility-title">Products shipped by Una Labs</p>
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

              <div className="hero-collage home-hero-panel hero-panel-elevated">
                <div className="hero-panel-header">
                  <p className="collage-label">Studio Snapshot</p>
                  <p className="hero-panel-caption">Built to help clients buy faster and trust faster.</p>
                </div>
                <div className="home-hero-panel-grid">
                  {heroSnapshotCards.map((card) => (
                    <article key={card.title} className="collage-card hero-insight-card">
                      <p className="hero-insight-label">Signal</p>
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

      <section className="section fade-on-scroll" id="offer">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Featured Offer</p>
            <h2>48-Hour Lead Response System</h2>
            <p>
              A simple install for businesses that want to stop losing leads from slow replies,
              missed calls, and scattered follow-up.
            </p>
          </div>
          <article className="card client-work-card featured-offer-card">
            <div className="client-work-header featured-offer-header">
              <div>
                <p className="status-pill featured-status-pill">FASTEST PATH TO VALUE</p>
                <h3>Launch-ready lead capture and follow-up</h3>
                <p className="featured-offer-summary">
                  Best for local service businesses, consultants, and owner-led teams that need a
                  cleaner way to capture inquiries and respond right away.
                </p>
              </div>
              <div className="featured-offer-meta">
                <span>48-hour setup window</span>
                <span>Built for speed, not bloat</span>
              </div>
            </div>
            <div className="featured-offer-grid">
              <div>
                <p className="client-work-label">What is included:</p>
                <ul className="feature-list compact-feature-list">
                  {serviceOfferBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <div className="featured-offer-aside">
                <p className="client-work-label">Why it sells</p>
                <ul className="feature-list compact-feature-list">
                  <li>Easy to understand before a long technical conversation</li>
                  <li>Clear ROI story for owner-led businesses</li>
                  <li>Fast enough to install before momentum disappears</li>
                </ul>
              </div>
            </div>
            <p className="product-offer-copy featured-offer-copy">
              Typical setup: fast website contact flow, instant confirmation, owner alerts, and
              lightweight tracking that is easy to manage.
            </p>
            <div className="product-actions featured-offer-actions">
              <a href="#start-project" className="btn btn-primary product-spotlight-link">
                Request This Setup
              </a>
              <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary product-spotlight-link">
                See How We Scope Projects
              </Link>
            </div>
          </article>
        </div>
      </section>

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
            <h2>Client delivery for businesses that need visibility, faster response, or launch support</h2>
            <p>
              Not every engagement is a new app. Some clients need stronger search visibility,
              better positioning, or a faster path from inquiry to booked work.
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
              Best fit for local service businesses that need stronger search presence,
              cleaner lead handling, and a better conversion path before investing in a larger build.
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
              <h2>Tell us what you need to launch, automate, or fix fast</h2>
              <p>
                If you need a fast website, lead response workflow, or practical AI system,
                Una Labs will review it quickly and reply with a scoped next step.
              </p>
            </div>
            <p className="intake-reassurance">
              No obligation. We review every request and reply within 24 hours.
            </p>
            <div className="card intake-note-card">
              <h3>Best fit right now</h3>
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

