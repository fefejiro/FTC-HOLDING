import type { AudioCallSession, AudioCallSignal, PeacePadCoordinationApi } from "../api/CoordinationApi";
import { createWriteContext } from "../domain/v2";
import { startAudioCallMedia, type AudioMediaSession } from "./AudioCallMediaCoordinator";
import type { PeacePadRealtimeChannel } from "./PrivateCallSignalSubscription";

const call: AudioCallSession = {
  id: "call-1", familyCircleId: "family-1", conversationId: "conversation-1",
  callerIdentityId: "caller-1", calleeIdentityId: "callee-1", type: "audio", status: "active",
  createdAt: "2026-08-10T20:00:00.000Z", expiresAt: "2026-08-10T20:10:00.000Z",
  acceptedAt: "2026-08-10T20:01:00.000Z", endedAt: null, endedByIdentityId: null,
  endReason: null, schemaVersion: "2.0", version: 2, region: "ca",
};

function harness(identityId = "caller-1", accessToken: string | undefined = "token") {
  const sent: AudioCallSignal[] = [];
  const handlers = new Map<string, (message: { payload?: unknown }) => void>();
  let mediaCallbacks: { onIceCandidate: (signal: AudioCallSignal & { kind: "ice" }) => void; onConnectionStateChange: (state: string) => void } | undefined;
  const media: AudioMediaSession = {
    createOffer: jest.fn(async () => ({ kind: "offer" as const, payload: { sdp: "v=0\r\noffer" } })),
    acceptOffer: jest.fn(async () => ({ kind: "answer" as const, payload: { sdp: "v=0\r\nanswer" } })),
    acceptAnswer: jest.fn(async () => undefined),
    addIceCandidate: jest.fn(async () => undefined),
    close: jest.fn(),
  };
  const channel: PeacePadRealtimeChannel = {
    on: jest.fn((_type, filter, callback) => { handlers.set(filter.event, callback); return channel; }),
    subscribe: jest.fn((callback) => { callback("SUBSCRIBED"); return channel; }),
  };
  const api = {
    getAudioCallTurnCredentials: jest.fn(async () => ({ callId: call.id, callVersion: call.version, expiresAt: call.expiresAt, iceServers: [{ urls: ["turns:relay.example.test:5349"], username: "u", credential: "c" }] })),
    sendAudioCallSignal: jest.fn(async (_id: string, signal: AudioCallSignal) => {
      sent.push(signal);
      return { delivered: true as const, callId: call.id, peerIdentityId: "peer", callVersion: call.version, sentAt: call.createdAt, expiresAt: call.expiresAt };
    }),
  } as unknown as PeacePadCoordinationApi;
  const states: string[] = [];
  const client = { setAuth: jest.fn(), channel: jest.fn(() => channel), removeChannel: jest.fn(async () => undefined) };
  const start = () => startAudioCallMedia({
    api, call, localIdentityId: identityId,
    context: () => createWriteContext({ actor: { identityId, sessionId: "session-1" }, region: "ca", expectedVersion: call.version, idempotencyKey: `signal-${sent.length}` }),
    runtime: {
      getAccessToken: async () => accessToken,
      realtimeClient: client,
      createMedia: async (_servers, callbacks) => { mediaCallbacks = callbacks; return media; },
    },
    onState: (state) => states.push(state),
  });
  const signal = (value: AudioCallSignal) => {
    const now = new Date();
    handlers.get(value.kind)?.({ payload: {
      callId: call.id, fromIdentityId: identityId === "caller-1" ? "callee-1" : "caller-1", toIdentityId: identityId,
      kind: value.kind, payload: value.payload, callVersion: call.version,
      sentAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15_000).toISOString(),
    } });
  };
  return { api, client, media, sent, states, start, signal, callbacks: () => mediaCallbacks };
}

describe("active foreground audio media coordination", () => {
  it("subscribes before the caller offer, relays ICE, and closes cleanly", async () => {
    const test = harness();
    const close = await test.start();
    expect(test.client.channel).toHaveBeenCalledTimes(1);
    expect(test.sent[0]).toEqual({ kind: "offer", payload: { sdp: "v=0\r\noffer" } });
    test.callbacks()?.onIceCandidate({ kind: "ice", payload: { candidate: "candidate", sdpMid: null, sdpMLineIndex: 0 } });
    await new Promise((resolve) => setImmediate(resolve));
    expect(test.sent[1]?.kind).toBe("ice");
    test.callbacks()?.onConnectionStateChange("connected");
    expect(test.states).toEqual(["connecting", "connected"]);
    await close();
    await close();
    expect(test.media.close).toHaveBeenCalledTimes(1);
    expect(test.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  it("answers an offer only as the verified callee", async () => {
    const test = harness("callee-1");
    await test.start();
    test.signal({ kind: "offer", payload: { sdp: "v=0\r\nremote" } });
    await new Promise((resolve) => setImmediate(resolve));
    expect(test.media.acceptOffer).toHaveBeenCalledWith("v=0\r\nremote");
    expect(test.sent).toEqual([{ kind: "answer", payload: { sdp: "v=0\r\nanswer" } }]);
  });

  it("fails closed before media creation when the authenticated token is absent", async () => {
    const test = harness("caller-1", "");
    await expect(test.start()).rejects.toThrow("session expired");
    expect(test.media.createOffer).not.toHaveBeenCalled();
    expect(test.states).toEqual(["connecting", "failed"]);
  });
});
