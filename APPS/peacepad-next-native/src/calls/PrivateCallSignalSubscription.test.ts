import type { AudioCallSession } from "../api/CoordinationApi";
import { openPrivateCallSignalSubscription, type PeacePadRealtimeChannel } from "./PrivateCallSignalSubscription";

const call: AudioCallSession = {
  id: "call-1", familyCircleId: "family-1", conversationId: "conversation-1",
  callerIdentityId: "local-1", calleeIdentityId: "peer-1", type: "audio", status: "active",
  createdAt: "2026-08-10T20:00:00.000Z", expiresAt: "2026-08-10T20:10:00.000Z",
  acceptedAt: "2026-08-10T20:00:01.000Z", endedAt: null, endedByIdentityId: null,
  endReason: null, schemaVersion: "2.0", version: 2, region: "ca",
};

function fakeClient(subscribeStatus = "SUBSCRIBED") {
  const handlers = new Map<string, (message: { payload?: unknown }) => void>();
  const channel: PeacePadRealtimeChannel = {
    on: jest.fn((_type, filter, callback) => { handlers.set(filter.event, callback); return channel; }),
    subscribe: jest.fn((callback) => { callback(subscribeStatus); return channel; }),
  };
  const client = {
    setAuth: jest.fn(),
    channel: jest.fn(() => channel),
    removeChannel: jest.fn(async () => undefined),
  };
  return { client, channel, handlers };
}

describe("private call Realtime subscription", () => {
  it("authenticates and joins only the exact private versioned topic", async () => {
    const fake = fakeClient();
    const onSignal = jest.fn();
    const close = await openPrivateCallSignalSubscription({ client: fake.client, accessToken: "jwt", call, localIdentityId: "local-1", onSignal });
    expect(fake.client.setAuth).toHaveBeenCalledWith("jwt");
    expect(fake.client.channel).toHaveBeenCalledWith("peacepad:call:call-1:v2", {
      config: { private: true, broadcast: { self: false } },
    });
    expect(fake.channel.on).toHaveBeenCalledTimes(3);
    await close();
    await close();
    expect(fake.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  it("forwards only valid, live peer-to-local signals", async () => {
    const fake = fakeClient();
    const onSignal = jest.fn();
    await openPrivateCallSignalSubscription({ client: fake.client, accessToken: "jwt", call, localIdentityId: "local-1", onSignal });
    const live = new Date();
    const envelope = {
      callId: call.id, fromIdentityId: "peer-1", toIdentityId: "local-1", kind: "answer",
      payload: { sdp: "v=0\r\n" }, callVersion: 2,
      sentAt: live.toISOString(), expiresAt: new Date(live.getTime() + 15_000).toISOString(),
    };
    fake.handlers.get("answer")?.({ payload: envelope });
    fake.handlers.get("answer")?.({ payload: { ...envelope, fromIdentityId: "outsider" } });
    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(onSignal).toHaveBeenCalledWith({ kind: "answer", payload: { sdp: "v=0\r\n" } });
  });

  it("removes a rejected channel and refuses non-participants", async () => {
    const failed = fakeClient("CHANNEL_ERROR");
    await expect(openPrivateCallSignalSubscription({ client: failed.client, accessToken: "jwt", call, localIdentityId: "local-1", onSignal: jest.fn() }))
      .rejects.toThrow("Private call signaling is unavailable.");
    expect(failed.client.removeChannel).toHaveBeenCalledWith(failed.channel);

    const outsider = fakeClient();
    await expect(openPrivateCallSignalSubscription({ client: outsider.client, accessToken: "jwt", call, localIdentityId: "outsider", onSignal: jest.fn() }))
      .rejects.toThrow("Private call signaling is unavailable.");
    expect(outsider.client.channel).not.toHaveBeenCalled();
  });
});
