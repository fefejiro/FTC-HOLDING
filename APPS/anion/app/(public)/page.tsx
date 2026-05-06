import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="surface card">
      <p className="kicker">Anion Primary Web Lane</p>
      <h1 className="h1">Class scheduling, billing, and live sessions in one flow.</h1>
      <p className="muted">
        M0 platform realignment is active. M1 will wire role-based dashboards and Supabase-backed auth state.
      </p>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <article className="surface card" style={{ background: 'var(--surface-2)' }}>
          <h2 className="h2">Parents and Students</h2>
          <p className="muted">Book sessions, monitor approvals, and launch Daily classrooms.</p>
          <Link href="/parent">Open parent area</Link>
        </article>
        <article className="surface card" style={{ background: 'var(--surface-2)' }}>
          <h2 className="h2">Tutors and Operators</h2>
          <p className="muted">Manage schedules, session lifecycle, and delivery visibility.</p>
          <Link href="/admin">Open operator area</Link>
        </article>
      </div>
    </section>
  );
}
