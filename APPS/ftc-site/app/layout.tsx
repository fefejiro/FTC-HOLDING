import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, Space_Grotesk } from "next/font/google";
import React from "react";
import { SITE_URL } from "../lib/site";
import { siteLinks } from "../lib/siteLinks";
import "../styles/globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

const Analytics = dynamic(() => import("./components/Analytics"), { ssr: false });

const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;
const GOOGLE_ANALYTICS_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk"
});

const defaultTitle = "Una Labs \u2014 Creative AI Studio Building AI Products";
const defaultDescription =
  "Una Labs is a creative AI studio building real-world AI products including PeacePad and SayWetin. Explore our work in automation, AI tools, and product innovation.";
const defaultOgImage = `${SITE_URL}/opengraph-image`;

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Una Labs",
  url: "https://unalabs.cloud",
  logo: "https://unalabs.cloud/logo.png",
  sameAs: [
    siteLinks.instagram,
    siteLinks.linkedIn
  ],
  description: "Creative AI studio building real-world AI tools."
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: defaultTitle,
  description: defaultDescription,
  keywords: [
    "Una Labs",
    "Creative AI Studio",
    "AI Product Development",
    "Automation Systems",
    "PeacePad",
    "SayWetin",
    "ATEAM",
    "AI communication platform",
    "Nigerian music AI"
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  alternates: {
    canonical: "./"
  },
  icons: {
    icon: "/brand/una-mark.svg",
    shortcut: "/brand/una-mark.svg"
  },
  openGraph: {
    type: "website",
    title: defaultTitle,
    description: defaultDescription,
    url: SITE_URL,
    siteName: "Una Labs",
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Una Labs - Creative AI Studio - Building AI products"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage]
  },
  verification: GOOGLE_SITE_VERIFICATION
    ? {
        google: GOOGLE_SITE_VERIFICATION
      }
    : undefined
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData)
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <Header />
        <main className="main-shell">{children}</main>
        <Footer />
        {GOOGLE_ANALYTICS_ID ? <Analytics /> : null}
      </body>
    </html>
  );
}
