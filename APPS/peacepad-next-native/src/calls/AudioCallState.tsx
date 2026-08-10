import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createWriteContext } from "../domain/v2";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import type { AudioCallSession, PeacePadCoordinationApi } from "../api/CoordinationApi";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import { startAudioCallMedia, type AudioCallMediaRuntime, type AudioMediaConnectionState } from "./AudioCallMediaCoordinator";

type AudioCallStateValue = Readonly<{
  call: AudioCallSession | null;
  hydrated: boolean;
  busy: boolean;
  error?: string;
  incoming: boolean;
  mediaState: "unavailable" | AudioMediaConnectionState;
  refresh: () => Promise<void>;
  start: () => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  end: () => Promise<void>;
}>;

const demoRuntime: CoordinationRuntime = {
  actorIdentityId: "identity-current",
  identityVersion: 1,
  sessionId: "session-current",
  familyCircleId: "family-current",
  participantGrantId: "grant-current",
  conversationId: "conversation-primary",
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
  const resolvedApi = useMemo(() => api ?? new SyntheticCoordinationApi(), [api]);
  const activeRuntime = runtime ?? demoRuntime;
  const [call, setCall] = useState<AudioCallSession | null>(null);
  const shouldHydrate = Boolean(api && runtime);
  const [hydrated, setHydrated] = useState(!shouldHydrate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [mediaState, setMediaState] = useState<"unavailable" | AudioMediaConnectionState>("unavailable");
  const inFlight = useRef(false);

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

  const refresh = () => run(() => resolvedApi.getCurrentAudioCall(activeRuntime.conversationId));
  const start = () => run(() => resolvedApi.createAudioCall(activeRuntime.conversationId, context(activeRuntime)));
  const accept = () => call ? run(() => resolvedApi.acceptAudioCall(call.id, context(activeRuntime, call.version))) : Promise.resolve();
  const decline = () => call ? run(() => resolvedApi.declineAudioCall(call.id, context(activeRuntime, call.version))) : Promise.resolve();
  const end = () => call ? run(() => resolvedApi.endAudioCall(call.id, context(activeRuntime, call.version))) : Promise.resolve();

  useEffect(() => {
    if (!shouldHydrate) return;
    void refresh();
  }, [activeRuntime.conversationId, resolvedApi, shouldHydrate]);

  useEffect(() => {
    if (!shouldHydrate || call?.status !== "ringing") return;
    const timer = setInterval(() => {
      if (!inFlight.current) void run(() => resolvedApi.getCurrentAudioCall(activeRuntime.conversationId));
    }, 2_500);
    return () => clearInterval(timer);
  }, [activeRuntime.conversationId, call?.id, call?.status, resolvedApi, shouldHydrate]);

  useEffect(() => {
    let disposed = false;
    let close: (() => Promise<void>) | undefined;
    if (!mediaRuntime || call?.status !== "active") {
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
    }).then((cleanup) => {
      if (disposed) void cleanup();
      else close = cleanup;
    }).catch((caught) => {
      if (!disposed) {
        setMediaState("failed");
        setError(caught instanceof Error ? caught.message : "PeacePad could not connect the audio call.");
      }
    });
    return () => {
      disposed = true;
      void close?.();
    };
  }, [activeRuntime.actorIdentityId, activeRuntime.region, activeRuntime.sessionId, call?.id, call?.status, call?.version, mediaRuntime, resolvedApi]);

  const value = useMemo<AudioCallStateValue>(() => ({
    call, hydrated, busy, error, mediaState,
    incoming: Boolean(call && call.calleeIdentityId === activeRuntime.actorIdentityId),
    refresh, start, accept, decline, end
  }), [call, hydrated, busy, error, mediaState, activeRuntime.actorIdentityId]);
  return <AudioCallStateContext.Provider value={value}>{children}</AudioCallStateContext.Provider>;
}

export function useAudioCallState(): AudioCallStateValue {
  const value = useContext(AudioCallStateContext);
  if (!value) throw new Error("AudioCallStateProvider is required.");
  return value;
}
