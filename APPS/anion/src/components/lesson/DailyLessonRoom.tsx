import { useState, useEffect, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import type { DailyCall } from '@daily-co/daily-js';
import { DailyProvider, useParticipantIds, useLocalSessionId, DailyVideo } from '@daily-co/daily-react';
import { buildRoomUrl, runPreflightChecks } from '../../services/daily';
import type { DailyPreflightResult } from '../../services/daily';

function LessonCallView({ onLeave }: { onLeave: () => void }) {
  const localId = useLocalSessionId();
  const participantIds = useParticipantIds();
  const remoteIds = participantIds.filter((id) => id !== localId);

  return (
    <div className="lesson-call">
      <div className="video-grid">
        {localId && (
          <div className="video-tile video-tile--local">
            <DailyVideo sessionId={localId} type="video" mirror />
            <span className="video-label">You</span>
          </div>
        )}
        {remoteIds.map((id) => (
          <div key={id} className="video-tile">
            <DailyVideo sessionId={id} type="video" />
          </div>
        ))}
        {remoteIds.length === 0 && (
          <p className="lesson-waiting">Waiting for the other participant to join…</p>
        )}
      </div>
      <div className="lesson-controls">
        <button onClick={onLeave}>Leave Lesson</button>
      </div>
    </div>
  );
}

type Props = {
  roomName?: string;
  token?: string;
};

export function DailyLessonRoom({ roomName, token }: Props) {
  const [preflight, setPreflight] = useState<DailyPreflightResult | null>(null);
  const [isCheckingDevices, setIsCheckingDevices] = useState(true);
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [status, setStatus] = useState<'preflight' | 'ready' | 'joining' | 'joined' | 'left' | 'error'>('preflight');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runPreflightChecks().then((result) => {
      setPreflight(result);
      setIsCheckingDevices(false);
      setStatus('ready');
    });
  }, []);

  const joinRoom = useCallback(async () => {
    if (!roomName) {
      setError('No lesson room has been assigned to this session yet.');
      return;
    }
    if (!preflight?.ready) {
      setError('Microphone access is required to join the lesson.');
      return;
    }
    try {
      setStatus('joining');
      const call = DailyIframe.createCallObject();
      await call.join({ url: buildRoomUrl(roomName), token });
      setCallObject(call);
      setStatus('joined');
      call.on('left-meeting', () => {
        setStatus('left');
        setCallObject(null);
        call.destroy();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join the lesson room.');
      setStatus('error');
    }
  }, [preflight, roomName, token]);

  const leaveRoom = useCallback(async () => {
    if (callObject) {
      await callObject.leave();
    }
  }, [callObject]);

  if (isCheckingDevices) {
    return (
      <div className="lesson-preflight">
        <p>Checking your devices…</p>
      </div>
    );
  }

  if (status === 'left') {
    return (
      <div className="lesson-ended">
        <p>Lesson ended. Thank you!</p>
      </div>
    );
  }

  if (status === 'joined' && callObject) {
    return (
      <DailyProvider callObject={callObject}>
        <LessonCallView onLeave={leaveRoom} />
      </DailyProvider>
    );
  }

  return (
    <div className="lesson-preflight">
      {preflight && (
        <ul className="preflight-checks">
          <li className={preflight.hasMic ? 'check-ok' : 'check-fail'}>
            {preflight.hasMic ? '✓' : '✗'} Microphone
          </li>
          <li className={preflight.hasCamera ? 'check-ok' : 'check-fail'}>
            {preflight.hasCamera ? '✓' : '✗'} Camera
          </li>
        </ul>
      )}
      {!roomName && <p className="lesson-notice">No lesson room assigned. Join a booking to enter a live session.</p>}
      {error && <p className="lesson-error">{error}</p>}
      {status === 'error' ? (
        <button onClick={() => setStatus('ready')}>Try Again</button>
      ) : (
        <button onClick={joinRoom} disabled={status === 'joining' || !roomName || !preflight?.ready}>
          {status === 'joining' ? 'Joining…' : 'Join Lesson'}
        </button>
      )}
    </div>
  );
}