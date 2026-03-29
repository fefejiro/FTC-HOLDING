import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account or Data | Una Labs",
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

export default function DeleteAccountPage() {
  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Delete Account or Data</h1>
      <p className="page-intro">
        Use this page to request deletion of your Emergency Prompt operator
        account and/or associated roadside request data.
      </p>

      <h2>1. Submit a Deletion Request</h2>
      <p>
        Email{" "}
        <a href={`mailto:hello@unalabs.cloud?subject=${DELETE_REQUEST_SUBJECT}&body=${DELETE_REQUEST_BODY}`}>
          hello@unalabs.cloud
        </a>{" "}
        with the subject line <strong>Emergency Prompt - Delete account/data request</strong>.
      </p>

      <h2>2. Processing Timeline</h2>
      <p>
        We normally process verified deletion requests within 7 business days.
      </p>

      <h2>3. Related Policy</h2>
      <p>
        See the{" "}
        <Link href="/privacy/emergency-prompt">Emergency Prompt Privacy Policy</Link>{" "}
        for data handling details.
      </p>
    </div>
  );
}
