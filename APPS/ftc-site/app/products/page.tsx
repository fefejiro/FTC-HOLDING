import Link from "next/link";
import BrandImagePanel from "../components/BrandImagePanel";
import GooglePlayBadge from "../components/GooglePlayBadge";
import { projectCaseStudies, type ProjectCaseStudy } from "../../lib/content";

export const metadata = {
  title: "Products | Una Labs",
  description: "Internal Una Labs products and capability engines."
};

const productOfferContent: Record<
  string,
  {
    offerCopy: string;
    secondaryLabel: string;
    caseStudyLabel: string;
    supportPoints?: string[];
  }
> = {
  peacepad: {
    offerCopy:
      "Install the Android app now or review how PeacePad handles difficult conversations before delivery.",
    secondaryLabel: "See PeacePad overview",
    caseStudyLabel: "Read launch case study",
    supportPoints: [
      "Pause before sending",
      "Review tone before delivery",
      "Choose a calmer next action"
    ]
  },
  saywetin: {
    offerCopy:
      "Install the Android app now or explore how SayWetin explains songs, slang, and cultural context.",
    secondaryLabel: "See SayWetin overview",
    caseStudyLabel: "Read launch case study"
  },
  ateam: {
    offerCopy:
      "Interactive lab system for turning rough ideas into structured execution plans and build-ready direction.",
    secondaryLabel: "Try ATEAM demo",
    caseStudyLabel: "Read system case study",
    supportPoints: [
      "Guided project intake",
      "Workflow routing and planning",
      "Demo and prototype preparation"
    ]
  }
};

function getProductOverviewHref(project: ProjectCaseStudy): string {
  return project.slug === "peacepad"
    ? "/products/peacepad"
    : project.slug === "saywetin"
      ? "/saywetin"
      : "/ateam";
}

function getLifecycleStatusLabel(project: ProjectCaseStudy): string {
  return project.status === "live"
    ? "Live"
    : project.status === "active-development"
      ? "Active Development"
      : "Internal Runtime";
}

export default function ProductsPage() {
  const sortedProducts = [...projectCaseStudies].sort((a, b) => {
    if (a.slug === "peacepad") return -1;
    if (b.slug === "peacepad") return 1;
    return 0;
  });

  const featuredAteam = sortedProducts.find((item) => item.slug === "ateam");
  const primaryProducts = sortedProducts.filter((item) => item.slug !== "ateam");

  return (
    <div className="container page-content">
      <section className="page-media-banner fade-on-scroll">
        <div className="page-media-copy">
          <p className="eyebrow">Product ecosystem</p>
          <h1>Products</h1>
          <p className="page-intro">
            Una Labs product tracks are both market-facing tools and capability engines for a
            broader studio delivery system. PeacePad leads the lineup.
          </p>
          <p>
            The product portfolio spans communication intelligence, cultural interpretation,
            and orchestration runtime systems designed to reinforce one another over time.
          </p>
        </div>
        <BrandImagePanel
          src="/images/brand/unalabs-ecosystem.PNG"
          alt="Una Labs product ecosystem image"
          aspect="wide"
          sizes="(max-width: 980px) 100vw, 44vw"
          fit="contain"
          caption={
            <p className="muted">
              A visual summary of how the product lines fit into a broader Una Labs capability
              stack.
            </p>
          }
        />
      </section>

      <div className="cards-grid cards-grid-2">
        {primaryProducts.map((project) => {
          const offer = productOfferContent[project.slug];
          const supportPoints = project.marketingBullets ?? offer?.supportPoints;

          return (
            <article key={project.slug} className="card product-spotlight-card">
              <p className="status-pill">
                {project.availabilityLabel ?? getLifecycleStatusLabel(project)}
              </p>
              <h2>{project.name}</h2>
              <p className="muted">{project.tagline}</p>
              <p>{project.summary}</p>
              {supportPoints?.length ? (
                <ul className="feature-list compact-feature-list">
                  {supportPoints.map((bullet) => (
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
                    href={getProductOverviewHref(project)}
                    prefetch={false}
                    className="btn btn-secondary product-spotlight-link"
                  >
                    {offer?.secondaryLabel ?? "View product overview"}
                  </Link>
                </div>
                {project.googlePlayUrl ? (
                  <GooglePlayBadge href={project.googlePlayUrl} title={project.name} />
                ) : null}
              </div>
              <Link href={getProductOverviewHref(project)} prefetch={false} className="inline-link">
                See how it works
              </Link>
            </article>
          );
        })}
      </div>

      {featuredAteam ? (
        <article className="card product-spotlight-card product-spotlight-card--featured">
          <div className="product-spotlight-feature">
            <div className="product-spotlight-feature-copy">
              <p className="status-pill">{featuredAteam.availabilityLabel ?? getLifecycleStatusLabel(featuredAteam)}</p>
              <h2>{featuredAteam.name}</h2>
              <p className="muted">{featuredAteam.tagline}</p>
              <p>{featuredAteam.summary}</p>
              <ul className="feature-list compact-feature-list">
                {(
                  featuredAteam.marketingBullets ??
                  productOfferContent.ateam.supportPoints ??
                  featuredAteam.sections.capabilities
                )
                  .slice(0, 4)
                  .map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
              </ul>
              <p className="product-offer-copy">{productOfferContent.ateam.offerCopy}</p>
              <div className="product-actions">
                <Link href="/ateam" prefetch={false} className="btn btn-primary">
                  Try ATEAM demo
                </Link>
                <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                  Start a Project
                </Link>
              </div>
            </div>
            <BrandImagePanel
              src="/images/brand/Calender Ateam.png"
              alt="ATEAM mission control preview"
              aspect="wide"
              fit="cover"
              sizes="(max-width: 980px) 100vw, 42vw"
              caption={<p className="muted">Mission Control-style output: brief → workflow → next step.</p>}
            />
          </div>
        </article>
      ) : null}

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Want a product or system like these?</h2>
          <p className="muted">
            Una Labs can scope a fast build path that keeps delivery measurable and aligned.
          </p>
        </div>
        <div className="product-actions">
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a Project
          </Link>
          <Link href="/work" prefetch={false} className="btn btn-secondary">
            View Client Launches
          </Link>
        </div>
      </article>
    </div>
  );
}
