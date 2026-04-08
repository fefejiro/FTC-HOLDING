export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Una Labs | Type your idea. Get a structured plan.",
  description:
    "Una Labs is ATEAM — the AI workflow engine that turns a rough idea into a scoped plan, decision-ready output, and a clear next step. Start by typing your idea.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  redirect("/ateam");
}
