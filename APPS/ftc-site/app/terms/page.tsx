export const dynamic = "force-static";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Una Labs",
  description: "Terms of use for Una Labs products and services."
};

export default function TermsPage() {
  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Terms of Use</h1>
      <p className="page-intro">
        Terms are currently being finalized. For any questions, contact{" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>
    </div>
  );
}
