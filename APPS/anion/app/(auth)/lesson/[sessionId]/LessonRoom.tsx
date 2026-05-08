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
      <section className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;ve left the session</h1>
        <p className="text-gray-500 mb-6">The lesson room has ended. You can close this tab or return to your dashboard.</p>
        <a
          href="/dashboard"
          className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Could not join session</h1>
        <p className="text-red-600 mb-6">{error}</p>
        <a
          href="/dashboard"
          className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </section>
    );
  }

  return (
    <section className="flex flex-col h-[90vh] p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Live Session</span>
          <h1 className="text-lg font-bold text-gray-900">
            {status === 'loading' ? `Connecting to ${lessonTitle}…` : lessonTitle}
          </h1>
          <p className="text-xs text-gray-500 mt-1 mb-0">
            Student: {studentName ?? 'Legacy booking'}
            {' '}• Tutor: {tutorName ?? 'Unknown tutor'}
            {' '}• Parent: {parentName ?? 'Unknown parent'}
          </p>
        </div>
        {status === 'ready' && (
          <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Connected
          </span>
        )}
        {status === 'loading' && (
          <span className="text-xs text-gray-400">Joining room…</span>
        )}
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] min-h-0">
        <div
          ref={frameRef}
          className="bg-gray-900 rounded-xl overflow-hidden shadow-lg min-h-[400px]"
        />

        <aside className="rounded-xl border border-gray-200 bg-white shadow-sm min-h-[400px] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Student Activity</p>
            <h2 className="text-sm font-semibold text-gray-900 m-0">Recent classroom timeline</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {classroomTimeline.length === 0 ? (
              <p className="text-sm text-gray-500 m-0">No classroom posts yet for this student.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {classroomTimeline.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                    <p className="m-0 text-sm font-semibold text-gray-900">{entry.authorName}</p>
                    <p className="m-0 mt-1 text-xs text-gray-500">
                      {entry.authorRole === 'tutor' ? 'Teacher update' : 'Student update'}
                      {' '}• {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    <p className="m-0 mt-2 text-sm text-gray-700 whitespace-pre-wrap">{entry.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {bookingNotes ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          <strong className="text-gray-900">Booking notes:</strong> {bookingNotes}
        </div>
      ) : null}
    </section>
  );
}
