import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Emergency Prompt | Ottawa Roadside Assistance",
  description:
    "Privacy policy for the Emergency Prompt Ottawa roadside assistance app. How we collect, use, and protect your information.",
};

export default function EmergencyPromptPrivacyPage() {
  const effectiveDate = "March 29, 2026";

  return (
    <div className="container page-content legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Emergency Prompt - Privacy Policy</h1>
      <p className="page-intro">
        This policy explains how Emergency Prompt (operated by Una Labs) handles
        the information you provide when using the Ottawa roadside assistance
        app.
      </p>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        Effective date: {effectiveDate}
      </p>

      <h2>1. Who We Are</h2>
      <p>
        Emergency Prompt is a roadside assistance dispatch service operating in
        Ottawa, Ontario, Canada. The app is built and operated by <strong>Una Labs</strong>.
        For any privacy questions, contact us at <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>.
      </p>

      <h2>2. What Information We Collect</h2>
      <p>When you submit a roadside assistance request, we collect:</p>
      <ul>
        <li>
          <strong>Your name</strong> - so the operator can identify you on arrival.
        </li>
        <li>
          <strong>Your phone number</strong> - so the operator can call or text you directly.
        </li>
        <li>
          <strong>Your location</strong> - either GPS coordinates captured by your device
          (with your permission) or a street address you type in. This is used solely
          to dispatch the nearest available operator to you.
        </li>
        <li>
          <strong>Service type</strong> - e.g. gas delivery, lockout, jump start, tire change.
        </li>
        <li>
          <strong>Any notes</strong> you choose to add to your request.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect payment information, account credentials,
        or any information unrelated to dispatching your request.
      </p>

      <h2>3. How We Use Your Information</h2>
      <p>Your information is used only to:</p>
      <ul>
        <li>Dispatch a roadside operator to your location.</li>
        <li>Allow the operator to contact you about your request.</li>
        <li>Track the status of your job (pending, en route, completed).</li>
      </ul>
      <p>
        We do not use your information for marketing, advertising, or any purpose
        beyond fulfilling your roadside assistance request.
      </p>

      <h2>4. Location Data</h2>
      <p>
        If you choose to share your GPS location, your device captures your
        coordinates at the moment you submit the request. We reverse-geocode
        those coordinates into a human-readable address using the OpenStreetMap
        Nominatim service (no personal data is sent - only coordinates). Your
        location is stored with your request record and shared with the dispatched
        operator only.
      </p>
      <p>
        Location permission is requested in-browser at the time of your request.
        You may decline and type your address manually instead.
      </p>

      <h2>5. Push Notifications (Operators Only)</h2>
      <p>
        If you are an operator using the Emergency Prompt operator app, you may
        enable browser push notifications. This creates a push subscription stored
        against your operator profile in our database. It is used solely to deliver
        job alerts to your device. You can revoke this permission at any time
        through your browser settings.
      </p>

      <h2>6. Data Storage</h2>
      <p>
        Request data is stored in a secure PostgreSQL database hosted by Supabase
        (servers in Canada/US). Data is retained for operational and
        dispute-resolution purposes and is not sold or shared with third parties.
      </p>

      <h2>7. Third-Party Services</h2>
      <ul>
        <li>
          <strong>OpenStreetMap Nominatim</strong> - free geocoding service.
          Coordinates are sent to geocode addresses. No personal data is transmitted.
          Subject to the {" "}
          <a
            href="https://nominatim.org/release-docs/latest/api/Overview/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nominatim usage policy
          </a>
          .
        </li>
        <li>
          <strong>Supabase</strong> - database hosting. Your data resides on Supabase
          infrastructure. See the {" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase privacy policy
          </a>
          .
        </li>
      </ul>

      <h2>8. Your Rights (PIPEDA / Canadian Privacy Law)</h2>
      <p>
        Under Canada's Personal Information Protection and Electronic Documents
        Act (PIPEDA), you have the right to:
      </p>
      <ul>
        <li>Access the personal information we hold about you.</li>
        <li>Request correction of inaccurate information.</li>
        <li>Request deletion of your request record.</li>
      </ul>
      <p>
        To exercise any of these rights, email {" "}
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a> with your
        name and the approximate date of your request.
      </p>

      <h2>9. Children</h2>
      <p>
        Emergency Prompt is not directed at children under 13. We do not
        knowingly collect information from minors.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        If we make material changes to this policy, we will update the effective
        date above. Continued use of the app after changes constitutes acceptance
        of the updated policy.
      </p>

      <h2>11. Contact</h2>
      <p>
        Una Labs - Emergency Prompt
        <br />
        Ottawa, Ontario, Canada
        <br />
        <a href="mailto:hello@unalabs.cloud">hello@unalabs.cloud</a>
      </p>

      <h2>12. Delete Account or Data</h2>
      <p>
        To request deletion of an operator account and/or associated request
        data, email{" "}
        <a href="mailto:hello@unalabs.cloud?subject=Emergency%20Prompt%20-%20Delete%20account%2Fdata%20request">
          hello@unalabs.cloud
        </a>{" "}
        with subject line <strong>Emergency Prompt - Delete account/data request</strong>.
      </p>

      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/privacy">Back to Una Labs Privacy Hub</Link>
      </p>
    </div>
  );
}
