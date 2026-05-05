export type DailySessionStatus = 'idle' | 'joining' | 'joined' | 'left' | 'error';

export type DailySessionState = {
  roomName: string;
  roomUrl: string;
  token: string | null;
  status: DailySessionStatus;
  errorMessage: string | null;
};

export type DailySessionAction =
  | { type: 'join'; roomName: string; token?: string }
  | { type: 'joined' }
  | { type: 'leave' }
  | { type: 'error'; message: string };

function getDailyDomain(): string {
  const domain = process.env['EXPO_PUBLIC_DAILY_DOMAIN'];
  if (!domain) throw new Error('EXPO_PUBLIC_DAILY_DOMAIN is not configured.');
  return domain;
}

export function buildRoomUrl(roomName: string, token?: string): string {
  const base = `https://${getDailyDomain()}/${roomName}`;
  return token ? `${base}?t=${encodeURIComponent(token)}` : base;
}

export function createInitialSessionState(): DailySessionState {
  return {
    roomName: '',
    roomUrl: '',
    token: null,
    status: 'idle',
    errorMessage: null,
  };
}

export function reduceSessionState(
  state: DailySessionState,
  action: DailySessionAction,
): DailySessionState {
  switch (action.type) {
    case 'join':
      return {
        ...state,
        roomName: action.roomName,
        roomUrl: buildRoomUrl(action.roomName, action.token),
        token: action.token ?? null,
        status: 'joining',
        errorMessage: null,
      };
    case 'joined':
      return { ...state, status: 'joined' };
    case 'leave':
      return createInitialSessionState();
    case 'error':
      return { ...state, status: 'error', errorMessage: action.message };
  }
}

export async function fetchRoomToken(
  roomName: string,
  participantId: string,
): Promise<{ token: string; roomUrl: string }> {
  const apiBase = process.env['EXPO_PUBLIC_API_URL'] ?? '';
  const res = await fetch(`${apiBase}/api/daily/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantId }),
  });
  if (!res.ok) throw new Error(`Token fetch failed (${res.status})`);
  const data = (await res.json()) as { token: string };
  return { token: data.token, roomUrl: buildRoomUrl(roomName, data.token) };
}