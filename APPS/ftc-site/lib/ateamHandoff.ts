export type AteamDemoHandoffPayload<TOutput = unknown> = {
  version: 1;
  createdAtMs: number;
  idea: string;
  categoryValue: string;
  categoryLabel: string;
  output: TOutput;
};

const STORAGE_KEY = "unalabs_ateam_demo_handoff_v1";
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

export function saveAteamDemoHandoff(payload: AteamDemoHandoffPayload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode, blocked storage).
  }
}

export function loadAteamDemoHandoff<TOutput = unknown>(): AteamDemoHandoffPayload<TOutput> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AteamDemoHandoffPayload<TOutput>>;
    if (parsed.version !== 1) return null;
    if (typeof parsed.createdAtMs !== "number" || !Number.isFinite(parsed.createdAtMs)) return null;
    if (Date.now() - parsed.createdAtMs > MAX_AGE_MS) return null;
    if (typeof parsed.idea !== "string") return null;
    if (typeof parsed.categoryValue !== "string") return null;
    if (typeof parsed.categoryLabel !== "string") return null;
    return parsed as AteamDemoHandoffPayload<TOutput>;
  } catch {
    return null;
  }
}

export function clearAteamDemoHandoff() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

