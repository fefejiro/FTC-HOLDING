import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <section className="surface card" style={{ maxWidth: 840, margin: '2rem auto' }}>
      <p className="kicker">Privacy</p>
      <h1 className="h1">Privacy notice (launch placeholder)</h1>
      <p className="muted">
        This placeholder summarizes expected data handling for launch readiness and will be replaced with the final
        legal policy before go-live.
      </p>
      <ul>
        <li>We use account, booking, billing, and classroom data to deliver tutoring workflows.</li>
        <li>Payments are processed by Stripe and live classroom sessions run on Daily.</li>
        <li>Only operational access needed for support and delivery should be granted internally.</li>
      </ul>
      <p className="muted">
        For current environment requirements, refer to the operator handover docs in <code>ops/CLIENT-HANDOVER.md</code>.
      </p>
      <p className="muted" style={{ marginTop: 16 }}>
        <Link href="/">Back to home</Link> · <Link href="/terms">View terms</Link>
      </p>
    </section>
  );
}
