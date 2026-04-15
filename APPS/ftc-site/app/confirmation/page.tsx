export const runtime = "edge";

import type { Metadata } from "next";
import { Suspense } from "react";
import ConfirmationClient from "./ConfirmationClient";

export const metadata: Metadata = {
  title: "Build Started | Una Labs",
  description: "Your project has been received. Build kicks off within 24 hours.",
  robots: { index: false }
};

export default function ConfirmationPage() {
  return (
    <div className="confirmation-page main-shell">
      <section className="section section-hero">
        <div className="container confirmation-container">
          <Suspense fallback={<div className="confirmation-loading">Loading…</div>}>
            <ConfirmationClient />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
