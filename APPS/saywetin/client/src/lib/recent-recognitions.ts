const RECENT_RECOGNITIONS_STORAGE_KEY = 'saywetin_recent_recognitions';
const MAX_RECENT_RECOGNITIONS = 12;

export interface RecentRecognitionTrack {
  id: string;
  title: string;
  artist: string;
  coverArtUrl?: string | null;
}

export interface RecentRecognitionSession {
  id: string;
  status: string;
  createdAt: string;
  recognizedTrack?: RecentRecognitionTrack;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isRecentRecognitionSession(value: unknown): value is RecentRecognitionSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as RecentRecognitionSession;
  return (
    typeof session.id === 'string' &&
    typeof session.status === 'string' &&
    typeof session.createdAt === 'string' &&
    (!session.recognizedTrack ||
      (typeof session.recognizedTrack.id === 'string' &&
        typeof session.recognizedTrack.title === 'string' &&
        typeof session.recognizedTrack.artist === 'string'))
  );
}

export function readRecentRecognitions(): RecentRecognitionSession[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_RECOGNITIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecentRecognitionSession);
  } catch {
    return [];
  }
}

function writeRecentRecognitions(sessions: RecentRecognitionSession[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    RECENT_RECOGNITIONS_STORAGE_KEY,
    JSON.stringify(sessions.slice(0, MAX_RECENT_RECOGNITIONS)),
  );
}

export function mergeRecentRecognitions(
  serverSessions: RecentRecognitionSession[] = [],
  localSessions: RecentRecognitionSession[] = [],
): RecentRecognitionSession[] {
  const merged = [...serverSessions, ...localSessions].filter(
    (session): session is RecentRecognitionSession => isRecentRecognitionSession(session) && !!session.recognizedTrack,
  );

  merged.sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  });

  const seenTrackIds = new Set<string>();
  const deduped: RecentRecognitionSession[] = [];

  for (const session of merged) {
    const trackId = session.recognizedTrack?.id;
    if (!trackId || seenTrackIds.has(trackId)) {
      continue;
    }

    seenTrackIds.add(trackId);
    deduped.push(session);
  }

  return deduped.slice(0, MAX_RECENT_RECOGNITIONS);
}

export function saveRecentRecognition(track: RecentRecognitionTrack): RecentRecognitionSession[] {
  const nextSession: RecentRecognitionSession = {
    id: `local-${track.id}-${Date.now()}`,
    status: 'success',
    createdAt: new Date().toISOString(),
    recognizedTrack: track,
  };

  const merged = mergeRecentRecognitions([nextSession], readRecentRecognitions());
  writeRecentRecognitions(merged);
  return merged;
}
