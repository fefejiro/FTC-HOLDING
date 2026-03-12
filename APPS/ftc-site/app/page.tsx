import type { Metadata } from "next";
import Link from "next/link";
import WorkIntakeForm from "./components/WorkIntakeForm";

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

const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.saywetin.app";

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
                    <li>PeacePad</li>
                    <li>SayWetin (Live on Google Play)</li>
                  </ul>
                </div>
              </div>

              <div className="hero-collage home-hero-panel">
                <p className="collage-label">Studio Snapshot</p>
                <div className="home-hero-panel-grid">
                  <article className="collage-card">
                    <h2>Products in market</h2>
                    <p>PeacePad and SayWetin show what ships when AI is treated like product, not hype.</p>
                  </article>
                  <article className="collage-card">
                    <h2>Clear delivery model</h2>
                    <p>We scope the problem, build the right tool, and refine it with real-world feedback.</p>
                  </article>
                  <article className="collage-card">
                    <h2>Fast launch windows</h2>
                    <p>Most focused builds move from idea to first release in 4-8 weeks.</p>
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
              Our product work proves the studio can take AI ideas from concept to usable,
              market-facing software.
            </p>
          </div>
          <div className="product-grid">
            <article className="card product-spotlight-card">
              <p className="status-pill">LIVE</p>
              <h3>PeacePad</h3>
              <p>
                PeacePad intervenes before a message is sent, helping users pause and choose
                a more constructive next action.
              </p>
              <Link href="/peacepad" prefetch={false} className="btn btn-secondary product-spotlight-link">
                View PeacePad
              </Link>
            </article>

            <article className="card product-spotlight-card">
              <p className="status-pill">LIVE ON GOOGLE PLAY</p>
              <h3>SayWetin</h3>
              <p>
                SayWetin combines audio recognition with cultural interpretation to explain
                Nigerian music, slang, and context.
              </p>
              <ul className="feature-list compact-feature-list">
                <li>Recognize Nigerian songs</li>
                <li>Explain slang and cultural meaning</li>
                <li>Provide contextual interpretation</li>
              </ul>
              <div className="product-actions">
                <Link href="/saywetin" prefetch={false} className="btn btn-secondary product-spotlight-link">
                  View SayWetin
                </Link>
                <a
                  href={googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary product-spotlight-link"
                >
                  Get it on Google Play
                </a>
              </div>
              <a
                href={googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="play-badge"
                aria-label="Get SayWetin on Google Play"
              >
                <span className="play-badge-mark" aria-hidden="true">
                  Play
                </span>
                <span className="play-badge-copy">
                  <span>Available on</span>
                  <strong>Google Play</strong>
                </span>
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll" id="client-work">
        <div className="container">
          <div className="section-heading home-section-heading">
            <p className="eyebrow">Client Work</p>
            <h2>Visibility and growth work for service businesses</h2>
            <p>
              Beyond studio products, Unalabs also improves digital visibility for client
              businesses that need better discovery and search performance.
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
            <Link href="/work" prefetch={false} className="inline-link">
              View Case Study
            </Link>
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
              <h2>Tell us what you want to build</h2>
              <p>
                Tell us what you want to build, your budget range, and your ideal timeline.
              </p>
            </div>
            <p className="intake-reassurance">
              No obligation. We review every request and reply within 24 hours.
            </p>
            <div className="card intake-note-card">
              <h3>Built by the team behind PeacePad and SayWetin.</h3>
              <p>
                Best fit: AI automations, internal tools, assistants, product MVPs, and
                narrow experiments that need a fast, high-quality launch path.
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

