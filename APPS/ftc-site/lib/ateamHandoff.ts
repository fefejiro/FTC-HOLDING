import type { WorkflowHandoffPayload } from "./ateamWorkflow";

export type AteamDemoHandoffPayload<TOutput = unknown> = {
  version: 1;
  createdAtMs: number;
  idea: string;
  categoryValue: string;
  categoryLabel: string;
  output: TOutput;
};

export type AteamWorkflowHandoffPayload = WorkflowHandoffPayload;

const DEMO_STORAGE_KEY = "unalabs_ateam_demo_handoff_v1";
const WORKFLOW_STORAGE_KEY = "unalabs_ateam_workflow_handoff_v2";
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

function readStorage(storageKey: string, storage: Storage | null) {
  if (!storage) return null;
  try {
    return storage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStorage(storageKey: string, storage: Storage | null, value: string) {
  if (!storage) return;
  try {
    storage.setItem(storageKey, value);
  } catch {
    // Ignore blocked storage.
  }
}

function removeStorage(storageKey: string, storage: Storage | null) {
  if (!storage) return;
  try {
    storage.removeItem(storageKey);
  } catch {
    // Ignore.
  }
}

function parseDemoPayload<TOutput = unknown>(raw: string | null): AteamDemoHandoffPayload<TOutput> | null {
  if (!raw) return null;
  try {
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

function parseWorkflowPayload(raw: string | null): AteamWorkflowHandoffPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AteamWorkflowHandoffPayload>;
    if (parsed.version !== 2) return null;
    if (typeof parsed.createdAtMs !== "number" || !Number.isFinite(parsed.createdAtMs)) return null;
    if (Date.now() - parsed.createdAtMs > MAX_AGE_MS) return null;
    if (typeof parsed.runId !== "string" || !parsed.runId.trim()) return null;
    if (typeof parsed.idea !== "string" || !parsed.idea.trim()) return null;
    if (typeof parsed.categoryValue !== "string") return null;
    if (typeof parsed.categoryLabel !== "string") return null;
    if (typeof parsed.recommendedLane !== "string") return null;
    if (!parsed.brief || typeof parsed.brief !== "object") return null;
    if (!parsed.artifacts || typeof parsed.artifacts !== "object") return null;
    return parsed as AteamWorkflowHandoffPayload;
  } catch {
    return null;
  }
}

function getWindowStorage() {
  if (typeof window === "undefined") {
    return { sessionStorage: null, localStorage: null };
  }
  return {
    sessionStorage: window.sessionStorage,
    localStorage: window.localStorage
  };
}

export function saveAteamDemoHandoff(payload: AteamDemoHandoffPayload) {
  const raw = JSON.stringify(payload);
  const { sessionStorage, localStorage } = getWindowStorage();
  writeStorage(DEMO_STORAGE_KEY, sessionStorage, raw);
  writeStorage(DEMO_STORAGE_KEY, localStorage, raw);
}

export function saveAteamWorkflowHandoff(payload: AteamWorkflowHandoffPayload) {
  const raw = JSON.stringify(payload);
  const { sessionStorage, localStorage } = getWindowStorage();
  writeStorage(WORKFLOW_STORAGE_KEY, sessionStorage, raw);
  writeStorage(WORKFLOW_STORAGE_KEY, localStorage, raw);
}

export function loadAteamDemoHandoff<TOutput = unknown>(): AteamDemoHandoffPayload<TOutput> | null {
  const { sessionStorage, localStorage } = getWindowStorage();
  const fromSession = parseDemoPayload<TOutput>(readStorage(DEMO_STORAGE_KEY, sessionStorage));
  if (fromSession) return fromSession;
  return parseDemoPayload<TOutput>(readStorage(DEMO_STORAGE_KEY, localStorage));
}

export function loadAteamWorkflowHandoff(): AteamWorkflowHandoffPayload | null {
  const { sessionStorage, localStorage } = getWindowStorage();
  const fromSession = parseWorkflowPayload(readStorage(WORKFLOW_STORAGE_KEY, sessionStorage));
  if (fromSession) return fromSession;
  return parseWorkflowPayload(readStorage(WORKFLOW_STORAGE_KEY, localStorage));
}

export function clearAteamDemoHandoff() {
  const { sessionStorage, localStorage } = getWindowStorage();
  removeStorage(DEMO_STORAGE_KEY, sessionStorage);
  removeStorage(DEMO_STORAGE_KEY, localStorage);
}

export function clearAteamWorkflowHandoff() {
  const { sessionStorage, localStorage } = getWindowStorage();
  removeStorage(WORKFLOW_STORAGE_KEY, sessionStorage);
  removeStorage(WORKFLOW_STORAGE_KEY, localStorage);
}

export function clearAllAteamHandoffs() {
  clearAteamDemoHandoff();
  clearAteamWorkflowHandoff();
}
