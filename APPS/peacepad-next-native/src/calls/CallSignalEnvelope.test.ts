import { parseCallSignalEnvelope } from "./CallSignalEnvelope";

const now = Date.parse("2026-08-10T20:00:10.000Z");
const base = {
  callId: "call-1",
  fromIdentityId: "peer-1",
  toIdentityId: "local-1",
  kind: "offer",
  payload: { sdp: "v=0\r\n" },
  callVersion: 2,
  sentAt: "2026-08-10T20:00:00.000Z",
  expiresAt: "2026-08-10T20:00:15.000Z",
};
const scope = { callId: "call-1", callVersion: 2, localIdentityId: "local-1", peerIdentityId: "peer-1", now };

describe("private call signal envelope", () => {
  it("accepts only the expected peer, target, call, version and live window", () => {
    expect(parseCallSignalEnvelope(base, scope)).toEqual({
      signal: { kind: "offer", payload: { sdp: "v=0\r\n" } },
      sentAt: base.sentAt,
    });
  });

  it.each([
    { ...base, fromIdentityId: "outsider" },
    { ...base, toIdentityId: "other-device" },
    { ...base, callVersion: 1 },
    { ...base, expiresAt: "2026-08-10T20:00:10.000Z" },
    { ...base, unexpected: "field" },
    { ...base, payload: { type: "offer", sdp: "v=0\r\n" } },
  ])("rejects stale, out-of-scope, or expanded envelopes", (value) => {
    expect(parseCallSignalEnvelope(value, scope)).toBeNull();
  });

  it("accepts bounded ICE without retaining optional provider fields", () => {
    const value = {
      ...base,
      kind: "ice",
      payload: { candidate: "candidate:1", sdpMid: "audio", sdpMLineIndex: 0, usernameFragment: "ephemeral" },
    };
    expect(parseCallSignalEnvelope(value, scope)?.signal).toEqual({
      kind: "ice",
      payload: { candidate: "candidate:1", sdpMid: "audio", sdpMLineIndex: 0 },
    });
  });
});
