export type AudioCallSignalKind = "offer" | "answer" | "ice";

export type ValidAudioCallSignal = Readonly<{
  kind: AudioCallSignalKind;
  payload: Readonly<Record<string, unknown>>;
}>;

export const AUDIO_CALL_SIGNAL_BODY_BYTES = 14_000;
export const AUDIO_CALL_SDP_BYTES = 12_000;
export const AUDIO_CALL_ICE_CANDIDATE_BYTES = 2_048;

const encoder = new TextEncoder();
const byteLength = (value: string): number => encoder.encode(value).byteLength;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(value).every((key) => allowed.includes(key)) && allowed.every((key) => key in value);
const optionalNullableString = (value: unknown, maximumBytes: number): boolean =>
  value === undefined || value === null || (typeof value === "string" && byteLength(value) <= maximumBytes && !value.includes("\0"));

export const validateAudioCallSignal = (body: Record<string, unknown>): ValidAudioCallSignal | null => {
  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    return null;
  }
  if (byteLength(serialized) > AUDIO_CALL_SIGNAL_BODY_BYTES || !exactKeys(body, ["kind", "payload"])) return null;
  if (!isObject(body.payload) || !["offer", "answer", "ice"].includes(String(body.kind))) return null;

  if (body.kind === "offer" || body.kind === "answer") {
    if (!exactKeys(body.payload, ["sdp"])) return null;
    const sdp = body.payload.sdp;
    if (typeof sdp !== "string" || !sdp.startsWith("v=0") || sdp.includes("\0") || byteLength(sdp) > AUDIO_CALL_SDP_BYTES) return null;
    return { kind: body.kind, payload: { sdp } };
  }

  const allowedIceKeys = ["candidate", "sdpMid", "sdpMLineIndex", "usernameFragment"] as const;
  if (!Object.keys(body.payload).every((key) => allowedIceKeys.includes(key as typeof allowedIceKeys[number]))) return null;
  const candidate = body.payload.candidate;
  const sdpMLineIndex = body.payload.sdpMLineIndex;
  if (
    typeof candidate !== "string"
    || candidate.includes("\0")
    || byteLength(candidate) > AUDIO_CALL_ICE_CANDIDATE_BYTES
    || !optionalNullableString(body.payload.sdpMid, 128)
    || !(sdpMLineIndex === undefined || sdpMLineIndex === null || (Number.isInteger(sdpMLineIndex) && Number(sdpMLineIndex) >= 0 && Number(sdpMLineIndex) <= 65_535))
    || !optionalNullableString(body.payload.usernameFragment, 256)
  ) return null;

  return {
    kind: "ice",
    payload: {
      candidate,
      ...(body.payload.sdpMid !== undefined ? { sdpMid: body.payload.sdpMid } : {}),
      ...(sdpMLineIndex !== undefined ? { sdpMLineIndex } : {}),
      ...(body.payload.usernameFragment !== undefined ? { usernameFragment: body.payload.usernameFragment } : {}),
    },
  };
};
