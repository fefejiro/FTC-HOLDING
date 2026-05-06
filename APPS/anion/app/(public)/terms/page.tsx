import Link from 'next/link';

export default function TermsPage() {
  return (
    <section className="surface card" style={{ maxWidth: 840, margin: '2rem auto' }}>
      <p className="kicker">Terms</p>
      <h1 className="h1">Terms of service (launch placeholder)</h1>
      <p className="muted">
        These placeholder terms are provided for trust-facing launch readiness and should be replaced with final legal
        language before production launch.
      </p>
      <ul>
        <li>Subscription plan details, renewal terms, and cancellation rights are defined at checkout.</li>
        <li>Session delivery depends on active account status and tutor availability.</li>
        <li>Platform use must follow safety and classroom conduct expectations.</li>
      </ul>
      <p className="muted" style={{ marginTop: 16 }}>
        <Link href="/">Back to home</Link> · <Link href="/privacy">View privacy notice</Link>
      </p>
    </section>
  );
}
