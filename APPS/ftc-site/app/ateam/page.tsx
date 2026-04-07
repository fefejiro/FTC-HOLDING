export const dynamic = "force-static";

import type { Metadata } from "next";
import AteamLandingExperience from "../components/AteamLandingExperience";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "Use ATEAM to turn a rough request into a structured plan, human approval point, and decision-ready output with visible workflow state.",
  alternates: {
    canonical: "/ateam"
  }
};

export default function AteamPage() {
  return <AteamLandingExperience basePath="/ateam" />;
}
