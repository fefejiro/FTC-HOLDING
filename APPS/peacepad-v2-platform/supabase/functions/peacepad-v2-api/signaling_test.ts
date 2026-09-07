import {
  AUDIO_CALL_ICE_CANDIDATE_BYTES,
  AUDIO_CALL_SDP_BYTES,
  validateAudioCallSignal,
} from "./signaling.ts";

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

Deno.test("accepts bounded offer, answer, and ICE schemas", () => {
  assert(validateAudioCallSignal({ kind: "offer", payload: { sdp: "v=0\r\no=fixture" } })?.kind === "offer", "offer rejected");
  assert(validateAudioCallSignal({ kind: "answer", payload: { sdp: "v=0\r\no=fixture" } })?.kind === "answer", "answer rejected");
  assert(validateAudioCallSignal({
    kind: "ice",
    payload: { candidate: "candidate:fixture", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: "fixture" },
  })?.kind === "ice", "ICE rejected");
});

Deno.test("rejects participant identifiers, extra fields, malformed SDP, and unknown kinds", () => {
  for (const body of [
    { kind: "offer", payload: { sdp: "v=0" }, targetIdentityId: crypto.randomUUID() },
    { kind: "offer", payload: { sdp: "v=0", senderIdentityId: crypto.randomUUID() } },
    { kind: "offer", payload: { sdp: "not-sdp" } },
    { kind: "video", payload: { sdp: "v=0" } },
    { kind: "ice", payload: { candidate: "fixture", arbitrary: true } },
  ]) assert(validateAudioCallSignal(body) === null, `unexpected valid signal: ${JSON.stringify(body)}`);
});

Deno.test("rejects SDP and ICE values beyond conservative byte limits", () => {
  assert(validateAudioCallSignal({ kind: "offer", payload: { sdp: `v=0${"x".repeat(AUDIO_CALL_SDP_BYTES)}` } }) === null, "oversized SDP accepted");
  assert(validateAudioCallSignal({ kind: "ice", payload: { candidate: "x".repeat(AUDIO_CALL_ICE_CANDIDATE_BYTES + 1) } }) === null, "oversized ICE accepted");
});
