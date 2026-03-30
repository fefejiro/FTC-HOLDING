export const dynamic = "force-static";

import type { Metadata } from "next";
import AteamLandingExperience from "./components/AteamLandingExperience";

export const metadata: Metadata = {
  title: "Una Labs - AI Build Lab | Fast Websites, Lead Systems & ATEAM Workflows",
  description:
    "Una Labs is an operator-led AI build lab delivering fast websites, lead automation, and ATEAM-guided workflows. Drop an idea into ATEAM and move into a real build path.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return <AteamLandingExperience basePath="/" />;
}
