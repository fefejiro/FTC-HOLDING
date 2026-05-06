import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '../../lib/auth/getCurrentUser';
import { createBookingRequest, listParentBookings, listTutorOptions } from '../../lib/bookings';

type ParentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ParentPage({ searchParams }: ParentPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'parent') redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const bookingError = typeof params.bookingError === 'string' ? params.bookingError : null;

  const [tutors, bookings] = await Promise.all([listTutorOptions(), listParentBookings()]);

  async function createBookingAction(formData: FormData) {
    'use server';

    const tutorId = String(formData.get('tutorId') ?? '');
    const subject = String(formData.get('subject') ?? '');
    const requestedStartAt = String(formData.get('requestedStartAt') ?? '');
    const durationMinutesRaw = String(formData.get('durationMinutes') ?? '60');
    const notes = String(formData.get('notes') ?? '');

    if (!tutorId || !subject || !requestedStartAt) {
      redirect('/parent?bookingError=Missing%20required%20fields');
    }

    const durationMinutes = Number.parseInt(durationMinutesRaw, 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) {
      redirect('/parent?bookingError=Duration%20must%20be%2030-240%20minutes');
    }

    try {
      await createBookingRequest({
        tutorId,
        subject,
        requestedStartAt,
        durationMinutes,
        notes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create booking';
      redirect(`/parent?bookingError=${encodeURIComponent(message)}`);
    }

    revalidatePath('/parent');
    revalidatePath('/tutor');
    redirect('/parent');
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="surface card">
        <p className="kicker">Parent Dashboard</p>
        <h1 className="h1">Create Booking Request</h1>
        <p className="muted">Submit a tutoring request and track tutor response in real time.</p>
        {bookingError ? (
          <p className="muted" style={{ color: '#b91c1c', marginTop: 12 }}>
            {bookingError}
          </p>
        ) : null}

        <form action={createBookingAction} className="grid" style={{ marginTop: 16 }}>
          <label className="grid" style={{ gap: 6 }}>
            <span className="muted">Tutor</span>
            <select name="tutorId" required style={{ padding: 10, borderRadius: 10, border: '1px solid #dbe3f0' }}>
              <option value="">Select tutor</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.headline}
                  {tutor.subjects?.length ? ` (${tutor.subjects.join(', ')})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <span className="muted">Subject</span>
            <input
              name="subject"
              required
              placeholder="Math"
              style={{ padding: 10, borderRadius: 10, border: '1px solid #dbe3f0' }}
            />
          </label>

          <div className="grid grid-2">
            <label className="grid" style={{ gap: 6 }}>
              <span className="muted">Requested Start</span>
              <input
                type="datetime-local"
                name="requestedStartAt"
                required
                style={{ padding: 10, borderRadius: 10, border: '1px solid #dbe3f0' }}
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span className="muted">Duration (minutes)</span>
              <input
                type="number"
                name="durationMinutes"
                min={30}
                max={240}
                defaultValue={60}
                required
                style={{ padding: 10, borderRadius: 10, border: '1px solid #dbe3f0' }}
              />
            </label>
          </div>

          <label className="grid" style={{ gap: 6 }}>
            <span className="muted">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Anything the tutor should know"
              style={{ padding: 10, borderRadius: 10, border: '1px solid #dbe3f0' }}
            />
          </label>

          <button
            type="submit"
            style={{
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              width: 'fit-content',
              cursor: 'pointer',
            }}
          >
            Submit Booking
          </button>
        </form>
      </section>

      <section className="surface card">
        <p className="kicker">Booking Status</p>
        <h2 className="h2">Your Requests</h2>
        {bookings.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {bookings.map((booking) => (
              <article key={booking.id} className="surface card" style={{ boxShadow: 'none' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{booking.subject}</p>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {new Date(booking.requested_start_at).toLocaleString()} • {booking.duration_minutes} mins
                </p>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  Status: <strong>{booking.status}</strong>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
