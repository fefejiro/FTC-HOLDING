import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account or Data - Emergency Prompt | Una Labs",
  description:
    "Request deletion of Emergency Prompt operator accounts or roadside request data.",
};

const DELETE_REQUEST_SUBJECT = encodeURIComponent("Emergency Prompt - Delete account/data request");
const DELETE_REQUEST_BODY = encodeURIComponent(
  [
    "Please delete my Emergency Prompt account and associated data.",
    "",
    "Request type: [Operator account / Customer request data / Both]",
    "Full name:",
    "Phone number (if applicable):",
    "Approximate request date (if applicable):",
    "Additional details:",
  ].join("\n"),
);

export default function EmergencyPromptDeleteAccountPage() {
  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Emergency Prompt - Delete Account or Data</h1>
      <p className="page-intro">
        Use this page to request deletion of your Emergency Prompt operator account
        and/or associated roadside request data.
      </p>

      <h2>1. Submit a Deletion Request</h2>
      <p>
        Email{" "}
        <a href={`mailto:hello@unalabs.cloud?subject=${DELETE_REQUEST_SUBJECT}&body=${DELETE_REQUEST_BODY}`}>
          hello@unalabs.cloud
        </a>{" "}
        with the subject line <strong>Emergency Prompt - Delete account/data request</strong>.
      </p>
      <p>
        Include enough details for verification, such as your full name, phone
        number, and approximate request date.
      </p>

      <h2>2. What Can Be Deleted</h2>
      <ul>
        <li>Operator profile records and notification subscriptions.</li>
        <li>Customer roadside request records linked to your provided details.</li>
      </ul>

      <h2>3. Processing Timeline</h2>
      <p>
        We normally process verified deletion requests within 7 business days.
        We may retain minimal records where required for legal, fraud-prevention,
        or operational dispute-resolution purposes.
      </p>

      <h2>4. Need Help?</h2>
      <p>
        Contact{" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>{" "}
        for support with access, correction, or deletion requests.
      </p>

      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/privacy/emergency-prompt">Back to Emergency Prompt Privacy Policy</Link>
      </p>
    </div>
  );
}
