import type { AudioCallSession, AudioCallSignal } from "../api/CoordinationApi";
import { parseCallSignalEnvelope } from "./CallSignalEnvelope";

export type PeacePadRealtimeChannel = {
  on: (
    type: "broadcast",
    filter: { event: "offer" | "answer" | "ice" },
    callback: (message: { payload?: unknown }) => void,
  ) => PeacePadRealtimeChannel;
  subscribe: (callback: (status: string, error?: Error) => void) => PeacePadRealtimeChannel;
};

export type PeacePadRealtimeClient = Readonly<{
  setAuth: (accessToken: string) => void | Promise<void>;
  channel: (topic: string, options: { config: { private: true; broadcast: { self: false } } }) => PeacePadRealtimeChannel;
  removeChannel: (channel: PeacePadRealtimeChannel) => void | Promise<unknown>;
}>;

type OpenSubscriptionInput = Readonly<{
  client: PeacePadRealtimeClient;
  accessToken: string;
  call: AudioCallSession;
  localIdentityId: string;
  onSignal: (signal: AudioCallSignal) => void;
  timeoutMs?: number;
}>;

function peerFor(call: AudioCallSession, localIdentityId: string): string | null {
  if (call.callerIdentityId === localIdentityId) return call.calleeIdentityId;
  if (call.calleeIdentityId === localIdentityId) return call.callerIdentityId;
  return null;
}

export async function openPrivateCallSignalSubscription({
  client,
  accessToken,
  call,
  localIdentityId,
  onSignal,
  timeoutMs = 10_000,
}: OpenSubscriptionInput): Promise<() => Promise<void>> {
  const peerIdentityId = peerFor(call, localIdentityId);
  if (!accessToken || !peerIdentityId || !["ringing", "active"].includes(call.status)) {
    throw new Error("Private call signaling is unavailable.");
  }

  await client.setAuth(accessToken);
  const topic = `peacepad:call:${call.id}:v${call.version}`;
  const channel = client.channel(topic, { config: { private: true, broadcast: { self: false } } });
  const receive = (message: { payload?: unknown }) => {
    const verified = parseCallSignalEnvelope(message.payload, {
      callId: call.id,
      callVersion: call.version,
      localIdentityId,
      peerIdentityId,
    });
    if (verified) onSignal(verified.signal);
  };
  channel.on("broadcast", { event: "offer" }, receive);
  channel.on("broadcast", { event: "answer" }, receive);
  channel.on("broadcast", { event: "ice" }, receive);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Private call signaling is unavailable."));
    }, timeoutMs);
    channel.subscribe((status) => {
      if (settled) return;
      if (status === "SUBSCRIBED") {
        settled = true;
        clearTimeout(timer);
        resolve();
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        settled = true;
        clearTimeout(timer);
        reject(new Error("Private call signaling is unavailable."));
      }
    });
  }).catch(async (error) => {
    await client.removeChannel(channel);
    throw error;
  });

  let closed = false;
  return async () => {
    if (closed) return;
    closed = true;
    await client.removeChannel(channel);
  };
}
