import type { Metadata } from "next";
import { Suspense } from "react";
import AteamWorkflowClient from "./AteamWorkflowClient";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "Use ATEAM inside Una Labs to turn a rough idea into a structured run, visible progress, preview artifacts, and a clear project handoff.",
  alternates: {
    canonical: "/ateam"
  }
};

export default function AteamPage() {
  return (
    <Suspense fallback={<div className="container page-content ateam-page">Loading ATEAM workflow...</div>}>
      <AteamWorkflowClient />
    </Suspense>
  );
}
