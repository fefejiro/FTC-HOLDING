const DEMO_MARKER = "[dispatch-demo]";
const DEMO_SESSION_PATTERN = /session:([a-z0-9_-]{6,64})/i;

type RequestLike = {
  notes?: string | null;
};

export function normalizeDemoSessionId(value: unknown): string | null {
  const safe = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return safe.length >= 6 ? safe : null;
}

export function buildRequestNotes(
  notes: string | undefined,
): string | undefined {
  const trimmedNotes = String(notes || "").trim();
  return trimmedNotes || undefined;
}

export function getRequestDemoMeta(notes: string | null | undefined) {
  const raw = String(notes || "").trim();
  if (!raw) {
    return { demoMode: false, demoSessionId: null as string | null, notes: "" };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const markerLine = lines.find((line) => line.toLowerCase().startsWith(DEMO_MARKER));
  const demoMode = Boolean(markerLine);
  const demoSessionId = markerLine ? markerLine.match(DEMO_SESSION_PATTERN)?.[1] || null : null;
  const cleanNotes = lines.filter((line) => line !== markerLine).join("\n").trim();

  return {
    demoMode,
    demoSessionId,
    notes: cleanNotes,
  };
}

export function serializeRequest<T extends RequestLike>(request: T) {
  const meta = getRequestDemoMeta(request.notes);
  return {
    ...request,
    notes: meta.notes || null,
    demoMode: meta.demoMode,
    demoSessionId: meta.demoSessionId,
  };
}

export function isLiveRequest(request: RequestLike) {
  const meta = getRequestDemoMeta(request.notes);
  return !meta.demoMode;
}
