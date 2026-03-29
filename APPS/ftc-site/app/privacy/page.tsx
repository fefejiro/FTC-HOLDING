export const dynamic = "force-static";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Una Labs",
  description: "Privacy policy for Una Labs services and website experiences."
};

export default function PrivacyPage() {
  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="page-intro">
        This policy page is being finalized. For immediate privacy questions, contact{" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>
    </div>
  );
}
