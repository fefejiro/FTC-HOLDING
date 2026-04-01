export const dynamic = "force-static";

import type { Metadata } from "next";
import HomePageExperience from "./components/HomePageExperience";

export const metadata: Metadata = {
  title: "Una Labs | Products, Client Launches, and AI Workflow Systems",
  description:
    "Una Labs is the umbrella studio for shipped products, client launches, and ATEAM-guided workflow systems. Explore what the studio builds before diving into the dedicated ATEAM page.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return <HomePageExperience />;
}
