import { Suspense } from "react";
import AteamWorkflowClient from "../ateam/AteamWorkflowClient";

type AteamLandingExperienceProps = {
  basePath?: string;
};

export default function AteamLandingExperience({
  basePath = "/ateam",
}: AteamLandingExperienceProps) {
  return (
    <Suspense fallback={<div className="container page-content ateam-page">Loading ATEAM workflow...</div>}>
      <AteamWorkflowClient basePath={basePath} />
    </Suspense>
  );
}
