import type { Metadata } from "next";
import { Suspense } from "react";
import AteamWorkflowClient from "./AteamWorkflowClient";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "Run the public ATEAM workflow inside Una Labs, then hand the approved pack into real operator Mission Control.",
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
