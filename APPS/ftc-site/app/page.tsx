import type { Metadata } from "next";
import HomePageExperience from "./components/HomePageExperience";

export const metadata: Metadata = {
  title: "Una Labs | Rough Request In. Scoped Delivery Out.",
  description:
    "Una Labs takes your need — no matter how unformed — through ATEAM: structured intake, clear scope, a real proposal, and governed delivery execution.",
  alternates: {
    canonical: "https://unalabs.cloud"
  }
};

export default function HomePage() {
  return <HomePageExperience />;
}
