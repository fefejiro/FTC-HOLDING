import type { Metadata } from "next";
import Link from "next/link";
import CTABanner from "../components/CTABanner";
import { networkingProfile } from "../../lib/content";

export const metadata: Metadata = {
  title: "Connect | Una Labs",
  description:
    "Quick contact exchange and portfolio links for Fejiro Efiuvwere and Una Labs.",
  alternates: {
    canonical: "/connect"
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true
    }
  }
};

export default function ConnectPage() {
  return (
    <div className="container page-content connect-page">
      <div className="connect-top-grid">
        <section className="connect-card connect-identity">
          <p className="card-kicker">Networking Hub</p>
          <h1>{networkingProfile.fullName}</h1>
          <p className="connect-title">{networkingProfile.title}</p>
          <p className="connect-studio">
            {networkingProfile.studioName} | {networkingProfile.studioLine}
          </p>
          <p className="muted">
            Quick exchange page for contact details, portfolio access, and a scannable
            hub QR.
          </p>
        </section>

        <section className="connect-card connect-qr">
          <h2>QR for Fast Sharing</h2>
          <p className="muted">
            Scan this to open the networking hub directly on mobile.
          </p>
          <div className="connect-qr-grid">
            <img
              src="/connect/qr.svg"
              alt="QR code linking to unalabs.cloud/connect"
              width={220}
              height={220}
              loading="lazy"
              decoding="async"
            />
            <div className="hero-actions connect-qr-actions">
              <a
                href="/connect/qr.svg"
                className="btn btn-secondary"
                download="unalabs-connect-qr.svg"
                data-analytics-event="connect_qr_click"
                data-analytics-location="connect_qr"
                data-analytics-label="download_qr"
              >
                Download QR
              </a>
              <a
                href={`${networkingProfile.networkHubUrl}?src=qr`}
                className="btn btn-secondary"
                data-analytics-event="connect_qr_click"
                data-analytics-location="connect_qr"
                data-analytics-label="open_qr_url"
              >
                Open Hub URL
              </a>
            </div>
          </div>
        </section>
      </div>

      <div className="connect-bottom-grid">
        <section className="connect-card">
          <h2>Quick Actions</h2>
          <div className="connect-actions">
            <a
              href="/connect/vcard"
              className="btn btn-primary"
              download="fejiro-efiuvwere.vcf"
              data-analytics-event="connect_action_click"
              data-analytics-location="connect_quick_actions"
              data-analytics-label="save_contact"
            >
              Save Contact
            </a>
            <a
              href={`tel:${networkingProfile.phoneE164}`}
              className="btn btn-secondary"
              data-analytics-event="connect_action_click"
              data-analytics-location="connect_quick_actions"
              data-analytics-label="call"
            >
              Call
            </a>
            <a
              href={`mailto:${networkingProfile.email}`}
              className="btn btn-secondary"
              data-analytics-event="connect_action_click"
              data-analytics-location="connect_quick_actions"
              data-analytics-label="email"
            >
              Email
            </a>
            <a
              href={networkingProfile.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              data-analytics-event="connect_action_click"
              data-analytics-location="connect_quick_actions"
              data-analytics-label="linkedin"
            >
              LinkedIn
            </a>
            <Link
              href={networkingProfile.startProjectHref}
              className="btn btn-secondary"
              data-analytics-event="connect_action_click"
              data-analytics-location="connect_quick_actions"
              data-analytics-label="start_project"
            >
              Start a Project
            </Link>
          </div>
          <p className="connect-direct-contact">
            <strong>Phone:</strong> {networkingProfile.phoneDisplay} |{" "}
            <strong>Email:</strong> {networkingProfile.email}
          </p>
        </section>

        <section className="connect-card">
          <h2>Portfolio Links</h2>
          <ul className="connect-link-list">
            {networkingProfile.portfolioLinks.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-analytics-event="connect_portfolio_click"
                  data-analytics-location="connect_portfolio"
                  data-analytics-label={item.label}
                >
                  {item.label}
                </a>
                <p className="muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <CTABanner
        title="Need help building your next system?"
        description="If this connection came through networking, share a quick project brief and Una Labs will respond with practical next steps."
        primaryLabel="Start a Project"
        primaryHref={networkingProfile.startProjectHref}
        secondaryLabel="View Work"
        secondaryHref="/work"
      />
    </div>
  );
}
