export type DailyPreflightResult = {
  hasMic: boolean;
  hasCamera: boolean;
  ready: boolean;
};

export type DailyParticipantState = {
  sessionId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
};

function getDailyDomain(): string {
  const domain = import.meta.env.VITE_DAILY_DOMAIN as string | undefined;
  if (!domain) throw new Error('VITE_DAILY_DOMAIN is not configured.');
  return domain;
}

export function buildRoomUrl(roomName: string): string {
  return `https://${getDailyDomain()}/${roomName}`;
}

export async function fetchRoomToken(
  roomName: string,
  participantId: string,
): Promise<{ token: string; roomUrl: string }> {
  const res = await fetch('/api/daily/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantId }),
  });
  if (!res.ok) throw new Error(`Failed to fetch Daily room token (${res.status})`);
  const data = (await res.json()) as { token: string };
  return { token: data.token, roomUrl: buildRoomUrl(roomName) };
}

export async function runPreflightChecks(): Promise<DailyPreflightResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const tracks = stream.getTracks();
    const hasMic = tracks.some((t) => t.kind === 'audio');
    const hasCamera = tracks.some((t) => t.kind === 'video');
    tracks.forEach((t) => t.stop());
    return { hasMic, hasCamera, ready: hasMic };
  } catch {
    return { hasMic: false, hasCamera: false, ready: false };
  }
}