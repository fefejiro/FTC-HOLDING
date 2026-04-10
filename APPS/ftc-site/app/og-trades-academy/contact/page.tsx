export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import OgTradesEnrollmentForm from "../../components/og-trades/OgTradesEnrollmentForm";
import { getOgTradesMetadata, ogTradesAcademyConfig } from "../../../lib/ogTradesAcademy";
import { getRequestHost } from "../../../lib/requestHost";

export function generateMetadata(): Metadata {
  const requestHost = getRequestHost();
  return getOgTradesMetadata({
    title: "Contact and Enrollment | OG_Trades Academy",
    description:
      "Contact OG_Trades Academy, request enrollment details, and connect through the active social and community channels.",
    pathname: "/contact",
    host: requestHost
  });
}

export default function OgTradesContactPage() {
  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <div className="og-form-layout">
          <section className="card">
            <p className="eyebrow">Contact and enrollment</p>
            <h1>Give interested traders a cleaner way to raise a hand.</h1>
            <p className="page-intro">
              This page creates a first-party inquiry path that can later feed email nurture, onboarding, waitlists, or direct course follow-up.
            </p>
            <OgTradesEnrollmentForm />
          </section>

          <aside className="card og-contact-card">
            <div className="og-avatar-frame">
              <img
                src={ogTradesAcademyConfig.profileImageUrl}
                alt="OG_Trades Academy founder profile"
                className="og-founder-avatar"
              />
            </div>
            <h2>Current active links</h2>
            <div className="og-social-list">
              <a href={ogTradesAcademyConfig.coursePurchaseUrl} target="_blank" rel="noreferrer">
                <strong>Current checkout</strong>
                <span>{ogTradesAcademyConfig.priceNow} course offer</span>
              </a>
              <a href={ogTradesAcademyConfig.youtubeUrl} target="_blank" rel="noreferrer">
                <strong>YouTube</strong>
                <span>@OG_TradesAcademy</span>
              </a>
              <a href={ogTradesAcademyConfig.communityUrl} target="_blank" rel="noreferrer">
                <strong>Community hub</strong>
                <span>tinyurl.com/ogtradesacademy</span>
              </a>
              <a href={ogTradesAcademyConfig.beaconsUrl} target="_blank" rel="noreferrer">
                <strong>Beacons profile</strong>
                <span>ogtradesacademy.com</span>
              </a>
            </div>
            <p className="og-disclaimer">{ogTradesAcademyConfig.disclaimer}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
