import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';

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

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

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
    { data: recentBookings },
    { data: recentProfiles },
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
      .from('bookings')
      .select('id, subject, status, requested_start_at, duration_minutes')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

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
                  {['Subject', 'Date', 'Duration', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{b.subject}</td>
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
    </div>
  );
}

