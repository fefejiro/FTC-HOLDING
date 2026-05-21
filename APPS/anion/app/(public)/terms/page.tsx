import Link from 'next/link';

export default function TermsPage() {
  return (
    <section className="surface" style={{ padding: '24px', marginTop: '24px' }}>
      <p className="kicker">Legal</p>
      <h1 className="h1">Terms of Service</h1>
      <p className="body" style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>
        These terms define platform usage, account responsibilities, billing behavior, and acceptable use for
        parents, tutors, students, and operators on Anion.
      </p>

      <h2 className="h3" style={{ marginTop: '24px' }}>Service Scope</h2>
      <ul className="body-sm" style={{ color: 'var(--text-body)', paddingLeft: '20px' }}>
        <li>Parent booking and approval flow</li>
        <li>Tutor acceptance and lesson delivery</li>
        <li>Subscription management through Stripe</li>
        <li>Live sessions delivered through Daily.co</li>
      </ul>

      <h2 className="h3" style={{ marginTop: '24px' }}>Account and Conduct</h2>
      <ul className="body-sm" style={{ color: 'var(--text-body)', paddingLeft: '20px' }}>
        <li>Users must provide accurate account details</li>
        <li>Unauthorized access attempts are prohibited</li>
        <li>Abuse, fraud, and unlawful platform use can lead to suspension</li>
      </ul>

      <p className="body-sm" style={{ marginTop: '24px', color: 'var(--text-secondary)' }}>
        For implementation and legal review notes, see the repository source in docs/TERMS.md.
      </p>

      <div style={{ marginTop: '16px' }}>
        <Link href="/privacy" className="body-sm" style={{ fontWeight: 600 }}>
          View Privacy Policy
        </Link>
      </div>
    </section>
  );
}
