import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '../../lib/auth/getCurrentUser';
import { listTutorBookings, setBookingStatus } from '../../lib/bookings';
import { createClassroomPost, listClassroomPosts } from '../../lib/classroom';

type TutorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const assignmentTemplates = [
  {
    key: 'homework',
    label: 'Homework Prompt',
    body: 'Homework: Write 5 sentences using today\'s vocabulary words. Post your answer before 7:00 PM.',
  },
  {
    key: 'revision',
    label: 'Revision Task',
    body: 'Revision task: Summarize today\'s lesson in 3 short points and share one question you still have.',
  },
  {
    key: 'reading',
    label: 'Reading Assignment',
    body: 'Reading assignment: Read pages 12-16 and post one key idea plus one new word you learned.',
  },
] as const;

export default async function TutorPage({ searchParams }: TutorPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'tutor') redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const bookingError = typeof params.bookingError === 'string' ? params.bookingError : null;
  const postError = typeof params.postError === 'string' ? params.postError : null;

  const [bookings, posts] = await Promise.all([listTutorBookings(), listClassroomPosts()]);

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

  async function createPostAction(formData: FormData) {
    'use server';

    const body = String(formData.get('body') ?? '');

    try {
      await createClassroomPost({ body });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish post';
      redirect(`/tutor?postError=${encodeURIComponent(message)}`);
    }

    revalidatePath('/tutor');
    revalidatePath('/student');
    redirect('/tutor');
  }

  async function createTemplatePostAction(formData: FormData) {
    'use server';

    const templateKey = String(formData.get('templateKey') ?? '');
    const template = assignmentTemplates.find((item) => item.key === templateKey);
    if (!template) {
      redirect('/tutor?postError=Invalid%20template%20selection');
    }

    try {
      await createClassroomPost({ body: template.body });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish template post';
      redirect(`/tutor?postError=${encodeURIComponent(message)}`);
    }

    revalidatePath('/tutor');
    revalidatePath('/student');
    redirect('/tutor');
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="surface card">
        <p className="kicker">Tutor Dashboard</p>
        <h1 className="h1">Teacher Writing Board</h1>
        <p className="muted">Share lesson prompts, corrections, and guidance with students.</p>
        {postError ? (
          <p className="muted" style={{ color: '#b91c1c', marginTop: 12 }}>
            {postError}
          </p>
        ) : null}

        <form action={createPostAction} className="grid" style={{ gap: 10, marginTop: 14 }}>
          <label className="grid" style={{ gap: 6 }}>
            <span className="muted">Write to students</span>
            <textarea
              name="body"
              rows={4}
              maxLength={1000}
              required
              placeholder="Lesson tip, homework reminder, or feedback"
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
            Post to Feed
          </button>
        </form>

        <div className="grid" style={{ gap: 8, marginTop: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            Quick assignment templates
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {assignmentTemplates.map((template) => (
              <form key={template.key} action={createTemplatePostAction}>
                <input type="hidden" name="templateKey" value={template.key} />
                <button
                  type="submit"
                  style={{
                    background: '#fff',
                    color: 'var(--brand)',
                    border: '1px solid #99f6e4',
                    borderRadius: 999,
                    padding: '8px 12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {template.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section className="surface card">
        <p className="kicker">Classroom Activity</p>
        <h2 className="h2">Latest Posts</h2>
        {posts.length === 0 ? (
          <p className="muted">No posts yet. Start the class conversation.</p>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {posts.map((post) => (
              <article key={post.id} className="surface card" style={{ boxShadow: 'none' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{post.authorName}</p>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {post.authorRole === 'tutor' ? 'Teacher' : 'Student'} •{' '}
                  {new Date(post.createdAt).toLocaleString()}
                </p>
                <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{post.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface card">
        <p className="kicker">Operations</p>
        <h2 className="h2">Booking Requests</h2>
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
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  Student: {booking.student_name ?? 'Legacy family booking'}
                </p>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  Parent: {booking.parent_name ?? 'Unknown parent'}
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
    </div>
  );
}
