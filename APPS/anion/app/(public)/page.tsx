import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="surface card">
      <p className="kicker">Anion Learning Platform</p>
      <h1 className="h1">Class scheduling, billing, and live sessions in one flow.</h1>
      <p className="muted">
        Book trusted tutors, manage approvals, and run lessons from one clean dashboard built for parents, students, and operators.
      </p>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <article className="surface card" style={{ background: 'var(--surface-2)' }}>
          <h2 className="h2">Parents and Students</h2>
          <p className="muted">Find tutors, request sessions, track approvals, and join live classrooms.</p>
          <Link href="/parent">Open parent area</Link>
        </article>
        <article className="surface card" style={{ background: 'var(--surface-2)' }}>
          <h2 className="h2">Tutors and Operators</h2>
          <p className="muted">Manage booking flow, publish class updates, and keep delivery operations visible.</p>
          <Link href="/admin">Open operator area</Link>
        </article>
      </div>
    </section>
  );
}
