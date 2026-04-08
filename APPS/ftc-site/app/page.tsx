export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

import type { Metadata } from "next";
import { Suspense } from "react";
import AteamWorkflowClient from "./ateam/AteamWorkflowClient";

export const metadata: Metadata = {
  title: "Una Labs | Type your idea. Get a structured plan.",
  description:
    "Una Labs is ATEAM — the AI workflow engine that turns a rough idea into a scoped plan, decision-ready output, and a clear next step. Start by typing your idea.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return (
    <div className="hp-ateam-surface">
      <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
        <AteamWorkflowClient basePath="/" />
      </Suspense>
    </div>
  );
}
