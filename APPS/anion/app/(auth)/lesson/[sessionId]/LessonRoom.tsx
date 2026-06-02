'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  roomName?: string;
  expiresAt?: string;
  message?: string;
  code?: string;
  requestId?: string;
};

type LessonStatus = 'connecting' | 'connected' | 'error' | 'left';

type DailyCallObject = {
  join: (options: { url: string; token: string; userName: string }) => Promise<void>;
  destroy: () => Promise<void>;
  on: (eventName: string, handler: () => void) => void;
};

function describeJoinFailure(data: RoomData): string {
  if (data.message) return data.message;

  switch (data.code) {
    case 'UNAUTHENTICATED':
      return 'Please sign in again before joining this lesson.';
    case 'LESSON_ACCESS_DENIED':
      return 'This lesson is only available to the assigned tutor and student.';
    case 'DAILY_NOT_CONFIGURED':
      return 'Live classroom is not configured yet. Ask the team to verify Daily.co settings.';
    case 'DAILY_API_ERROR':
      return 'Daily.co could not prepare the classroom. Please retry in a moment.';
    case 'RATE_LIMITED':
      return 'Too many join attempts. Wait a moment, then retry.';
    default:
      return data.code ?? 'Failed to join session.';
  }
}

function ContextPanel({
  parentName,
  studentName,
  tutorName,
  bookingNotes,
  classroomTimeline,
}: Pick<Props, 'parentName' | 'studentName' | 'tutorName' | 'bookingNotes' | 'classroomTimeline'>) {
  return (
    <aside className="surface" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px', padding: 0 }}>
      <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderBottom: '1px solid #e2e8f0' }}>
        <p className="kicker" style={{ marginBottom: 'var(--spacing-1)' }}>Lesson Context</p>
        <h2 className="h4" style={{ marginBottom: 0 }}>Classroom notes</h2>
      </div>

      <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderBottom: '1px solid #e2e8f0' }}>
        <p className="body-sm secondary" style={{ margin: 0 }}>Student: {studentName ?? 'Student'}</p>
        <p className="body-sm secondary" style={{ margin: 0 }}>Tutor: {tutorName ?? 'Tutor'}</p>
        <p className="body-sm secondary" style={{ margin: 0 }}>Parent: {parentName ?? 'Parent'}</p>
      </div>

      {bookingNotes ? (
        <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: 'var(--text-body)' }}>
          <strong style={{ color: 'var(--text-heading)' }}>Booking notes:</strong> {bookingNotes}
        </div>
      ) : null}

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-3) var(--spacing-4)' }}>
        <p className="kicker" style={{ marginBottom: 'var(--spacing-3)' }}>Student Activity</p>
        {classroomTimeline.length === 0 ? (
          <p className="body-sm secondary" style={{ margin: 0 }}>No posts yet for this lesson.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {classroomTimeline.map((entry) => (
              <article key={entry.id} style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-heading)' }}>{entry.authorName}</p>
                <p className="body-sm secondary" style={{ margin: 'var(--spacing-1) 0' }}>
                  {entry.authorRole === 'tutor' ? 'Teacher' : 'Student'} | {new Date(entry.createdAt).toLocaleString()}
                </p>
                <p style={{ margin: 'var(--spacing-2) 0 0 0', fontSize: '14px', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>{entry.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

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
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<LessonStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const callRef = useRef<DailyCallObject | null>(null);

  const destroyDailyFrame = useCallback(async () => {
    const existingCall = callRef.current;
    callRef.current = null;

    if (existingCall) {
      await existingCall.destroy().catch(() => {});
    }

    if (frameRef.current) {
      frameRef.current.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function joinRoom() {
      setStatus('connecting');
      setError(null);
      setRequestId(null);
      await destroyDailyFrame();

      try {
        const res = await fetch('/api/daily/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: sessionId,
            participantRole,
          }),
        });

        const data = (await res.json()) as RoomData;
        if (cancelled) return;

        if (!data.ok || !data.roomUrl || !data.token) {
          setError(describeJoinFailure(data));
          setRequestId(data.requestId ?? null);
          setStatus('error');
          return;
        }

        const { default: DailyIframe } = await import('@daily-co/daily-js');
        if (cancelled) return;

        if (!frameRef.current) {
          setError('Classroom frame is not ready. Please retry.');
          setStatus('error');
          return;
        }

        const callObject = DailyIframe.createFrame(frameRef.current, {
          showLeaveButton: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '0.75rem',
          },
        }) as DailyCallObject;

        callRef.current = callObject;
        callObject.on('left-meeting', () => {
          void destroyDailyFrame();
          setStatus('left');
        });

        await callObject.join({ url: data.roomUrl, token: data.token, userName: displayName });
        if (!cancelled) setStatus('connected');
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
      void destroyDailyFrame();
    };
  }, [sessionId, userId, participantRole, displayName, attempt, destroyDailyFrame]);

  if (status === 'left') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 'var(--spacing-4)' }}>
        <p className="kicker" style={{ marginBottom: 'var(--spacing-2)' }}>Live Session</p>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Session ended</h1>
        <p className="body secondary" style={{ marginBottom: 'var(--spacing-6)' }}>You can rejoin this lesson while the room is still available.</p>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            data-testid="rejoin-lesson-button"
            style={{ padding: 'var(--spacing-3) var(--spacing-6)' }}
            onClick={() => {
              setAttempt((value) => value + 1);
            }}
          >
            Rejoin lesson
          </button>
          <a href="/dashboard" className="btn-secondary" style={{ padding: 'var(--spacing-3) var(--spacing-6)', display: 'inline-block' }}>Return to Dashboard</a>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 'var(--spacing-4)' }}>
        <p className="kicker" style={{ marginBottom: 'var(--spacing-2)' }}>Live Session</p>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Could not join session</h1>
        <p style={{ color: 'var(--danger)', marginBottom: 'var(--spacing-2)', fontSize: '14px' }}>{error}</p>
        {requestId ? <p className="body-sm secondary" style={{ marginBottom: 'var(--spacing-6)' }}>Request ID: {requestId}</p> : null}
        <p className="body-sm secondary" style={{ maxWidth: '560px', marginBottom: 'var(--spacing-6)' }}>
          Check camera and microphone permissions if the browser asks. On mobile, reopen the lesson after granting access.
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            data-testid="retry-join-button"
            style={{ padding: 'var(--spacing-3) var(--spacing-6)' }}
            onClick={() => {
              setAttempt((value) => value + 1);
            }}
          >
            Retry Join
          </button>
          <a href="/dashboard" className="btn-secondary" style={{ padding: 'var(--spacing-3) var(--spacing-6)', display: 'inline-block' }}>Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: '90vh', padding: 'var(--spacing-4)', gap: 'var(--spacing-4)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-4)' }}>
        <div>
          <p className="kicker" style={{ marginBottom: 'var(--spacing-2)' }}>Live Session</p>
          <h1 className="h3" style={{ marginBottom: 'var(--spacing-2)' }}>
            {status === 'connecting' ? `Connecting to ${lessonTitle}...` : lessonTitle}
          </h1>
          <p className="body-sm secondary" style={{ margin: 0 }}>
            Student: {studentName ?? 'Student'} | Tutor: {tutorName ?? 'Tutor'} | Parent: {parentName ?? 'Parent'}
          </p>
        </div>
        {status === 'connected' ? (
          <span className="badge badge-success" data-testid="lesson-call-status">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', animation: 'pulse 2s infinite' }} />
            Connected
          </span>
        ) : (
          <span className="body-sm secondary" data-testid="lesson-call-status">Connecting...</span>
        )}
      </div>

      <div style={{ display: 'grid', flex: 1, gap: 'var(--spacing-4)', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: 0 }}>
        <div
          ref={frameRef}
          data-testid="daily-call-frame"
          style={{ backgroundColor: 'var(--text-heading)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', minHeight: '400px' }}
        />

        <ContextPanel
          parentName={parentName}
          studentName={studentName}
          tutorName={tutorName}
          bookingNotes={bookingNotes}
          classroomTimeline={classroomTimeline}
        />
      </div>
    </section>
  );
}
