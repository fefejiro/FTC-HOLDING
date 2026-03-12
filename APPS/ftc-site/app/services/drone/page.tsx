import type { Metadata } from "next";
import DroneServiceInquiryForm from "../../components/DroneServiceInquiryForm";
import { networkingProfile } from "../../../lib/content";

const useCases = [
  "Real Estate Listings",
  "Roof & Property Inspections",
  "Business Marketing Footage",
  "Construction Progress Documentation"
] as const;

const serviceAreas = [
  {
    title: "Real Estate Aerial Photography",
    description:
      "High-quality aerial photos and video for listings and property showcases."
  },
  {
    title: "Roof & Property Inspection Support",
    description: "Capture exterior visuals of roofs and structures safely."
  },
  {
    title: "Business Marketing Footage",
    description: "Cinematic aerial visuals for websites and social media."
  },
  {
    title: "Construction / Site Progress Monitoring",
    description: "Repeatable aerial capture for construction updates."
  }
] as const;

const deliverables = [
  "4K aerial video clips",
  "High-resolution aerial photos",
  "Edited highlight footage",
  "Social media ready clips",
  "Property flyover footage"
] as const;

const servicePackages = [
  {
    name: "Starter Package",
    price: "$150",
    items: [
      "Short on-site aerial session",
      "Up to 10 edited aerial photos",
      "1 short aerial video clip"
    ]
  },
  {
    name: "Standard Package",
    price: "$300",
    items: [
      "Extended aerial coverage",
      "Up to 20 aerial photos",
      "1 edited highlight video"
    ]
  },
  {
    name: "Premium Package",
    price: "$500",
    items: [
      "Full aerial coverage",
      "Photo + video bundle",
      "Cinematic edited highlight video"
    ]
  }
] as const;

const reasonsToWorkWithUnalabs = [
  "Professional aerial visuals",
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
  title: "Professional Aerial Photo & Video Services | Una Labs",
  description:
    "Professional aerial photography and video for real estate, inspections, business marketing, and site documentation in Ottawa and surrounding areas.",
  alternates: {
    canonical: "https://unalabs.cloud/services/drone"
  },
  openGraph: {
    title: "Professional Aerial Photo & Video Services | Una Labs",
    description:
      "Aerial visuals for real estate, inspections, business marketing, and property documentation in Ottawa and surrounding areas.",
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
            <h1>Professional Aerial Photo &amp; Video Services</h1>
            <p className="lead">
              Aerial visuals for real estate, inspections, business marketing, and property
              documentation.
            </p>
            <p className="drone-location-line">Serving Ottawa and surrounding areas.</p>
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
            <p className="drone-pricing-signal">Packages starting at $150.</p>
          </div>

          <div className="drone-placeholder-panel" aria-label="Drone service media placeholder">
            <div className="drone-placeholder-frame">
              <p className="card-kicker">Aerial Portfolio</p>
              <h2>Published project previews coming soon</h2>
              <p>
                Real stills, highlight clips, and featured project media will be shown here
                as approved aerial work becomes available for publishing.
              </p>
            </div>
            <p className="drone-placeholder-note">
              Portfolio samples will be added once release approval is available.
            </p>
          </div>
        </div>
      </section>

      <section className="section drone-use-case-section fade-on-scroll">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Best For</p>
          <h2>Local aerial service use cases</h2>
        </div>
        <div className="drone-use-case-grid">
          {useCases.map((item, index) => (
            <article key={item} className="card drone-use-case-card">
              <span className="drone-use-case-icon" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item}</h3>
            </article>
          ))}
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
          <h2>What You Receive</h2>
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
          <h2>Service packages with clear starting points</h2>
          <p>
            Startup-friendly pricing for local work, with room to quote larger or repeat
            engagements separately.
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
          Custom quotes available for larger projects or repeat work.
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
          <h2>Sample aerial portfolio coming soon.</h2>
          <p>
            Real project footage will appear here once media is approved for publishing.
          </p>
        </div>
        <div className="drone-portfolio-grid">
          {portfolioPlaceholders.map((item) => (
            <article key={item} className="card drone-portfolio-card">
              <div className="drone-portfolio-slot" aria-hidden="true" />
              <h3>{item}</h3>
              <p>Reserved slot for approved aerial photos or short edited clips.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section fade-on-scroll" id="request-drone-service">
        <div className="drone-inquiry-grid">
          <div className="drone-inquiry-copy">
            <div className="section-heading home-section-heading">
              <p className="eyebrow">Request Drone Service</p>
              <h2>Request Drone Service</h2>
              <p>
                Tell us where the property or site is located and the type of aerial footage
                you need.
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
            <p className="drone-quick-contact">
              Need a quick quote?{" "}
              <a className="inline-link" href={`mailto:${networkingProfile.email}`}>
                Email us directly.
              </a>
            </p>
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
