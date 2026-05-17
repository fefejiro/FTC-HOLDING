import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, Space_Grotesk } from "next/font/google";
import React from "react";
import { SITE_URL } from "../lib/site";
import { getRequestHost } from "../lib/requestHost";
import "../styles/globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollReveal from "./components/ScrollReveal";
import ChatWidget from "./components/ChatWidget";
import RootBrandRouter from "./components/RootBrandRouter";

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

const defaultTitle = "Una Labs | Trusted AI Workflow Systems and Delivery Infrastructure";
const defaultDescription =
  "Una Labs designs trusted AI workflow systems, lead operations, and delivery infrastructure. ATEAM turns rough requests into scoped plans, human-approved outputs, and decision-ready next steps.";
const defaultOgImage = `${SITE_URL}/opengraph-image`;



export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: defaultTitle,
  description: defaultDescription,
  keywords: [
    "Una Labs",
    "AI Build Lab Canada",
    "Fast Website Development Studio",
    "MVP Launch Studio",
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
        alt: "Una Labs trusted AI workflow systems and delivery infrastructure"
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
  const requestHost = getRequestHost();

  return (
    <html lang="en">
      <head>
        <meta name="ftc-deploy-marker" content="ftc-site-main-2026-05-08-unalabs-sync-check" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <ScrollReveal />
        <RootBrandRouter>
          <Header initialHost={requestHost} />
          <main className="main-shell">{children}</main>
          <Footer initialHost={requestHost} />
        </RootBrandRouter>
        {GOOGLE_ANALYTICS_ID ? <Analytics /> : null}
        <ChatWidget />
      </body>
    </html>
  );
}
