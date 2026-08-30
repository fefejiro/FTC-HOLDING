import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createWriteContext } from "../domain/v2";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import type { AudioCallSession, PeacePadCoordinationApi } from "../api/CoordinationApi";
import { hasConnectedConversation, type CoordinationRuntime } from "../coordination/CoordinationState";
import { startAudioCallMedia, type AudioCallMediaController, type AudioCallMediaRuntime, type AudioMediaConnectionState } from "./AudioCallMediaCoordinator";

type AudioCallStateValue = Readonly<{
  call: AudioCallSession | null;
  hydrated: boolean;
  busy: boolean;
  error?: string;
  incoming: boolean;
  mediaState: "unavailable" | AudioMediaConnectionState;
  muted: boolean;
  cameraEnabled: boolean;
  selectedMediaType: "audio" | "video";
  localStreamUrl: string | null;
  remoteStreamUrl: string | null;
  durationSeconds: number;
  refresh: () => Promise<void>;
  start: (mediaType?: "audio" | "video") => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  end: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  setSelectedMediaType: (type: "audio" | "video") => void;
  retryMedia: () => void;
}>;

const demoRuntime: CoordinationRuntime = {
  actorIdentityId: "11111111-1111-4111-8111-111111111111",
  identityVersion: 1,
  sessionId: "22222222-2222-4222-8222-222222222222",
  familyCircleId: "33333333-3333-4333-8333-333333333333",
  participantGrantId: "44444444-4444-4444-8444-444444444444",
  participantGrantVersion: 1,
  conversationId: "55555555-5555-4555-8555-555555555555",
  region: "ca"
};

const AudioCallStateContext = createContext<AudioCallStateValue | undefined>(undefined);

function context(runtime: CoordinationRuntime, expectedVersion: number | null = null) {
  return createWriteContext({
    actor: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId },
    expectedVersion,
    idempotencyKey: `device-call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    region: runtime.region
  });
}

export function AudioCallStateProvider({ api, children, mediaRuntime, runtime }: { api?: PeacePadCoordinationApi; children: ReactNode; mediaRuntime?: AudioCallMediaRuntime; runtime?: CoordinationRuntime }) {
  // Production/staging sessions always provide a verified network API. Keep
  // the synthetic provider available for the explicit lab/demo surface, but
  // fail closed instead of silently presenting a fake call when a runtime
  // identity has been supplied without its API.
  const resolvedApi = useMemo(() => {
    if (runtime && (!api || api instanceof SyntheticCoordinationApi)) {
      throw new Error("PeacePad runtime requires the network-backed call API.");
    }
    return api ?? new SyntheticCoordinationApi();
  }, [api, runtime]);
  const activeRuntime = runtime ?? demoRuntime;
  const [call, setCall] = useState<AudioCallSession | null>(null);
  const shouldHydrate = Boolean(api && runtime);
  const [hydrated, setHydrated] = useState(!shouldHydrate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [mediaState, setMediaState] = useState<"unavailable" | AudioMediaConnectionState>("unavailable");
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [selectedMediaType, setSelectedMediaType] = useState<"audio" | "video">("audio");
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [mediaAttempt, setMediaAttempt] = useState(0);
  const inFlight = useRef(false);
  const mediaController = useRef<AudioCallMediaController | undefined>(undefined);

  const run = async (operation: () => Promise<AudioCallSession | null>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      setCall(await operation());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PeacePad could not update the call.");
    } finally {
      inFlight.current = false;
      setBusy(false);
      setHydrated(true);
    }
  };

  const refresh = () => hasConnectedConversation(activeRuntime)
    ? run(() => resolvedApi.getCurrentMediaCall(activeRuntime.conversationId))
    : Promise.resolve();
  const start = (mediaType: "audio" | "video" = selectedMediaType) => hasConnectedConversation(activeRuntime)
    ? (setSelectedMediaType(mediaType), run(() => resolvedApi.createMediaCall(activeRuntime.conversationId, mediaType, context(activeRuntime))))
    : Promise.resolve();
  const accept = () => call ? run(() => resolvedApi.acceptAudioCall(call.id, context(activeRuntime, call.version))) : Promise.resolve();
  const decline = () => call ? run(() => resolvedApi.declineAudioCall(call.id, context(activeRuntime, call.version))) : Promise.resolve();
  const end = () => call ? run(() => resolvedApi.endAudioCall(call.id, context(activeRuntime, call.version))) : Promise.resolve();
  const toggleMute = () => {
    setMuted((current) => {
      const next = !current;
      mediaController.current?.setMuted(next);
      return next;
    });
  };
  const toggleCamera = () => {
    setCameraEnabled((current) => {
      const next = !current;
      mediaController.current?.setCameraEnabled(next);
      return next;
    });
  };
  const switchCamera = () => mediaController.current?.switchCamera();
  const retryMedia = () => {
    setError(undefined);
    setMediaAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    if (!shouldHydrate) return;
    void refresh();
  }, [activeRuntime.conversationId, resolvedApi, shouldHydrate]);

  useEffect(() => {
    if (!shouldHydrate || !hasConnectedConversation(activeRuntime) || call?.status !== "ringing") return;
    const timer = setInterval(() => {
      if (!inFlight.current) void run(() => resolvedApi.getCurrentMediaCall(activeRuntime.conversationId));
    }, 2_500);
    return () => clearInterval(timer);
  }, [activeRuntime.conversationId, call?.id, call?.status, resolvedApi, shouldHydrate]);

  useEffect(() => {
    let disposed = false;
    let controller: AudioCallMediaController | undefined;
    if (!hasConnectedConversation(activeRuntime) || !mediaRuntime || call?.status !== "active") {
      mediaController.current = undefined;
      setMuted(false);
      setCameraEnabled(true);
      setLocalStreamUrl(null);
      setRemoteStreamUrl(null);
      setMediaState("unavailable");
      return;
    }
    void startAudioCallMedia({
      api: resolvedApi,
      call,
      localIdentityId: activeRuntime.actorIdentityId,
      context: () => context(activeRuntime, call.version),
      runtime: mediaRuntime,
      onState: (state) => { if (!disposed) setMediaState(state); },
      onLocalStream: (url) => { if (!disposed) setLocalStreamUrl(url); },
      onRemoteStream: (url) => { if (!disposed) setRemoteStreamUrl(url); },
    }).then((startedController) => {
      if (disposed) void startedController.close();
      else {
        controller = startedController;
        mediaController.current = startedController;
        startedController.setMuted(muted);
        startedController.setCameraEnabled(cameraEnabled);
      }
    }).catch((caught) => {
      if (!disposed) {
        setMediaState("failed");
        setError(caught instanceof Error ? caught.message : "PeacePad could not connect the audio call.");
      }
    });
    return () => {
      disposed = true;
      if (mediaController.current === controller) mediaController.current = undefined;
      void controller?.close();
    };
  }, [activeRuntime.actorIdentityId, activeRuntime.region, activeRuntime.sessionId, call?.id, call?.status, call?.version, mediaAttempt, mediaRuntime, resolvedApi]);

  useEffect(() => {
    if (call?.status !== "active" || !call.acceptedAt) {
      setDurationSeconds(0);
      return;
    }
    const update = () => setDurationSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(call.acceptedAt!)) / 1_000)));
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [call?.acceptedAt, call?.id, call?.status]);

  const value = useMemo<AudioCallStateValue>(() => ({
    call, hydrated, busy, error, mediaState, muted, cameraEnabled, selectedMediaType, localStreamUrl, remoteStreamUrl, durationSeconds,
    incoming: Boolean(call && call.calleeIdentityId === activeRuntime.actorIdentityId),
    refresh, start, accept, decline, end, toggleMute, toggleCamera, switchCamera, setSelectedMediaType, retryMedia
  }), [call, hydrated, busy, error, mediaState, muted, cameraEnabled, selectedMediaType, localStreamUrl, remoteStreamUrl, durationSeconds, activeRuntime.actorIdentityId]);
  return <AudioCallStateContext.Provider value={value}>{children}</AudioCallStateContext.Provider>;
}

export function useAudioCallState(): AudioCallStateValue {
  const value = useContext(AudioCallStateContext);
  if (!value) throw new Error("AudioCallStateProvider is required.");
  return value;
}
