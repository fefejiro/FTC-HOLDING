import type { Metadata } from "next";
import DroneServiceInquiryForm from "../../components/DroneServiceInquiryForm";

const serviceAreas = [
  {
    title: "Real Estate Aerial Photography",
    description:
      "High-quality aerial images and video for listings, property showcases, and marketing materials."
  },
  {
    title: "Roof & Property Inspection Support",
    description:
      "Aerial visuals that help assess roofs, exterior conditions, and hard-to-reach areas safely."
  },
  {
    title: "Business Marketing Footage",
    description:
      "Cinematic aerial footage for websites, social media, and promotional campaigns."
  },
  {
    title: "Construction / Site Progress Documentation",
    description:
      "Track site progress with repeatable aerial photo and video captures over time."
  }
] as const;

const deliverables = [
  "4K aerial video clips for listings, inspections, and promotions",
  "High-resolution aerial photos for web, print, and documentation",
  "Edited highlight footage for websites and campaigns",
  "Short-form social media clips for fast publishing",
  "Flyover shots that show access, layout, and surroundings",
  "Exterior overview coverage for business, site, and property context"
] as const;

const servicePackages = [
  {
    name: "Starter Package",
    price: "$150",
    items: [
      "Short on-site session",
      "Up to 10 edited aerial photos",
      "1 short aerial video clip"
    ]
  },
  {
    name: "Standard Package",
    price: "$300",
    items: [
      "Extended aerial coverage",
      "Up to 20 edited aerial photos",
      "1 edited highlight video"
    ]
  },
  {
    name: "Premium Package",
    price: "$500",
    items: [
      "Full aerial coverage session",
      "Photo + video bundle",
      "Cinematic edited video",
      "Expanded deliverables for marketing or documentation"
    ]
  }
] as const;

const reasonsToWorkWithUnalabs = [
  "High-quality aerial visuals",
  "Fast turnaround",
  "Business-focused deliverables",
  "Clean editing and presentation",
  "Suitable for listings, inspections, and marketing"
] as const;

// Future real media assets should be added under:
// /public/images/drone-services/
// Replace the placeholder cards below with real stills or short reels when available.
const portfolioPlaceholders = [
  "Roof inspection sample",
  "Property aerial sample",
  "Marketing flyover sample"
] as const;

const faqs = [
  {
    question: "What areas do you serve?",
    answer:
      "Local service requests are prioritized. Send the site location in your inquiry and Una Labs will confirm availability."
  },
  {
    question: "How quickly can you deliver footage?",
    answer:
      "Many standard jobs can be turned around within 24 to 72 hours after capture, depending on scope, weather, and editing needs."
  },
  {
    question: "Do you offer custom quotes?",
    answer:
      "Yes. Larger properties, repeat documentation work, and ongoing content needs can be quoted separately."
  }
] as const;

export const metadata: Metadata = {
  title: "Professional Drone Photography & Video | Una Labs",
  description:
    "Professional aerial photography and video for real estate, inspections, business marketing, and site documentation.",
  alternates: {
    canonical: "https://unalabs.cloud/services/drone"
  },
  openGraph: {
    title: "Professional Drone Photography & Video | Una Labs",
    description:
      "Aerial visuals for real estate, inspections, business marketing, and property documentation.",
    url: "https://unalabs.cloud/services/drone"
  }
};

export default function DroneServicesPage() {
  return (
    <div className="container page-content drone-page">
      <section className="hero drone-hero fade-on-scroll">
        <div className="hero-noise" aria-hidden="true" />
        <div className="hero-grid drone-hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Drone Services</p>
            <h1>Professional Drone Photography &amp; Video</h1>
            <p className="lead">
              Aerial visuals for real estate, inspections, business marketing, and property
              documentation.
            </p>
            <p className="hero-description">
              Fast, professional aerial imagery for businesses, listings, inspections, and
              promotional content.
            </p>
            <div className="hero-actions">
              <a href="#request-drone-service" className="btn btn-primary">
                Request Drone Service
              </a>
              <a href="#service-packages" className="btn btn-secondary">
                View Service Packages
              </a>
            </div>
          </div>

          <div className="drone-placeholder-panel" aria-label="Drone service media placeholder">
            <div className="drone-placeholder-frame">
              <p className="card-kicker">Media Placeholder</p>
              <h2>Future aerial reel or featured still</h2>
              <p>
                This area is reserved for real portfolio footage once approved media is ready
                to publish.
              </p>
            </div>
            <p className="drone-placeholder-note">
              Prepared for future image or short video insertion without changing the page
              structure.
            </p>
          </div>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">What We Offer</p>
          <h2>Professional aerial support for real business use cases</h2>
          <p>
            The focus is practical aerial media and inspection support that helps businesses
            market properties, review site conditions, and document progress clearly.
          </p>
        </div>
        <div className="drone-service-grid">
          {serviceAreas.map((service) => (
            <article key={service.title} className="card drone-service-card">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">What You Receive</p>
          <h2>Deliverables prepared for business use</h2>
          <p>
            Every session is structured around usable marketing, inspection, or documentation
            outputs rather than raw, unorganized files.
          </p>
        </div>
        <div className="drone-deliverables-grid">
          {deliverables.map((item) => (
            <article key={item} className="card drone-deliverable-card">
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section fade-on-scroll" id="service-packages">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Service Packages</p>
          <h2>Startup-friendly pricing for local traction</h2>
          <p>
            These public packages give clients a clear starting point. Custom quotes are
            available for larger sites, repeat visits, and ongoing work.
          </p>
        </div>
        <div className="drone-package-grid">
          {servicePackages.map((pkg) => (
            <article key={pkg.name} className="card drone-package-card">
              <p className="card-kicker">Package</p>
              <h3>{pkg.name}</h3>
              <p className="drone-price">{pkg.price}</p>
              <ul className="feature-list drone-package-list">
                {pkg.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="drone-package-note">
          Custom quotes are available for larger properties, repeat documentation, and
          broader marketing campaigns.
        </p>
      </section>

      <section className="section fade-on-scroll">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Why Work With Unalabs</p>
          <h2>Business-oriented delivery, not hobbyist output</h2>
          <p>
            Unalabs positions drone work around clear outputs that support sales, visibility,
            inspection workflows, and documentation needs.
          </p>
        </div>
        <article className="card drone-reasons-card">
          <ul className="drone-reasons-list">
            {reasonsToWorkWithUnalabs.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section fade-on-scroll">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Recent Aerial Work</p>
          <h2>Portfolio placeholders ready for real media</h2>
          <p>
            Real media will be connected here once approved stills and clips are ready to
            publish.
          </p>
        </div>
        <div className="drone-portfolio-grid">
          {portfolioPlaceholders.map((item) => (
            <article key={item} className="card drone-portfolio-card">
              <div className="drone-portfolio-slot" aria-hidden="true" />
              <h3>{item}</h3>
              <p>Placeholder slot reserved for future real photo or video assets.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section fade-on-scroll" id="request-drone-service">
        <div className="drone-inquiry-grid">
          <div className="drone-inquiry-copy">
            <div className="section-heading home-section-heading">
              <p className="eyebrow">Request Drone Service</p>
              <h2>Start with the job details</h2>
              <p>
                Tell us what you need, where the property or site is located, and the kind
                of footage or inspection support you are looking for.
              </p>
            </div>
            <article className="card drone-section-card">
              <h3>Best fit for this page</h3>
              <ul className="feature-list">
                <li>Real estate visuals and listing support</li>
                <li>Roof and property inspection support</li>
                <li>Business marketing footage</li>
                <li>Construction and site documentation</li>
              </ul>
            </article>
          </div>

          <section className="intake-card home-intake-card">
            <h2>Request Drone Service</h2>
            <p className="muted">
              Share the service type, location, and project details. Una Labs will review the
              request and reply with the next step.
            </p>
            <DroneServiceInquiryForm />
          </section>
        </div>
      </section>

      <section className="section fade-on-scroll">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Practical questions before booking</h2>
        </div>
        <div className="drone-faq-grid">
          {faqs.map((item) => (
            <article key={item.question} className="card drone-faq-card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
