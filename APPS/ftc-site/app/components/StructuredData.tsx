"use client";

import { useEffect } from "react";

const unaLabsOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Una Labs",
  url: "https://unalabs.cloud",
  logo: "https://unalabs.cloud/logo.png",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "hello@unalabs.cloud",
      areaServed: "CA",
      availableLanguage: ["en"]
    }
  ],
  description: "Trusted AI workflow systems, lead operations, and delivery infrastructure."
};

const ogTradesOrg = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "OG Trades Academy",
  url: "https://www.ogtradesacademy.com",
  logo: "https://www.ogtradesacademy.com/images/brand/og-trades-logo.jpg",
  description:
    "Founder-led forex education, mentorship, and community for serious traders.",
  areaServed: "Worldwide",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@unalabs.cloud",
      availableLanguage: ["en"]
    }
  ]
};

const SCRIPT_ID = "org-structured-data";

export default function StructuredData() {
  useEffect(() => {
    const isOgTrades = window.location.pathname.startsWith("/og-trades-academy");
    const data = isOgTrades ? ogTradesOrg : unaLabsOrg;
    let el = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = SCRIPT_ID;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }, []);
  return null;
}
