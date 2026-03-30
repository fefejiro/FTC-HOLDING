export const dynamic = "force-static";

import type { Metadata } from "next";
import AteamLandingExperience from "../components/AteamLandingExperience";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "Use ATEAM inside Una Labs to turn a rough idea into a structured run, visible progress, preview artifacts, and a clear project handoff.",
  alternates: {
    canonical: "/ateam"
  }
};

export default function AteamPage() {
  return <AteamLandingExperience basePath="/ateam" />;
}
