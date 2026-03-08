import type { Metadata } from "next";
import React from "react";
import { SITE_URL } from "../lib/site";
import "../styles/globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Analytics from "./components/Analytics";

const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Una Labs | Intelligent software and creative AI systems",
  description:
    "Una Labs builds AI tools, automation systems, and digital products for businesses, creators, and startups.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Una Labs | Intelligent software and creative AI systems",
    description:
      "Una Labs builds AI tools, automation systems, and digital products for businesses, creators, and startups.",
    url: SITE_URL,
    siteName: "Una Labs"
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
      <body>
        <Header />
        <main className="main-shell">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
