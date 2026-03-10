import type { Metadata } from "next";
import Link from "next/link";
import BrandImagePanel from "./components/BrandImagePanel";
import ClientLogoStrip from "./components/ClientLogoStrip";
import CTABanner from "./components/CTABanner";
import CapabilityCard from "./components/CapabilityCard";
import Hero from "./components/Hero";
import ProjectCard from "./components/ProjectCard";
import ServiceCard from "./components/ServiceCard";
import { capabilities, projectCaseStudies, serviceTracks } from "../lib/content";

export const metadata: Metadata = {
  title: "Una Labs \u2014 Creative AI Studio Building AI Products",
  description:
    "Una Labs is a creative AI studio building real-world AI products including PeacePad and SayWetin. Explore our work in automation, AI tools, and product innovation.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  const peacePadProject = projectCaseStudies.find((project) => project.slug === "peacepad");
  const sayWetinProject = projectCaseStudies.find((project) => project.slug === "saywetin");

  return (
    <>
      <section className="section section-hero fade-on-scroll">
        <div className="container">
          <Hero projects={projectCaseStudies} />
        </div>
      </section>

      <ClientLogoStrip />

      <section className="section fade-on-scroll">
        <div className="container split-feature">
          <div className="split-feature-copy">
            <p className="eyebrow">Studio for builders</p>
            <h2>We shape AI products, tools, and experiments into deliberate systems.</h2>
            <p>
              Una Labs works like a premium studio for founders and teams that want more than
              a demo. We combine product thinking, architecture, and careful interaction design
              so AI capabilities become something people can actually use.
            </p>
            <ul className="feature-list">
              <li>Architecture that keeps AI useful inside real workflows.</li>
              <li>Product execution across web, mobile, automation, and extensions.</li>
              <li>Capability experiments that mature into durable product surfaces.</li>
            </ul>
            <p className="section-link-row">
              <Link href="/about" prefetch={false} className="inline-link">
                Learn more about the studio
              </Link>{" "}
              <Link href="/work-with-ftc" prefetch={false} className="inline-link">
                or start a project
              </Link>
            </p>
          </div>
          <BrandImagePanel
            src="/images/brand/unalabs-builder-workspace.PNG"
            alt="Una Labs builder workspace concept image"
            aspect="wide"
            sizes="(max-width: 980px) 100vw, 46vw"
            caption={
              <>
                <p className="card-kicker">Builder Workspace</p>
                <p className="muted">
                  A product studio environment designed around making AI systems tangible,
                  elegant, and shippable.
                </p>
              </>
            }
          />
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>AI Product Development</h2>
            <p>
              We build production-focused AI systems with clear business outcomes across
              communication, automation, and cultural intelligence.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {capabilities.map((capability) => (
              <CapabilityCard key={capability.slug} capability={capability} />
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container split-feature split-feature-ecosystem">
          <BrandImagePanel
            src="/images/brand/unalabs-ecosystem.PNG"
            alt="Una Labs ecosystem diagram showing multiple connected AI product tracks"
            aspect="wide"
            sizes="(max-width: 980px) 100vw, 48vw"
            caption={
              <>
                <p className="card-kicker">Connected Product System</p>
                <p className="muted">
                  Each product explores a distinct user problem while strengthening a broader
                  capability system.
                </p>
              </>
            }
          />
          <div className="split-feature-copy">
            <p className="eyebrow">Product ecosystem</p>
            <h2>One studio. Multiple product surfaces. Shared capability depth.</h2>
            <p>
              PeacePad, SayWetin, and ATEAM are not isolated ideas. They prove different
              layers of communication intelligence, cultural interpretation, and runtime
              orchestration inside one evolving ecosystem.
            </p>
            <div className="ecosystem-link-grid">
              <Link href="/peacepad" prefetch={false} className="ecosystem-link-card">
                <strong>PeacePad</strong>
                <span>AI communication and conflict mediation</span>
              </Link>
              <Link href="/saywetin" prefetch={false} className="ecosystem-link-card">
                <strong>SayWetin</strong>
                <span>Nigerian music, language, and culture intelligence</span>
              </Link>
              <Link href="/work/ateam" prefetch={false} className="ecosystem-link-card">
                <strong>ATEAM</strong>
                <span>Internal orchestration runtime and systems layer</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>Products</h2>
            <p>
              Discover flagship products from Una Labs, including PeacePad, SayWetin, and
              ATEAM. Each product is designed as a real-world capability engine.
            </p>
          </div>
          <div className="cards-grid cards-grid-3 product-showcase-grid">
            {projectCaseStudies.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          <p className="section-link-row">
            <Link href="/products" prefetch={false} className="inline-link">
              Explore all products
            </Link>{" "}
            <Link href="/projects" prefetch={false} className="inline-link">
              or browse the projects hub
            </Link>
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>The Studio Model</h2>
            <p>
              Una Labs operates as a creative AI studio exploring real-world applications of
              artificial intelligence across communication, automation, and cultural
              technology.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/about" prefetch={false} className="inline-link">
              Learn more about our studio philosophy
            </Link>
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>Automation Systems</h2>
            <p>
              We design automation architecture for startup teams, creators, and operational
              businesses that need repeatable intelligent workflows.
            </p>
          </div>
          <div className="cards-grid cards-grid-3">
            {serviceTracks.map((track) => (
              <ServiceCard key={track.audience} track={track} />
            ))}
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>Work / Project Grid</h2>
            <p>
              Review case studies showing how Una Labs ships AI products from concept to
              production.
            </p>
          </div>
          <div className="cards-grid cards-grid-3 work-glass-grid">
            {projectCaseStudies.map((project) => (
              <ProjectCard key={`work-${project.slug}`} project={project} />
            ))}
          </div>
          <p className="section-link-row">
            <Link
              href="/work"
              prefetch={false}
              className="inline-link"
              data-analytics-event="view_work_click"
              data-analytics-location="home_work_grid"
            >
              Explore all case studies
            </Link>{" "}
            <Link href="/blog" prefetch={false} className="inline-link">
              and read product insights on the blog
            </Link>
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>PeacePad</h2>
            <p>
              PeacePad is an{" "}
              <Link href="/peacepad" prefetch={false} className="inline-link">
                AI communication platform
              </Link>{" "}
              designed to help users choose calmer responses in high-stakes conversations.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/peacepad" prefetch={false} className="inline-link">
              Read the PeacePad overview
            </Link>
            {peacePadProject ? (
              <>
                {" "}
                <Link href={`/work/${peacePadProject.slug}`} prefetch={false} className="inline-link">
                  or view the case study
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <div className="section-heading">
            <h2>SayWetin</h2>
            <p>
              SayWetin is a{" "}
              <Link href="/saywetin" prefetch={false} className="inline-link">
                Nigerian music AI
              </Link>{" "}
              product combining audio recognition with local language and cultural context.
            </p>
          </div>
          <p className="section-link-row">
            <Link href="/saywetin" prefetch={false} className="inline-link">
              Read the SayWetin overview
            </Link>
            {sayWetinProject ? (
              <>
                {" "}
                <Link href={`/work/${sayWetinProject.slug}`} prefetch={false} className="inline-link">
                  or view the case study
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="container">
          <CTABanner
            title="Have an idea to ship?"
            description="Una Labs helps founders and teams build practical AI products with speed, clarity, and technical depth."
            primaryLabel="Explore Our Work"
            primaryHref="/work"
            secondaryLabel="View Products"
            secondaryHref="/products"
          />
        </div>
      </section>
    </>
  );
}
