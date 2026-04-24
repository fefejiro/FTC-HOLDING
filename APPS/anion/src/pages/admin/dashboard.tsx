type AdminDashboardPageProps = {
  tutorCount: number;
  bookingCount: number;
  studentCount: number;
};

export function AdminDashboardPage({ tutorCount, bookingCount, studentCount }: AdminDashboardPageProps) {
  return (
    <section className="panel">
      <h2>Operator Snapshot</h2>
      <div className="card-grid three-up">
        <article className="card"><h3>Tutors</h3><p>{tutorCount}</p></article>
        <article className="card"><h3>Visible bookings</h3><p>{bookingCount}</p></article>
        <article className="card"><h3>Tracked students</h3><p>{studentCount}</p></article>
      </div>
      <p>Keep this operator view narrow until live runtime, billing, and lesson metrics are actually wired.</p>
    </section>
  );
}