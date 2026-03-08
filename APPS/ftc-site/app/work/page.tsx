import { Suspense } from "react";
import WorkPageClient from "./WorkPageClient";

export const metadata = {
  title: "Work | Una Labs",
  description: "Portfolio and case studies for Una Labs projects and capability systems."
};

export default function WorkPage() {
  return (
    <Suspense fallback={<div className="container page-content"><h1>Work</h1></div>}>
      <WorkPageClient />
    </Suspense>
  );
}
