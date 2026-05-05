export const dynamic = "force-static";
import type { Metadata } from "next";
import GardenPortalAccessPanel from "../../components/garden-cleaners/GardenPortalAccessPanel";
import { gardenCleanersKeywords } from "../../../lib/gardenCleaners";

export const metadata: Metadata = {
  title: "Client Portal | Garden Cleaners",
  description:
    "Sign in to your Garden Cleaners client portal to view your quote status, job updates, and service history.",
  keywords: gardenCleanersKeywords,
  icons: {
    icon: "/brand/garden-cleaners-mark.svg",
    shortcut: "/brand/garden-cleaners-mark.svg",
    apple: "/brand/garden-cleaners-mark.svg"
  },
  alternates: { canonical: "https://gardencleaners.ca/garden-cleaners/portal" },
  openGraph: {
    title: "Client Portal | Garden Cleaners",
    description:
      "Sign in to your Garden Cleaners client portal to view your quote status, job updates, and service history.",
    url: "https://gardencleaners.ca/garden-cleaners/portal",
    siteName: "Garden Cleaners",
    type: "website",
    images: [
      {
        url: "https://gardencleaners.ca/images/garden-cleaners/gc-office-space-clean.png",
        width: 1200,
        height: 630,
        alt: "Garden Cleaners client portal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Client Portal | Garden Cleaners",
    description:
      "Sign in to your Garden Cleaners client portal to view your quote status, job updates, and service history.",
    images: ["https://gardencleaners.ca/images/garden-cleaners/gc-office-space-clean.png"]
  }
};

export default function GardenClientPortalPage() {
  return (
    <div className="garden-site-shell">
      <div className="container page-content garden-page-content">
        <GardenPortalAccessPanel />
      </div>
    </div>
  );
}
