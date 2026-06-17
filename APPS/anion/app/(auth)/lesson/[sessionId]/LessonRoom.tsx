'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WhiteboardCanvas from './WhiteboardCanvas';

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
  profileId: string;
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
  localMode?: boolean;
  message?: string;
  code?: string;
  requestId?: string;
};

type LessonStatus = 'connecting' | 'connected' | 'error' | 'left';
type BackgroundMode = 'none' | 'soft-blur' | 'strong-blur';
type RoomRenderMode = 'empty' | 'local-demo' | 'daily-custom';

type DailyEventName =
  | 'joined-meeting'
  | 'left-meeting'
  | 'participant-joined'
  | 'participant-updated'
  | 'participant-left'
  | 'track-started'
  | 'track-stopped'
  | 'camera-error'
  | 'error'
  | 'nonfatal-error';

type DailyTrackStateLike = {
  state?: string;
  track?: MediaStreamTrack;
  persistentTrack?: MediaStreamTrack;
};

type DailyParticipantLike = {
  session_id?: string;
  user_id?: string;
  user_name?: string;
  local?: boolean;
  owner?: boolean;
  tracks?: {
    video?: DailyTrackStateLike;
    audio?: DailyTrackStateLike;
  };
};

type DailyParticipantsLike = {
  local?: DailyParticipantLike;
  [id: string]: DailyParticipantLike | undefined;
};

type DailyEventPayload = {
  errorMsg?: string;
  error?: {
    msg?: string;
    message?: string;
  };
  participant?: DailyParticipantLike | null;
};

type DailyEventHandler = (event?: DailyEventPayload) => void;

type DailyCallObject = {
  join: (options: { url: string; token: string; userName: string }) => Promise<unknown>;
  leave: () => Promise<void>;
  destroy: () => Promise<void>;
  participants: () => DailyParticipantsLike;
  on: (eventName: DailyEventName, handler: DailyEventHandler) => DailyCallObject;
  off?: (eventName: DailyEventName, handler: DailyEventHandler) => DailyCallObject;
  updateInputSettings: (settings: {
    video: {
      processor:
        | { type: 'none' }
        | { type: 'background-blur'; config: { strength: number } };
    };
  }) => Promise<unknown>;
};

type DailyVideoParticipant = {
  id: string;
  name: string;
  local: boolean;
  owner: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoState: string;
  audioState: string;
};

const backgroundOptions: Array<{ mode: BackgroundMode; label: string; status: string }> = [
  { mode: 'none', label: 'Off', status: 'Background off' },
  { mode: 'soft-blur', label: 'Soft', status: 'Soft blur active' },
  { mode: 'strong-blur', label: 'Strong', status: 'Strong blur active' },
];

function getBackgroundProcessor(mode: BackgroundMode) {
  if (mode === 'soft-blur') {
    return { type: 'background-blur' as const, config: { strength: 0.45 } };
  }

  if (mode === 'strong-blur') {
    return { type: 'background-blur' as const, config: { strength: 1 } };
  }

  return { type: 'none' as const };
}

function getBackgroundStatus(mode: BackgroundMode) {
  return backgroundOptions.find((option) => option.mode === mode)?.status ?? 'Background off';
}

async function updateCallBackground(callObject: DailyCallObject, mode: BackgroundMode) {
  await callObject.updateInputSettings({
    video: {
      processor: getBackgroundProcessor(mode),
    },
  });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function getTrack(trackState?: DailyTrackStateLike) {
  return trackState?.persistentTrack ?? trackState?.track ?? null;
}

function snapshotDailyParticipants(participants: DailyParticipantsLike): DailyVideoParticipant[] {
  const seen = new Set<string>();
  const snapshots: DailyVideoParticipant[] = [];

  for (const participant of Object.values(participants)) {
    if (!participant) continue;

    const id = participant.session_id || participant.user_id || (participant.local ? 'local' : `participant-${snapshots.length + 1}`);
    if (seen.has(id)) continue;
    seen.add(id);

    snapshots.push({
      id,
      name: participant.user_name || (participant.local ? 'You' : 'Participant'),
      local: participant.local === true,
      owner: participant.owner === true,
      videoTrack: getTrack(participant.tracks?.video),
      audioTrack: getTrack(participant.tracks?.audio),
      videoState: participant.tracks?.video?.state ?? 'off',
      audioState: participant.tracks?.audio?.state ?? 'off',
    });
  }

  return snapshots.sort((a, b) => {
    if (a.local) return -1;
    if (b.local) return 1;
    return a.name.localeCompare(b.name);
  });
}

function getDailyEventMessage(event?: DailyEventPayload) {
  return event?.errorMsg ?? event?.error?.message ?? event?.error?.msg ?? 'Daily call error';
}

function VideoTrackView({
  participant,
}: {
  participant: DailyVideoParticipant;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !participant.videoTrack) return;

    video.srcObject = new MediaStream([participant.videoTrack]);
    void video.play().catch(() => {});

    return () => {
      video.srcObject = null;
    };
  }, [participant.videoTrack]);

  if (!participant.videoTrack) {
    return (
      <div
        data-testid={participant.local ? 'daily-local-video-placeholder' : 'daily-remote-video-placeholder'}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#0f766e,#1f2937)',
          color: '#fff',
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 800,
        }}
      >
        {getInitials(participant.name)}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={participant.local}
      data-testid={participant.local ? 'daily-local-video' : 'daily-remote-video'}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#0f172a' }}
    />
  );
}

function AudioTrackView({ participant }: { participant: DailyVideoParticipant }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !participant.audioTrack || participant.local) return;

    audio.srcObject = new MediaStream([participant.audioTrack]);
    void audio.play().catch(() => {});

    return () => {
      audio.srcObject = null;
    };
  }, [participant.audioTrack, participant.local]);

  if (participant.local || !participant.audioTrack) return null;
  return <audio ref={audioRef} autoPlay data-testid="daily-remote-audio" />;
}

function ParticipantTile({ participant }: { participant: DailyVideoParticipant }) {
  const mutedLabel = participant.audioState === 'off' || participant.audioState === 'blocked' ? 'Muted' : 'Audio on';

  return (
    <article
      data-testid={participant.local ? 'daily-local-tile' : 'daily-remote-tile'}
      style={{
        position: 'relative',
        minHeight: participant.local ? '240px' : '180px',
        overflow: 'hidden',
        borderRadius: '12px',
        border: participant.local ? '2px solid rgba(20,184,166,.72)' : '1px solid rgba(255,255,255,.18)',
        background: '#111827',
      }}
    >
      <VideoTrackView participant={participant} />
      <div
        style={{
          position: 'absolute',
          left: '12px',
          right: '12px',
          bottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          alignItems: 'center',
          color: '#fff',
          textShadow: '0 1px 8px rgba(0,0,0,.5)',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {participant.local ? `${participant.name} (you)` : participant.name}
        </span>
        <span
          style={{
            flex: '0 0 auto',
            borderRadius: '999px',
            background: 'rgba(15,23,42,.72)',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {mutedLabel}
        </span>
      </div>
    </article>
  );
}

function DailyCustomCallStage({
  participants,
  backgroundMode,
}: {
  participants: DailyVideoParticipant[];
  backgroundMode: BackgroundMode;
}) {
  const localParticipant = participants.find((participant) => participant.local);
  const remoteParticipants = participants.filter((participant) => !participant.local);
  const orderedParticipants = localParticipant ? [localParticipant, ...remoteParticipants] : participants;

  return (
    <div
      data-testid="daily-custom-call-room"
      data-background-mode={backgroundMode}
      data-participant-count={participants.length}
      style={{
        height: '100%',
        minHeight: '400px',
        display: 'grid',
        gridTemplateRows: '1fr auto',
        gap: '12px',
        padding: '12px',
        background:
          backgroundMode === 'none'
            ? '#0f172a'
            : backgroundMode === 'soft-blur'
              ? 'linear-gradient(135deg,#0f766e,#334155)'
              : 'linear-gradient(135deg,#0f172a,#0f766e,#f97316)',
        color: '#fff',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: orderedParticipants.length > 1 ? 'minmax(0,2fr) minmax(220px,1fr)' : 'minmax(0,1fr)',
          gap: '12px',
          minHeight: 0,
        }}
      >
        {orderedParticipants.length > 0 ? (
          orderedParticipants.map((participant) => <ParticipantTile key={participant.id} participant={participant} />)
        ) : (
          <div
            data-testid="daily-media-waiting"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '260px',
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,.35)',
              background: 'rgba(15,23,42,.56)',
              fontWeight: 700,
            }}
          >
            Preparing camera and microphone...
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span data-testid="daily-peer-status" style={{ fontSize: '13px', fontWeight: 700 }}>
          {remoteParticipants.length > 0 ? `${remoteParticipants.length} participant${remoteParticipants.length === 1 ? '' : 's'} connected` : 'Waiting for the other participant'}
        </span>
        <span style={{ fontSize: '12px', opacity: 0.82 }}>Anion call UI</span>
      </div>

      <div style={{ display: 'none' }}>
        {remoteParticipants.map((participant) => <AudioTrackView key={`${participant.id}-audio`} participant={participant} />)}
      </div>
    </div>
  );
}

function describeJoinFailure(data: RoomData): string {
  if (data.message) return data.message;

  switch (data.code) {
    case 'UNAUTHENTICATED':
      return 'Please sign in again before joining this lesson.';
    case 'LESSON_ACCESS_DENIED':
      return 'This lesson is only available to the assigned tutor and student.';
    case 'CLASS_NOT_OPEN':
      return 'Class is not open yet. You can join 10 minutes before the scheduled start.';
    case 'CLASS_ENDED':
      return 'Class has ended. This room is no longer open.';
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
  profileId,
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
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
  const [backgroundStatus, setBackgroundStatus] = useState('Background off');
  const [roomRenderMode, setRoomRenderMode] = useState<RoomRenderMode>('empty');
  const [callParticipants, setCallParticipants] = useState<DailyVideoParticipant[]>([]);
  const callRef = useRef<DailyCallObject | null>(null);
  const backgroundModeRef = useRef<BackgroundMode>('none');
  const roomRenderModeRef = useRef<RoomRenderMode>('empty');

  const setRenderMode = useCallback((mode: RoomRenderMode) => {
    roomRenderModeRef.current = mode;
    setRoomRenderMode(mode);
  }, []);

  const updateLocalDemoBackground = useCallback((mode: BackgroundMode) => {
    const room = frameRef.current?.querySelector('[data-testid="local-demo-video-room"]') as HTMLElement | null;
    if (!room) return;

    const videoPanel = room.querySelector('[data-local-demo-video-panel="true"]') as HTMLElement | null;
    const label = room.querySelector('[data-local-demo-background-label="true"]') as HTMLElement | null;

    room.dataset.backgroundMode = mode;

    if (videoPanel) {
      videoPanel.style.background =
        mode === 'none'
          ? '#111827'
          : mode === 'soft-blur'
            ? 'linear-gradient(135deg,#0f766e,#334155)'
            : 'linear-gradient(135deg,#0f172a,#0f766e,#f97316)';
    }

    if (label) {
      label.textContent = getBackgroundStatus(mode);
    }
  }, []);

  const applyBackground = useCallback(
    async (mode: BackgroundMode) => {
      backgroundModeRef.current = mode;
      setBackgroundMode(mode);
      updateLocalDemoBackground(mode);

      const callObject = callRef.current;
      if (!callObject) {
        setBackgroundStatus('Background will apply after join');
        return;
      }

      setBackgroundStatus('Applying background...');
      try {
        await updateCallBackground(callObject, mode);
        updateLocalDemoBackground(mode);
        setBackgroundStatus(getBackgroundStatus(mode));
      } catch (err) {
        setBackgroundStatus(err instanceof Error ? err.message : 'Could not apply background');
      }
    },
    [updateLocalDemoBackground],
  );

  const destroyDailyFrame = useCallback(async () => {
    const existingCall = callRef.current;
    const previousMode = roomRenderModeRef.current;
    callRef.current = null;
    setCallParticipants([]);
    setRenderMode('empty');

    if (existingCall) {
      await existingCall.destroy().catch(() => {});
    }

    if (previousMode === 'local-demo' && frameRef.current) {
      frameRef.current.innerHTML = '';
    }
  }, [setRenderMode]);

  const leaveDailyFrame = useCallback(async () => {
    const existingCall = callRef.current;
    if (existingCall) {
      await existingCall.leave().catch(() => {});
    }
    await destroyDailyFrame();
    setStatus('left');
  }, [destroyDailyFrame]);

  const syncDailyParticipants = useCallback((callObject: DailyCallObject) => {
    setCallParticipants(snapshotDailyParticipants(callObject.participants()));
  }, []);

  const startLocalDemoFrame = useCallback(async () => {
    if (!frameRef.current) {
      throw new Error('Classroom frame is not ready. Please retry.');
    }

    const currentBackgroundMode = backgroundModeRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localName = displayName || (participantRole === 'tutor' ? 'Demo Tutor' : 'Demo Student');
    const peerName = participantRole === 'tutor' ? 'Zoe Demo Student' : 'Ada Demo Tutor';

    setRenderMode('daily-custom');
    setCallParticipants([
      {
        id: 'local-demo-self',
        name: localName,
        local: true,
        owner: participantRole === 'tutor',
        videoTrack: stream.getVideoTracks()[0] ?? null,
        audioTrack: stream.getAudioTracks()[0] ?? null,
        videoState: stream.getVideoTracks()[0] ? 'playable' : 'off',
        audioState: stream.getAudioTracks()[0] ? 'playable' : 'off',
      },
      {
        id: 'local-demo-peer',
        name: peerName,
        local: false,
        owner: participantRole === 'student',
        videoTrack: null,
        audioTrack: null,
        videoState: 'off',
        audioState: 'off',
      },
    ]);

    callRef.current = {
      join: async () => {},
      leave: async () => {},
      participants: () => ({}),
      on: () => callRef.current as DailyCallObject,
      updateInputSettings: async () => {
        return {};
      },
      destroy: async () => {
        stream.getTracks().forEach((track) => track.stop());
      },
    };
    setBackgroundStatus(getBackgroundStatus(currentBackgroundMode));
  }, [displayName, participantRole, setRenderMode]);

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

        if (!data.ok || !data.roomUrl || (!data.token && !data.localMode)) {
          setError(describeJoinFailure(data));
          setRequestId(data.requestId ?? null);
          setStatus('error');
          return;
        }

        if (data.localMode) {
          await startLocalDemoFrame();
          const currentBackgroundMode = backgroundModeRef.current;
          if (callRef.current && currentBackgroundMode !== 'none') {
            await updateCallBackground(callRef.current, currentBackgroundMode);
            updateLocalDemoBackground(currentBackgroundMode);
          }
          if (!cancelled) setStatus('connected');
          return;
        }

        const { default: DailyIframe } = await import('@daily-co/daily-js');
        if (cancelled) return;

        if (!frameRef.current) {
          setError('Classroom frame is not ready. Please retry.');
          setStatus('error');
          return;
        }

        setRenderMode('daily-custom');
        const callObject = DailyIframe.createCallObject() as DailyCallObject;

        callRef.current = callObject;
        const syncParticipants = () => {
          if (cancelled) return;
          syncDailyParticipants(callObject);
        };
        const handleLeft = () => {
          if (cancelled) return;
          void destroyDailyFrame();
          setStatus('left');
        };
        const handleDailyError = (event?: DailyEventPayload) => {
          if (cancelled) return;
          setError(getDailyEventMessage(event));
          setStatus('error');
        };

        callObject.on('joined-meeting', syncParticipants);
        callObject.on('participant-joined', syncParticipants);
        callObject.on('participant-updated', syncParticipants);
        callObject.on('participant-left', syncParticipants);
        callObject.on('track-started', syncParticipants);
        callObject.on('track-stopped', syncParticipants);
        callObject.on('left-meeting', handleLeft);
        callObject.on('camera-error', handleDailyError);
        callObject.on('error', handleDailyError);
        callObject.on('nonfatal-error', handleDailyError);

        await callObject.join({ url: data.roomUrl, token: data.token ?? '', userName: displayName });
        syncParticipants();
        const currentBackgroundMode = backgroundModeRef.current;
        if (currentBackgroundMode !== 'none') {
          await updateCallBackground(callObject, currentBackgroundMode);
        }
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
  }, [sessionId, userId, participantRole, displayName, attempt, destroyDailyFrame, setRenderMode, startLocalDemoFrame, syncDailyParticipants, updateLocalDemoBackground]);

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
              setStatus('connecting');
              setError(null);
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
              setStatus('connecting');
              setError(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div
              aria-label="Video background"
              role="group"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '3px', backgroundColor: 'var(--surface)' }}
            >
              {backgroundOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  data-testid={`background-option-${option.mode}`}
                  aria-pressed={backgroundMode === option.mode}
                  onClick={() => {
                    void applyBackground(option.mode);
                  }}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: backgroundMode === option.mode ? '#fff' : 'var(--text-body)',
                    backgroundColor: backgroundMode === option.mode ? 'var(--brand-teal)' : 'transparent',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="body-sm secondary" data-testid="background-status">{backgroundStatus}</span>
            <span className="badge badge-success" data-testid="lesson-call-status">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', animation: 'pulse 2s infinite' }} />
              Connected
            </span>
            <button
              type="button"
              className="btn-secondary"
              data-testid="leave-lesson-button"
              style={{ padding: '8px 12px' }}
              onClick={() => {
                void leaveDailyFrame();
              }}
            >
              Leave lesson
            </button>
          </div>
        ) : (
          <span className="body-sm secondary" data-testid="lesson-call-status">Connecting...</span>
        )}
      </div>

      <div style={{ display: 'grid', flex: 1, gap: 'var(--spacing-4)', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateRows: 'minmax(360px, 1.25fr) minmax(280px, .85fr)', gap: 'var(--spacing-4)', minHeight: 0 }}>
          <div
            ref={frameRef}
            data-testid="daily-call-frame"
            style={{ backgroundColor: 'var(--text-heading)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', minHeight: '360px' }}
          >
            {roomRenderMode === 'daily-custom' ? (
              <DailyCustomCallStage participants={callParticipants} backgroundMode={backgroundMode} />
            ) : null}
          </div>

          <WhiteboardCanvas
            bookingId={sessionId}
            authorProfileId={profileId}
            authorRole={participantRole}
          />
        </div>

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
