import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '../../lib/auth/getCurrentUser';
import { listTutorBookings, setBookingStatus } from '../../lib/bookings';

type TutorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TutorPage({ searchParams }: TutorPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'tutor') redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const bookingError = typeof params.bookingError === 'string' ? params.bookingError : null;

  const bookings = await listTutorBookings();

  async function updateBookingStatusAction(formData: FormData) {
    'use server';

    const bookingId = String(formData.get('bookingId') ?? '');
    const status = String(formData.get('status') ?? '');

    if (!bookingId || (status !== 'accepted' && status !== 'declined')) {
      redirect('/tutor?bookingError=Invalid%20booking%20action');
    }

    try {
      await setBookingStatus({ bookingId, status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update booking';
      redirect(`/tutor?bookingError=${encodeURIComponent(message)}`);
    }

    revalidatePath('/tutor');
    revalidatePath('/parent');
    redirect('/tutor');
  }

  return (
    <section className="surface card">
      <p className="kicker">Tutor Dashboard</p>
      <h1 className="h1">Booking Requests</h1>
      <p className="muted">Review incoming parent requests and accept or decline.</p>
      {bookingError ? (
        <p className="muted" style={{ color: '#b91c1c', marginTop: 12 }}>
          {bookingError}
        </p>
      ) : null}

      <div className="grid" style={{ gap: 10, marginTop: 16 }}>
        {bookings.length === 0 ? (
          <p className="muted">No bookings assigned yet.</p>
        ) : (
          bookings.map((booking) => (
            <article key={booking.id} className="surface card" style={{ boxShadow: 'none' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{booking.subject}</p>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                {new Date(booking.requested_start_at).toLocaleString()} • {booking.duration_minutes} mins
              </p>
              {booking.notes ? (
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  Notes: {booking.notes}
                </p>
              ) : null}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                <p className="muted" style={{ margin: 0 }}>
                  Status: <strong>{booking.status}</strong>
                </p>
                {booking.status === 'pending' ? (
                  <form action={updateBookingStatusAction} style={{ display: 'flex', gap: 8 }}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      name="status"
                      value="accepted"
                      style={{
                        background: 'var(--brand)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="declined"
                      style={{
                        background: '#fff',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </form>
                ) : null}
                {booking.status === 'accepted' ? (
                  <a
                    href={`/lesson/${booking.id}`}
                    style={{
                      display: 'inline-block',
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Join Lesson
                  </a>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
