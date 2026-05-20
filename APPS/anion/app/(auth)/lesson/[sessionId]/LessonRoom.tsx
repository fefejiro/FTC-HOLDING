'use client';

import { useEffect, useRef, useState } from 'react';

type ClassroomTimelineItem = {
  id: string;
  authorRole: 'student' | 'tutor';
  authorName: string;
  studentId: string | null;
  studentName: string | null;
  body: string;
  createdAt: string;
};

type Props = {
  sessionId: string;
  userId: string;
  participantRole: 'student' | 'tutor';
  displayName: string;
  lessonTitle: string;
  parentName: string | null;
  studentName: string | null;
  tutorName: string | null;
  bookingNotes: string | null;
  classroomTimeline: ClassroomTimelineItem[];
};

type RoomData = {
  ok: boolean;
  roomUrl?: string;
  token?: string;
  expiresAt?: string;
  message?: string;
  code?: string;
};

export default function LessonRoom({
  sessionId,
  userId,
  participantRole,
  displayName,
  lessonTitle,
  parentName,
  studentName,
  tutorName,
  bookingNotes,
  classroomTimeline,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'left'>('loading');
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function joinRoom() {
      try {
        const res = await fetch('/api/daily/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: sessionId,
            userId,
            participantRole,
          }),
        });

        const data = (await res.json()) as RoomData;
        if (cancelled) return;

        if (!data.ok || !data.roomUrl || !data.token) {
          setError(data.message ?? data.code ?? 'Failed to join session');
          setStatus('error');
          return;
        }

        // Dynamically load Daily.co call object to avoid SSR issues
        const { default: DailyIframe } = await import('@daily-co/daily-js');
        if (cancelled) return;

        const callObject = DailyIframe.createFrame(frameRef.current!, {
          showLeaveButton: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '0.75rem',
          },
        });

        callRef.current = callObject;

        callObject.on('left-meeting', () => {
          setStatus('left');
        });

        await callObject.join({ url: data.roomUrl, token: data.token, userName: displayName });
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unexpected error joining session');
          setStatus('error');
        }
      }
    }

    void joinRoom();

    return () => {
      cancelled = true;
      if (callRef.current) {
        callRef.current.destroy().catch(() => {});
        callRef.current = null;
      }
    };
  }, [sessionId, userId, participantRole, displayName]);

  if (status === 'left') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 'var(--spacing-4)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-6)' }}>👋</div>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Session ended</h1>
        <p className="body secondary" style={{ marginBottom: 'var(--spacing-6)' }}>Thank you for learning today!</p>
        <a href="/dashboard" className="btn-primary" style={{ padding: 'var(--spacing-3) var(--spacing-6)', display: 'inline-block' }}>Return to Dashboard</a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 'var(--spacing-4)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-6)' }}>⚠️</div>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Could not join session</h1>
        <p style={{ color: 'var(--danger)', marginBottom: 'var(--spacing-6)', fontSize: '14px' }}>✕ {error}</p>
        <a href="/dashboard" className="btn-primary" style={{ padding: 'var(--spacing-3) var(--spacing-6)', display: 'inline-block' }}>Back to Dashboard</a>
      </div>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: '90vh', padding: 'var(--spacing-4)', gap: 'var(--spacing-4)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="kicker" style={{ marginBottom: 'var(--spacing-2)' }}>Live Session</p>
          <h1 className="h3" style={{ marginBottom: 'var(--spacing-2)' }}>
            {status === 'loading' ? `Connecting to ${lessonTitle}…` : lessonTitle}
          </h1>
          <p className="body-sm secondary" style={{ margin: 0 }}>
            Student: {studentName ?? 'Student'} • Tutor: {tutorName ?? 'Tutor'} • Parent: {parentName ?? 'Parent'}
          </p>
        </div>
        {status === 'ready' && (
          <span className="badge badge-success">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', animation: 'pulse 2s infinite' }} />
            Connected
          </span>
        )}
        {status === 'loading' && (
          <span className="body-sm secondary">Connecting…</span>
        )}
      </div>

      <div style={{ display: 'grid', flex: 1, gap: 'var(--spacing-4)', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: 0 }}>
        <div
          ref={frameRef}
          style={{ backgroundColor: 'var(--text-heading)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', minHeight: '400px' }}
        />

        <aside className="surface" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px', padding: 0 }}>
          <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderBottom: '1px solid #e2e8f0' }}>
            <p className="kicker" style={{ marginBottom: 'var(--spacing-1)' }}>Student Activity</p>
            <h2 className="h4" style={{ marginBottom: 0 }}>Timeline</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-3) var(--spacing-4)' }}>
            {classroomTimeline.length === 0 ? (
              <p className="body-sm secondary" style={{ margin: 0 }}>No posts yet for this lesson.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {classroomTimeline.map((entry) => (
                  <article key={entry.id} style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-heading)' }}>{entry.authorName}</p>
                    <p className="body-sm secondary" style={{ margin: 'var(--spacing-1) 0' }}>
                      {entry.authorRole === 'tutor' ? 'Teacher' : 'Student'} • {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    <p style={{ margin: 'var(--spacing-2) 0 0 0', fontSize: '14px', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>{entry.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {bookingNotes ? (
        <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', fontSize: '14px', color: 'var(--text-body)' }}>
          <strong style={{ color: 'var(--text-heading)' }}>Booking notes:</strong> {bookingNotes}
        </div>
      ) : null}
    </section>
  );
}
