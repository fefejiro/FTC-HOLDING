export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Una Labs",
  description:
    "Privacy policies for Una Labs services, including Dispatch Emergency Prompt on Google Play."
};

export default function PrivacyPage() {
  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="page-intro">
        Una Labs is committed to clear, practical privacy practices. This page
        covers our website and product-specific privacy practices, including the
        Dispatch Emergency Prompt app distributed on Google Play.
      </p>

      <h2>1. App and Developer Identity</h2>
      <p>
        This privacy policy applies to <strong>Dispatch Emergency Prompt</strong>
        , an Ottawa roadside assistance app operated by <strong>Una Labs</strong>.
        In Google Play listings, the app may also appear as Emergency Prompt /
        Dispatch Emergency Prompt under Una Labs.
      </p>

      <h2>2. Contact</h2>
      <p>
        For privacy questions, data requests, or corrections, contact{" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>

      <h2>3. Account and Data Deletion (Dispatch Emergency Prompt)</h2>
      <p id="dispatch-account-deletion">
        To request deletion of Dispatch Emergency Prompt account-related data,
        email{" "}
        <a href="mailto:hello@unalabs.cloud?subject=Dispatch%20Emergency%20Prompt%20-%20Delete%20account%2Fdata%20request">
          hello@unalabs.cloud
        </a>{" "}
        with subject line <strong>Dispatch Emergency Prompt - Delete account/data request</strong>.
        Include your phone number and approximate request date so we can locate
        the record.
      </p>

      <h2>4. Product-Specific Policies</h2>
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

      <h2>5. Website Data</h2>
      <p>
        We collect basic website analytics, usage diagnostics, and voluntary
        contact-form details to operate and improve our services. We do not
        sell personal information.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You may request access, correction, or deletion of personal information
        by emailing <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>
    </div>
  );
}
