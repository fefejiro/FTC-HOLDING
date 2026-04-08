export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

import type { Metadata } from "next";
import HomePageExperience from "./components/HomePageExperience";

export const metadata: Metadata = {
  title: "Una Labs | Trusted Workflow Systems, Product Proof, and Delivery",
  description:
    "Una Labs is the public trust layer around shipped products, client launches, and ATEAM — the standalone operating system for rough requests that still need structure.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return <HomePageExperience />;
}
