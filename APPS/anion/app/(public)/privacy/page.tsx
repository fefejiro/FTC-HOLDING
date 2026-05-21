import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <section className="surface" style={{ padding: '24px', marginTop: '24px' }}>
      <p className="kicker">Legal</p>
      <h1 className="h1">Privacy Policy</h1>
      <p className="body" style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>
        This policy explains what data Anion collects, why it is processed, and how users can request access,
        correction, or deletion. This page is the live policy endpoint linked from the product UI.
      </p>

      <h2 className="h3" style={{ marginTop: '24px' }}>Data Processors</h2>
      <ul className="body-sm" style={{ color: 'var(--text-body)', paddingLeft: '20px' }}>
        <li>Supabase for authentication and database storage</li>
        <li>Stripe for subscription billing</li>
        <li>Daily.co for live classroom sessions</li>
        <li>Cloudflare for edge runtime and delivery</li>
      </ul>

      <h2 className="h3" style={{ marginTop: '24px' }}>User Rights</h2>
      <ul className="body-sm" style={{ color: 'var(--text-body)', paddingLeft: '20px' }}>
        <li>Access, rectify, or delete personal data</li>
        <li>Request a copy of your data in portable form</li>
        <li>Object to specific processing where applicable</li>
      </ul>

      <p className="body-sm" style={{ marginTop: '24px', color: 'var(--text-secondary)' }}>
        For implementation and legal review notes, see the repository policy source in docs/PRIVACY.md.
      </p>

      <div style={{ marginTop: '16px' }}>
        <Link href="/terms" className="body-sm" style={{ fontWeight: 600 }}>
          View Terms of Service
        </Link>
      </div>
    </section>
  );
}
