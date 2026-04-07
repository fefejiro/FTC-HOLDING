"use client";

import { usePathname } from "next/navigation";
import { gardenCleanersConfig } from "../../lib/gardenCleaners";
import { ogTradesAcademyConfig } from "../../lib/ogTradesAcademy";
import { polarAnchorConfig } from "../../lib/polarAnchor";
import SocialIcons from "./SocialIcons";

export default function Footer() {
  const pathname = usePathname();
  const isGardenSite = pathname?.startsWith("/garden-cleaners") ?? false;
  const isOgTradesSite = pathname?.startsWith("/og-trades-academy") ?? false;
  const isPolarSite = pathname?.startsWith("/polar-anchor") ?? false;

  if (isGardenSite) {
    return (
      <footer className="garden-site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-title">{gardenCleanersConfig.companyName}</p>
              <p className="footer-subtitle">Professional cleaning services</p>
              <p className="footer-copy">
                Reliable residential and commercial cleaning for Oshawa, Durham Region, and surrounding areas.
              </p>
            </div>
            <div className="footer-links">
              {gardenCleanersConfig.nav.map((item) => (
                <a key={item.href} href={item.href}>{item.label}</a>
              ))}
            </div>
            <div className="footer-links">
              <a href={gardenCleanersConfig.phoneHref}>{gardenCleanersConfig.phoneDisplay}</a>
              <a href={gardenCleanersConfig.emailHref}>{gardenCleanersConfig.email}</a>
              <span>{gardenCleanersConfig.addressLine}</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (isOgTradesSite) {
    return (
      <footer className="og-site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-title">{ogTradesAcademyConfig.companyName}</p>
              <p className="footer-subtitle">{ogTradesAcademyConfig.tagline}</p>
              <p className="footer-copy">
                Beginner forex education with a stronger focus on risk management, structure, psychology, and prop-firm-aware execution.
              </p>
            </div>
            <div className="footer-links">
              {ogTradesAcademyConfig.nav.map((item) => (
                <a key={item.href} href={item.href}>{item.label}</a>
              ))}
            </div>
            <div className="footer-links">
              <a href={ogTradesAcademyConfig.youtubeUrl}>YouTube</a>
              <a href={ogTradesAcademyConfig.tiktokUrl}>TikTok</a>
              <a href={ogTradesAcademyConfig.beaconsUrl}>Beacons</a>
              <a href={ogTradesAcademyConfig.communityUrl}>Community Hub</a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (isPolarSite) {
    return (
      <footer className="polar-site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-title">{polarAnchorConfig.companyName}</p>
              <p className="footer-subtitle">{polarAnchorConfig.tagline}</p>
              <p className="footer-copy">
                Freight forwarding, transportation, warehousing, customs support, and import-export logistics coordination for businesses across Canada.
              </p>
            </div>
            <div className="footer-links">
              {polarAnchorConfig.nav.map((item) => (
                <a key={item.href} href={item.href}>{item.label}</a>
              ))}
            </div>
            <div className="footer-links">
              <a href={polarAnchorConfig.phoneHref}>{polarAnchorConfig.phoneDisplay}</a>
              <a href={polarAnchorConfig.emailHref}>{polarAnchorConfig.email}</a>
              <span>{polarAnchorConfig.addressLine}</span>
              <span>Serving Canada logistics clients</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-title">Una Labs</p>
            <p className="footer-subtitle">Trusted workflow systems</p>
            <p className="footer-copy">
              Trusted AI workflow systems, lead operations, and delivery infrastructure for teams
              that need a clearer next move.
            </p>
            <p className="footer-powered">Powered by ATEAM | Built with Next.js, React, and Supabase.</p>
            <div className="footer-contact-row">
              <a className="footer-email" href="mailto:hello@unalabs.cloud">
                hello@unalabs.cloud
              </a>
              <span className="footer-status-pill">
                <span className="footer-status-dot" aria-hidden="true" />
                Currently accepting new projects
              </span>
            </div>
            <SocialIcons />
          </div>
          <div className="footer-links">
            <a href="/products">Products</a>
            <a href="/work">Client Launches</a>
            <a href="/ateam">Open ATEAM</a>
            <a href="/products/dispatch">Dispatch</a>
            <a href="/peacepad">PeacePad</a>
            <a href="/saywetin">SayWetin</a>
            <a href="/work-with-ftc">Start a Project</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/privacy/emergency-prompt">Emergency Prompt Privacy</a>
            <a href="/terms">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

