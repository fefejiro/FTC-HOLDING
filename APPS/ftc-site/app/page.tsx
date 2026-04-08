export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

import type { Metadata } from "next";
import HomePageExperience from "./components/HomePageExperience";

export const metadata: Metadata = {
  title: "Una Labs | Trusted AI Workflow Systems, Products, and Delivery",
  description:
    "Una Labs is the parent platform for trusted AI workflow systems, shipped products, and client delivery infrastructure. Explore ATEAM, public product proof, and live launch work.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return <HomePageExperience />;
}
