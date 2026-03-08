import type { Metadata } from "next";
import React from "react";
import { SITE_URL } from "../lib/site";
import "../styles/globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FTC | Intelligent software and creative AI systems",
  description:
    "FTC builds AI tools, automation systems, and digital products for businesses, creators, and startups.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "FTC | Intelligent software and creative AI systems",
    description:
      "FTC builds AI tools, automation systems, and digital products for businesses, creators, and startups.",
    url: SITE_URL,
    siteName: "FTC"
  }
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
      </body>
    </html>
  );
}
