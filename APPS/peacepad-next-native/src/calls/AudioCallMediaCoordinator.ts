import type { AudioCallSession, AudioCallSignal, PeacePadCoordinationApi } from "../api/CoordinationApi";
import type { WriteContext } from "../domain/v2";
import type { PeacePadIceServer } from "./AudioMediaPolicy";
import { openPrivateCallSignalSubscription, type PeacePadRealtimeClient } from "./PrivateCallSignalSubscription";

export type AudioMediaConnectionState = "connecting" | "connected" | "failed";

export type AudioMediaSession = Readonly<{
  createOffer: () => Promise<AudioCallSignal & { kind: "offer" }>;
  acceptOffer: (sdp: string) => Promise<AudioCallSignal & { kind: "answer" }>;
  acceptAnswer: (sdp: string) => Promise<void>;
  addIceCandidate: (signal: AudioCallSignal & { kind: "ice" }) => Promise<void>;
  close: () => void;
}>;

export type AudioMediaFactory = (
  iceServers: readonly PeacePadIceServer[],
  callbacks: Readonly<{
    onIceCandidate: (signal: AudioCallSignal & { kind: "ice" }) => void;
    onConnectionStateChange: (state: string) => void;
  }>,
) => Promise<AudioMediaSession>;

export type AudioCallMediaRuntime = Readonly<{
  getAccessToken: () => Promise<string | undefined>;
  realtimeClient: PeacePadRealtimeClient;
  createMedia: AudioMediaFactory;
}>;

type StartInput = Readonly<{
  api: PeacePadCoordinationApi;
  call: AudioCallSession;
  localIdentityId: string;
  context: () => WriteContext;
  runtime: AudioCallMediaRuntime;
  onState: (state: AudioMediaConnectionState) => void;
}>;

export async function startAudioCallMedia({ api, call, localIdentityId, context, runtime, onState }: StartInput): Promise<() => Promise<void>> {
  if (call.status !== "active") throw new Error("Audio media requires an active call.");
  if (localIdentityId !== call.callerIdentityId && localIdentityId !== call.calleeIdentityId) {
    throw new Error("Audio media is unavailable for this identity.");
  }

  let closed = false;
  let closeSubscription: (() => Promise<void>) | undefined;
  let media: AudioMediaSession | undefined;
  let signalQueue = Promise.resolve();
  const pendingSignals: AudioCallSignal[] = [];
  const close = async () => {
    if (closed) return;
    closed = true;
    media?.close();
    await closeSubscription?.().catch(() => undefined);
  };
  const fail = () => {
    if (closed) return;
    onState("failed");
    void close();
  };
  const send = async (signal: AudioCallSignal) => {
    if (!closed) await api.sendAudioCallSignal(call.id, signal, context());
  };
  const process = (signal: AudioCallSignal) => {
    signalQueue = signalQueue.then(async () => {
      if (closed || !media) return;
      if (signal.kind === "offer") {
        if (localIdentityId === call.calleeIdentityId) await send(await media.acceptOffer(signal.payload.sdp));
      } else if (signal.kind === "answer") {
        if (localIdentityId === call.callerIdentityId) await media.acceptAnswer(signal.payload.sdp);
      } else {
        await media.addIceCandidate(signal);
      }
    }).catch(fail);
  };
  const receive = (signal: AudioCallSignal) => {
    if (!media) pendingSignals.push(signal);
    else process(signal);
  };

  try {
    onState("connecting");
    const [accessToken, credentials] = await Promise.all([
      runtime.getAccessToken(),
      api.getAudioCallTurnCredentials(call.id, context()),
    ]);
    if (!accessToken) throw new Error("The call session expired.");
    if (closed) return close;
    closeSubscription = await openPrivateCallSignalSubscription({ client: runtime.realtimeClient, accessToken, call, localIdentityId, onSignal: receive });
    if (closed) {
      await closeSubscription();
      return close;
    }
    media = await runtime.createMedia(credentials.iceServers, {
      onIceCandidate: (signal) => { void send(signal).catch(fail); },
      onConnectionStateChange: (state) => {
        if (state === "connected") onState("connected");
        else if (["failed", "closed"].includes(state)) fail();
      },
    });
    if (closed) {
      media.close();
      return close;
    }
    pendingSignals.splice(0).forEach(process);
    if (localIdentityId === call.callerIdentityId) await send(await media.createOffer());
    return close;
  } catch (error) {
    await close();
    onState("failed");
    throw error;
  }
}
