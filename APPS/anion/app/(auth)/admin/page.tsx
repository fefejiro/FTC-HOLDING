import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { listAdminRecentBookings } from '@/app/lib/bookings';

type MetricCardProps = { label: string; value: string | number; sub?: string };
function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{value}</span>
      {sub && <span style={{ fontSize: 13, color: '#94a3b8' }}>{sub}</span>}
    </div>
  );
}

type StatusBadgeProps = { status: string };
function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef9c3', color: '#713f12' },
    accepted: { bg: '#dcfce7', color: '#14532d' },
    declined: { bg: '#fee2e2', color: '#7f1d1d' },
    active: { bg: '#dcfce7', color: '#14532d' },
    inactive: { bg: '#f1f5f9', color: '#475569' },
    past_due: { bg: '#fff7ed', color: '#7c2d12' },
    canceled: { bg: '#fee2e2', color: '#7f1d1d' },
    trialing: { bg: '#ede9fe', color: '#4c1d95' },
  };
  const style = colors[status] ?? { bg: '#f1f5f9', color: '#334155' };
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ParentRow = { id: string; profile_id: string };
type StudentRow = { id: string; profile_id: string; grade_level: string | null };
type ProfileNameRow = { id: string; display_name: string };
type ParentStudentLinkRow = { parent_id: string; student_id: string; created_at: string };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const linkError = typeof params.linkError === 'string' ? params.linkError : null;
  const linkSuccess = typeof params.linkSuccess === 'string' ? params.linkSuccess : null;

  const supabase = await createServerClient();

  const [
    { count: userCount },
    { count: parentCount },
    { count: tutorCount },
    { count: studentCount },
    { count: bookingCount },
    { count: pendingCount },
    { count: acceptedCount },
    { count: subCount },
    { count: activeSubCount },
    { data: recentProfiles },
    { data: parentRows },
    { data: studentRows },
    { data: linkRows },
    recentBookings,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('parents').select('*', { count: 'exact', head: true }),
    supabase.from('tutors').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('parents').select('id, profile_id').order('created_at', { ascending: true }),
    supabase.from('students').select('id, profile_id, grade_level').order('created_at', { ascending: true }),
    supabase.from('parent_student_links').select('parent_id, student_id, created_at').order('created_at', { ascending: false }),
    listAdminRecentBookings(),
  ]);

  const parentList = (parentRows ?? []) as ParentRow[];
  const studentList = (studentRows ?? []) as StudentRow[];
  const parentStudentLinks = (linkRows ?? []) as ParentStudentLinkRow[];

  const profileIds = Array.from(
    new Set([...parentList.map((row) => row.profile_id), ...studentList.map((row) => row.profile_id)]),
  );

  let profileNameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profileNames } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    profileNameMap = new Map(
      ((profileNames ?? []) as ProfileNameRow[]).map((row) => [row.id, row.display_name]),
    );
  }

  const parentOptions = parentList
    .map((parent) => ({
      id: parent.id,
      label: profileNameMap.get(parent.profile_id) ?? `Parent ${parent.id.slice(0, 8)}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const studentOptions = studentList
    .map((student) => {
      const studentName = profileNameMap.get(student.profile_id) ?? `Student ${student.id.slice(0, 8)}`;
      return {
        id: student.id,
        label: student.grade_level ? `${studentName} (Grade ${student.grade_level})` : studentName,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  async function createLinkAction(formData: FormData) {
    'use server';

    const parentId = String(formData.get('parentId') ?? '');
    const studentId = String(formData.get('studentId') ?? '');

    if (!parentId || !studentId) {
      redirect('/admin?linkError=Parent%20and%20student%20are%20required');
    }

    const actionClient = await createServerClient();
    const { error } = await actionClient.from('parent_student_links').insert({
      parent_id: parentId,
      student_id: studentId,
    });

    if (error) {
      const message = error.message.includes('duplicate key')
        ? 'This parent and student are already linked.'
        : error.message;
      redirect(`/admin?linkError=${encodeURIComponent(message)}`);
    }

    revalidatePath('/admin');
    revalidatePath('/student');
    redirect('/admin?linkSuccess=Parent-student%20link%20created');
  }

  async function removeLinkAction(formData: FormData) {
    'use server';

    const parentId = String(formData.get('parentId') ?? '');
    const studentId = String(formData.get('studentId') ?? '');

    if (!parentId || !studentId) {
      redirect('/admin?linkError=Invalid%20link%20selected');
    }

    const actionClient = await createServerClient();
    const { error } = await actionClient
      .from('parent_student_links')
      .delete()
      .eq('parent_id', parentId)
      .eq('student_id', studentId);

    if (error) {
      redirect(`/admin?linkError=${encodeURIComponent(error.message)}`);
    }

    revalidatePath('/admin');
    revalidatePath('/student');
    redirect('/admin?linkSuccess=Parent-student%20link%20removed');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 8 }}>
      <div>
        <p style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
          Admin
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>Operator Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: 6 }}>Live platform metrics — refreshes on each page load.</p>
      </div>

      {/* Users */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Users
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <MetricCard label="Total Users" value={userCount ?? 0} />
          <MetricCard label="Parents" value={parentCount ?? 0} />
          <MetricCard label="Tutors" value={tutorCount ?? 0} />
          <MetricCard label="Students" value={studentCount ?? 0} />
        </div>
      </section>

      {/* Bookings */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Bookings
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <MetricCard label="Total Bookings" value={bookingCount ?? 0} />
          <MetricCard label="Pending" value={pendingCount ?? 0} />
          <MetricCard label="Accepted" value={acceptedCount ?? 0} />
        </div>

        {recentBookings && recentBookings.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Subject', 'Student', 'Tutor', 'Date', 'Duration', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{b.subject}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.student_name ?? 'Legacy booking'}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.tutor_name ?? 'Unknown tutor'}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(b.requested_start_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.duration_minutes} min</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Subscriptions */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Subscriptions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <MetricCard label="Total Subscribers" value={subCount ?? 0} />
          <MetricCard label="Active" value={activeSubCount ?? 0} sub="Paying customers" />
        </div>
      </section>

      {/* Recent sign-ups */}
      {recentProfiles && recentProfiles.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Sign-ups
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentProfiles.map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
              >
                <span style={{ fontWeight: 500 }}>{p.display_name ?? '(unnamed)'}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Parent-Student Links
        </h2>

        {linkError ? (
          <p style={{ color: '#b91c1c', margin: '0 0 10px' }}>{linkError}</p>
        ) : null}
        {linkSuccess ? (
          <p style={{ color: '#166534', margin: '0 0 10px' }}>{linkSuccess}</p>
        ) : null}

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <form action={createLinkAction} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(220px, 1fr) minmax(220px, 1fr) auto' }}>
            <select name="parentId" required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <option value="">Select parent</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
            </select>

            <select name="studentId" required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <option value="">Select student</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              style={{
                background: '#0f766e',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Link
            </button>
          </form>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {parentStudentLinks.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>No parent-student links created yet.</p>
            ) : (
              parentStudentLinks.map((link) => {
                const parentName = parentOptions.find((row) => row.id === link.parent_id)?.label ?? `Parent ${link.parent_id.slice(0, 8)}`;
                const studentName = studentOptions.find((row) => row.id === link.student_id)?.label ?? `Student ${link.student_id.slice(0, 8)}`;

                return (
                  <div
                    key={`${link.parent_id}-${link.student_id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 12px',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{parentName}</p>
                      <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
                        Linked student: {studentName}
                      </p>
                    </div>
                    <form action={removeLinkAction}>
                      <input type="hidden" name="parentId" value={link.parent_id} />
                      <input type="hidden" name="studentId" value={link.student_id} />
                      <button
                        type="submit"
                        style={{
                          background: '#fff',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          borderRadius: 8,
                          padding: '8px 10px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Unlink
                      </button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

