import type { CharacterId } from './config';

const KEY = 'gidi-dashers:save:v1';

export interface SaveState {
  highScore: number;
  totalNaira: number;
  unlocked: CharacterId[];
  selected: CharacterId;
  deviceId: string;
  playerName: string;
  muted: boolean;
}

const DEFAULT: SaveState = {
  highScore: 0,
  totalNaira: 0,
  unlocked: ['tunde'],
  selected: 'tunde',
  deviceId: '',
  playerName: '',
  muted: false,
};

function genDeviceId(): string {
  return 'gd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh: SaveState = { ...DEFAULT, deviceId: genDeviceId() };
      saveSave(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const merged: SaveState = { ...DEFAULT, ...parsed };
    if (!merged.deviceId) merged.deviceId = genDeviceId();
    if (!merged.unlocked.includes('tunde')) merged.unlocked.push('tunde');
    return merged;
  } catch {
    const fresh: SaveState = { ...DEFAULT, deviceId: genDeviceId() };
    saveSave(fresh);
    return fresh;
  }
}

export function saveSave(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function updateSave(patch: Partial<SaveState>): SaveState {
  const cur = loadSave();
  const next = { ...cur, ...patch };
  saveSave(next);
  return next;
}
