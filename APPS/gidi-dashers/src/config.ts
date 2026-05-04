// Game-wide constants. Tune here.
export const GAME = {
  WIDTH: 360,
  HEIGHT: 640,
  LANE_COUNT: 3,
  LANE_X: [90, 180, 270] as const, // x positions for 3 lanes (centered in 360w)
  PLAYER_START_LANE: 1, // middle
  PLAYER_Y: 520,
  GROUND_Y: 560,
  GRAVITY: 2200,
  JUMP_VELOCITY: -900,
  SLIDE_DURATION_MS: 600,
  LANE_SWITCH_MS: 110,
  BASE_SCROLL_SPEED: 360, // px/sec
  SPEED_RAMP_PER_SEC: 6,  // +6 px/sec each second
  MAX_SCROLL_SPEED: 900,
  SPAWN_INTERVAL_MIN_MS: 600,
  SPAWN_INTERVAL_MAX_MS: 1300,
  PICKUP_VALUE: { N100: 100, N500: 500, N1000: 1000 } as const,
  POWERUP_DURATION_MS: { boost: 5000, shield: 0, magnet: 8000, jetpack: 10000 } as const,
} as const;

export const COLORS = {
  bg: 0x0a0a0a,
  road: 0x1f1f24,
  laneLine: 0x3a3a44,
  player: 0xffd23f,      // Lagos yellow
  molue: 0xf4c20d,       // bright yellow bus
  danfo: 0xfb923c,       // orange-yellow (clearly distinct from molue)
  okada: 0x9ca3af,       // light gray motorbike
  pothole: 0x000000,     // pure black flat
  lastma: 0x16a34a,      // LASTMA green
  naira: 0xfacc15,       // GOLD coin (no longer green – avoids lastma confusion)
  nairaBig: 0xf59e0b,    // ₦500
  nairaMega: 0xea580c,   // ₦1000
  shield: 0x3b82f6,      // blue
  magnet: 0xeab308,      // amber
  boost: 0xf97316,       // orange
  jetpack: 0xef4444,     // red
  ui: 0xffffff,
} as const;

export type CharacterId = 'tunde' | 'amaka' | 'baba';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  unlockCost: number; // 0 = free
  tint: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  tunde: { id: 'tunde', name: 'Tunde the Hustler', unlockCost: 0, tint: 0xffd23f },
  amaka: { id: 'amaka', name: 'Amaka the Trader', unlockCost: 5000, tint: 0xec4899 },
  baba:  { id: 'baba',  name: 'Baba Wahala',      unlockCost: 50000, tint: 0x8b5cf6 },
};
