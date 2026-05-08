import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '../../lib/auth/getCurrentUser';
import { createClassroomPost, listClassroomPosts } from '../../lib/classroom';
import { listStudentAcceptedBookings } from '../../lib/bookings';

type StudentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const postError = typeof params.postError === 'string' ? params.postError : null;

  const [posts, lessons] = await Promise.all([listClassroomPosts(), listStudentAcceptedBookings()]);

  async function createPostAction(formData: FormData) {
    'use server';

    const body = String(formData.get('body') ?? '');

    try {
      await createClassroomPost({ body });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish post';
      redirect(`/student?postError=${encodeURIComponent(message)}`);
    }

    revalidatePath('/student');
    revalidatePath('/tutor');
    redirect('/student');
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="surface card">
        <p className="kicker">Student Dashboard</p>
        <h1 className="h1">Learning Feed</h1>
        <p className="muted">Share questions, updates, and class notes with your teachers.</p>
        {postError ? (
          <p className="muted" style={{ color: '#b91c1c', marginTop: 12 }}>
            {postError}
          </p>
        ) : null}

        <form action={createPostAction} className="grid" style={{ gap: 10, marginTop: 14 }}>
          <label className="grid" style={{ gap: 6 }}>
            <span className="muted">Write your update</span>
            <textarea
              name="body"
              rows={4}
              maxLength={1000}
              required
              placeholder="What are you learning today?"
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
      </section>

      <section className="surface card">
        <p className="kicker">Recent Activity</p>
        <h2 className="h2">Classroom Posts</h2>
        {posts.length === 0 ? (
          <p className="muted">No posts yet. Start the conversation.</p>
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
        <p className="kicker">Live Learning</p>
        <h2 className="h2">Upcoming Lessons</h2>
        {lessons.length === 0 ? (
          <p className="muted">No accepted lessons yet. Your teacher will confirm soon.</p>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {lessons.map((lesson) => (
              <article key={lesson.id} className="surface card" style={{ boxShadow: 'none' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{lesson.subject}</p>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {new Date(lesson.requested_start_at).toLocaleString()} • {lesson.duration_minutes} mins
                </p>
                <a
                  href={`/lesson/${lesson.id}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Join Lesson
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
