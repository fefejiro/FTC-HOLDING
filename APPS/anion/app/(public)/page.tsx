import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <section style={{ padding: '64px 24px 48px', textAlign: 'center' }}>
        <p className="kicker">Welcome to Anion</p>
        <h1 className="display">Tutoring, scheduled. Learning, live.</h1>
        <p className="body" style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '16px auto 32px', fontSize: '18px' }}>
          Book trusted tutors, manage approvals, and run live sessions with interactive whiteboards—all from one calm, beautiful platform.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/parent" className="btn-primary" style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', color: 'white', background: 'var(--brand-teal)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Find Tutors</Link>
          <Link href="/pricing" className="btn-secondary" style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', color: 'var(--brand-teal)', background: 'var(--bg-subtle)', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>View Plans</Link>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <div className="grid grid-2">
          <article className="surface card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
            <h2 className="h3">For Parents & Students</h2>
            <p className="body-sm secondary">Find vetted tutors, request sessions that work with your schedule, track tutor responses, and join live interactive classrooms with real-time whiteboards.</p>
            <Link href="/parent" style={{ color: 'var(--brand-teal)', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Explore →</Link>
          </article>
          <article className="surface card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>👩‍🏫</div>
            <h2 className="h3">For Tutors & Operators</h2>
            <p className="body-sm secondary">Manage booking requests, conduct live lessons with shared writing spaces, track progress, and keep all operations visible from one dashboard.</p>
            <Link href="/admin" style={{ color: 'var(--brand-teal)', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Explore →</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
