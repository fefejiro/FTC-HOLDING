import Link from "next/link";
import Image from "next/image";
import GooglePlayBadge from "../components/GooglePlayBadge";
import { ateamModeSummary, ateamModeSupportPoints } from "../../lib/ateamMode";
import { projectCaseStudies, type ProjectCaseStudy } from "../../lib/content";

export const metadata = {
  title: "Products | Una Labs",
  description: "Public products and guided systems from Una Labs."
};

const productOfferContent: Record<
  string,
  {
    offerCopy: string;
    secondaryLabel: string;
    supportPoints?: string[];
  }
> = {
  peacepad: {
    offerCopy:
      "A communication product built to slow escalation before a message is sent.",
    secondaryLabel: "See PeacePad overview",
    supportPoints: [
      "Pause before sending",
      "Review tone before delivery",
      "Choose a calmer next action"
    ]
  },
  saywetin: {
    offerCopy:
      "A cultural interpretation product that helps users understand Nigerian music and language context.",
    secondaryLabel: "See SayWetin overview",
    supportPoints: [
      "Recognize songs",
      "Explain slang and references",
      "Add context, not just metadata"
    ]
  },
  ateam: {
    offerCopy:
      ateamModeSummary,
    secondaryLabel: "Try ATEAM demo",
    supportPoints: [...ateamModeSupportPoints]
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
  return project.availabilityLabel ?? (project.status === "live" ? "Live" : "Public demo");
}

export default function ProductsPage() {
  const featuredAteam = projectCaseStudies.find((item) => item.slug === "ateam");
  const primaryProducts = projectCaseStudies.filter((item) => item.slug !== "ateam");

  return (
    <div className="container page-content products-page">
      <section className="products-intro">
        <p className="eyebrow">Products</p>
        <h1>Products</h1>
        <p className="page-intro">
          PeacePad and SayWetin are public products. ATEAM is the operating-mode preview that helps
          move a rough idea into a believable next step.
        </p>
      </section>

      <div className="cards-grid cards-grid-2 products-primary-grid">
        {primaryProducts.map((project) => {
          const offer = productOfferContent[project.slug];
          const supportPoints = project.marketingBullets ?? offer?.supportPoints ?? [];

          return (
            <article key={project.slug} className="card product-spotlight-card">
              <p className="status-pill">{getLifecycleStatusLabel(project)}</p>
              <h2>{project.name}</h2>
              <p className="muted">{project.tagline}</p>
              <p>{offer?.offerCopy ?? project.summary}</p>
              <ul className="feature-list compact-feature-list">
                {supportPoints.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
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
                    {offer?.secondaryLabel ?? "See product overview"}
                  </Link>
                </div>
                {project.googlePlayUrl ? (
                  <GooglePlayBadge href={project.googlePlayUrl} title={project.name} />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {featuredAteam ? (
        <article className="card product-spotlight-card product-spotlight-card--featured">
          <div className="product-spotlight-feature product-spotlight-feature--ateam">
            <div className="product-spotlight-feature-copy">
              <p className="status-pill">{getLifecycleStatusLabel(featuredAteam)}</p>
              <h2>ATEAM</h2>
              <p className="muted">The AI lab where rough ideas become clear next steps.</p>
              <p>{ateamModeSummary} It ends in a clean handoff into a real project request.</p>
              <ul className="feature-list compact-feature-list">
                {(featuredAteam.marketingBullets ?? productOfferContent.ateam.supportPoints ?? []).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="product-actions">
                <Link href="/ateam" prefetch={false} className="btn btn-primary">
                  Try ATEAM demo
                </Link>
                <Link href="/work-with-ftc" prefetch={false} className="btn btn-secondary">
                  Start a Project
                </Link>
              </div>
            </div>
            <div className="product-ateam-visual">
              <div className="product-ateam-visual-mark" aria-hidden="true">
                <Image src="/images/brand/ATeam Logo.png" alt="" width={58} height={58} />
              </div>
              <img
                src="/images/brand/Calender Ateam.png"
                alt="ATEAM mission control preview"
                className="product-ateam-preview"
              />
              <p className="muted">
                Memory, Office, Team, and Factory are visible in the public preview before the real
                project scope begins.
              </p>
            </div>
          </div>
        </article>
      ) : null}

      <article className="card final-cta-card">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Want one of these products, or a similar system for your team?</h2>
          <p className="muted">
            Una Labs can scope the shortest credible path from idea to launch-ready delivery.
          </p>
        </div>
        <div className="product-actions">
          <Link href="/work-with-ftc" prefetch={false} className="btn btn-primary">
            Start a Project
          </Link>
          <Link href="/ateam" prefetch={false} className="btn btn-secondary">
            Try ATEAM Demo
          </Link>
        </div>
      </article>
    </div>
  );
}
