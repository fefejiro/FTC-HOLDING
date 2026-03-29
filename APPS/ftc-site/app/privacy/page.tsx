export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Una Labs",
  description: "Privacy policies for Una Labs services, products, and website experiences."
};

export default function PrivacyPage() {
  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="page-intro">
        Una Labs is committed to clear, practical privacy practices. This page
        covers our website and links to product-specific privacy policies.
      </p>

      <h2>1. Contact</h2>
      <p>
        For privacy questions, data requests, or corrections, contact{" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>

      <h2>2. Product-Specific Policies</h2>
      <p>
        Some Una Labs products include additional details about location data,
        operational workflows, and app-specific processing.
      </p>
      <ul>
        <li>
          <Link href="/privacy/emergency-prompt">
            Emergency Prompt - Ottawa Roadside Privacy Policy
          </Link>
        </li>
      </ul>

      <h2>3. Website Data</h2>
      <p>
        We collect basic website analytics, usage diagnostics, and voluntary
        contact-form details to operate and improve our services. We do not
        sell personal information.
      </p>

      <h2>4. Your Rights</h2>
      <p>
        You may request access, correction, or deletion of personal information
        by emailing <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>
    </div>
  );
}
