import type { AudioCallSignal } from "../api/CoordinationApi";

export type VerifiedCallSignal = Readonly<{
  signal: AudioCallSignal;
  sentAt: string;
}>;

type ExpectedSignalScope = Readonly<{
  callId: string;
  callVersion: number;
  localIdentityId: string;
  peerIdentityId: string;
  now?: number;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).length === allowed.length
  && Object.keys(value).every((key) => allowed.includes(key));

export function parseCallSignalEnvelope(
  raw: unknown,
  expected: ExpectedSignalScope,
): VerifiedCallSignal | null {
  if (!isRecord(raw)) return null;
  const keys = ["callId", "fromIdentityId", "toIdentityId", "kind", "payload", "callVersion", "sentAt", "expiresAt"];
  if (!exactKeys(raw, keys)) return null;
  if (
    raw.callId !== expected.callId
    || raw.callVersion !== expected.callVersion
    || raw.fromIdentityId !== expected.peerIdentityId
    || raw.toIdentityId !== expected.localIdentityId
    || !isRecord(raw.payload)
    || typeof raw.sentAt !== "string"
    || typeof raw.expiresAt !== "string"
  ) return null;

  const now = expected.now ?? Date.now();
  const sentAt = Date.parse(raw.sentAt);
  const expiresAt = Date.parse(raw.expiresAt);
  if (!Number.isFinite(sentAt) || !Number.isFinite(expiresAt) || sentAt > now + 5_000 || expiresAt <= now || expiresAt - sentAt > 20_000) return null;

  if (raw.kind === "offer" || raw.kind === "answer") {
    if (!exactKeys(raw.payload, ["sdp"]) || typeof raw.payload.sdp !== "string" || !raw.payload.sdp.startsWith("v=0") || raw.payload.sdp.length > 12_000) return null;
    return { signal: { kind: raw.kind, payload: { sdp: raw.payload.sdp } }, sentAt: raw.sentAt };
  }

  if (raw.kind !== "ice") return null;
  const allowed = ["candidate", "sdpMid", "sdpMLineIndex", "usernameFragment"];
  if (!Object.keys(raw.payload).every((key) => allowed.includes(key))) return null;
  const { candidate, sdpMid = null, sdpMLineIndex = null } = raw.payload;
  if (
    typeof candidate !== "string"
    || candidate.length > 2_048
    || !(sdpMid === null || (typeof sdpMid === "string" && sdpMid.length <= 128))
    || !(sdpMLineIndex === null || (Number.isInteger(sdpMLineIndex) && Number(sdpMLineIndex) >= 0 && Number(sdpMLineIndex) <= 65_535))
  ) return null;
  return {
    signal: { kind: "ice", payload: { candidate, sdpMid, sdpMLineIndex: sdpMLineIndex as number | null } },
    sentAt: raw.sentAt,
  };
}
