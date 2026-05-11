export const dynamic = "force-static";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Una Labs",
  description: "Terms of use for Una Labs products and services."
};

export default function TermsPage() {
  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <div className="container legal-page">
      <p className="sunrise-kicker">Legal</p>
      <h1>Terms of Use</h1>
      <p className="sunrise-lead">
        Terms are currently being finalized. For any questions, contact{" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>
      </div>
    </div>
  );
}
