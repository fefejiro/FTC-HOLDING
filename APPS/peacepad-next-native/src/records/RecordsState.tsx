import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CreateAttachmentUploadIntentInput, LinkTimelineSourceInput, PeacePadCoordinationApi } from "../api/CoordinationApi";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import {
  PEACEPAD_V2_SCHEMA_VERSION,
  createWriteContext,
  type AttachmentMediaType,
  type AttachmentUploadIntent,
  type CaseBinder,
  type PrivateTimelineEntry,
  type TimelineSourceKind
} from "../domain/v2";
import { MetadataAttachmentService } from "./MetadataAttachmentService";

const demoActor = { identityId: "fictional-identity", familyCircleId: "fictional-family", sessionId: "device-session" };

type AttachmentInput = Readonly<{ originalFileName: string; mediaType: AttachmentMediaType; byteLength: number }>;

type RecordsContextValue = {
  binders: readonly CaseBinder[];
  binder?: CaseBinder;
  attachmentIntent?: AttachmentUploadIntent;
  timelineEntries: readonly PrivateTimelineEntry[];
  loading: boolean;
  busy: boolean;
  error?: string;
  selectBinder: (binderId: string) => void;
  createBinder: (name: string, childLabel: string) => Promise<CaseBinder>;
  archiveBinder: () => Promise<CaseBinder>;
  prepareAttachment: (input: AttachmentInput) => Promise<AttachmentUploadIntent>;
  linkTimelineSource: (sourceKind: TimelineSourceKind, sourceId: string) => Promise<PrivateTimelineEntry>;
  reload: () => Promise<void>;
};

const RecordsContext = createContext<RecordsContextValue | undefined>(undefined);

type RecordsProviderProps = Readonly<{
  children: ReactNode;
  api?: PeacePadCoordinationApi;
  runtime?: CoordinationRuntime;
}>;

function idempotencyKey(operation: string): string {
  return `${operation}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function writeContext(runtime: CoordinationRuntime, operation: string, expectedVersion: number | null = null) {
  return createWriteContext({
    actor: {
      identityId: runtime.actorIdentityId,
      participantGrantId: runtime.participantGrantId,
      sessionId: runtime.sessionId
    },
    expectedVersion,
    idempotencyKey: idempotencyKey(operation),
    region: runtime.region
  });
}

function assertBinder(value: CaseBinder, runtime: CoordinationRuntime): CaseBinder {
  if (
    !value
    || value.schemaVersion !== PEACEPAD_V2_SCHEMA_VERSION
    || value.region !== runtime.region
    || value.familyCircleId !== runtime.familyCircleId
    || value.ownerIdentityId !== runtime.actorIdentityId
    || !value.id
    || !Number.isInteger(value.version)
    || value.version < 1
  ) throw new Error("PeacePad could not verify the Case Binder response.");
  return value;
}

function assertAttachmentIntent(value: AttachmentUploadIntent, runtime: CoordinationRuntime, binderId: string): AttachmentUploadIntent {
  if (
    !value
    || value.schemaVersion !== PEACEPAD_V2_SCHEMA_VERSION
    || value.region !== runtime.region
    || value.familyCircleId !== runtime.familyCircleId
    || value.ownerIdentityId !== runtime.actorIdentityId
    || value.target.kind !== "private-binder"
    || value.target.binderId !== binderId
    || value.status !== "metadata-prepared"
    || value.uploadTransport !== "disabled"
    || value.uploadUrl !== null
    || !value.id
    || Number.isNaN(Date.parse(value.expiresAt))
  ) throw new Error("PeacePad could not verify the attachment preparation response.");
  return value;
}

function assertTimelineEntry(value: PrivateTimelineEntry, runtime: CoordinationRuntime, binderId: string): PrivateTimelineEntry {
  const messageEventTypes = new Set(["sent", "correction"]);
  const scheduleEventTypes = new Set(["parenting-time", "appointment", "holiday", "change-request"]);
  const sourceIsValid = value?.source?.kind === "message-event"
    ? messageEventTypes.has(value.source.eventType) && value.source.sourceVersion === null
    : value?.source?.kind === "schedule-event"
      && scheduleEventTypes.has(value.source.eventType)
      && Number.isInteger(value.source.sourceVersion)
      && Number(value.source.sourceVersion) > 0;
  if (
    !value
    || value.schemaVersion !== PEACEPAD_V2_SCHEMA_VERSION
    || value.region !== runtime.region
    || value.familyCircleId !== runtime.familyCircleId
    || value.ownerIdentityId !== runtime.actorIdentityId
    || value.caseBinderId !== binderId
    || !value.id
    || !value.source?.sourceId
    || !sourceIsValid
    || Number.isNaN(Date.parse(value.occurredAt))
    || !Number.isInteger(value.version)
    || value.version < 1
  ) throw new Error("PeacePad could not verify the private timeline response.");
  return value;
}

export function RecordsStateProvider({ api, children, runtime }: RecordsProviderProps) {
  const persisted = Boolean(api && runtime);
  if (Boolean(api) !== Boolean(runtime)) throw new Error("Records require both a verified API and runtime.");
  const [binders, setBinders] = useState<readonly CaseBinder[]>([]);
  const [selectedBinderId, setSelectedBinderId] = useState<string>();
  const [attachmentIntent, setAttachmentIntent] = useState<AttachmentUploadIntent>();
  const [timelineEntries, setTimelineEntries] = useState<readonly PrivateTimelineEntry[]>([]);
  const [loading, setLoading] = useState(persisted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const timelineGeneration = useRef(0);
  const demoService = useRef(new MetadataAttachmentService(demoActor));

  const binder = binders.find((candidate) => candidate.id === selectedBinderId)
    ?? binders.find((candidate) => candidate.status === "active");

  const reload = useCallback(async () => {
    if (!api || !runtime) return;
    const currentGeneration = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const listed = await api.listCaseBinders(runtime.familyCircleId);
      const verified = listed.map((candidate) => assertBinder(candidate, runtime));
      if (generation.current !== currentGeneration) return;
      setBinders(verified);
      setSelectedBinderId((current) => verified.some((candidate) => candidate.id === current)
        ? current
        : verified.find((candidate) => candidate.status === "active")?.id);
    } catch (caught) {
      if (generation.current !== currentGeneration) return;
      setBinders([]);
      setSelectedBinderId(undefined);
      setError(caught instanceof Error ? caught.message : "PeacePad could not load Records.");
    } finally {
      if (generation.current === currentGeneration) setLoading(false);
    }
  }, [api, runtime?.actorIdentityId, runtime?.familyCircleId, runtime?.region, runtime?.sessionId]);

  useEffect(() => {
    setBinders([]);
    setSelectedBinderId(undefined);
    setAttachmentIntent(undefined);
    setTimelineEntries([]);
    setError(undefined);
    if (api && runtime) void reload();
    return () => { generation.current += 1; timelineGeneration.current += 1; };
  }, [api, reload, runtime?.actorIdentityId, runtime?.familyCircleId, runtime?.region, runtime?.sessionId]);

  useEffect(() => {
    const currentGeneration = ++timelineGeneration.current;
    setTimelineEntries([]);
    if (!api || !runtime || !binder || binder.status !== "active") return;
    void api.listPrivateTimeline(binder.id).then((listed) => {
      if (timelineGeneration.current !== currentGeneration) return;
      setTimelineEntries(listed.map((candidate) => assertTimelineEntry(candidate, runtime, binder.id)));
    }).catch((caught) => {
      if (timelineGeneration.current !== currentGeneration) return;
      setError(caught instanceof Error ? caught.message : "PeacePad could not load the private timeline.");
    });
    return () => { timelineGeneration.current += 1; };
  }, [api, binder?.id, binder?.status, runtime?.actorIdentityId, runtime?.familyCircleId, runtime?.region, runtime?.sessionId]);

  const value = useMemo<RecordsContextValue>(() => ({
    binders,
    binder,
    attachmentIntent,
    timelineEntries,
    loading,
    busy,
    error,
    selectBinder(binderId) {
      if (!binders.some((candidate) => candidate.id === binderId && candidate.status === "active")) return;
      setSelectedBinderId(binderId);
      setAttachmentIntent(undefined);
      setTimelineEntries([]);
    },
    async createBinder(name, childLabel) {
      const cleanName = name.trim();
      const cleanChildLabel = childLabel.trim();
      if (cleanName.length < 3) throw new Error("Enter a Case Binder name.");
      if (cleanChildLabel.length < 2) throw new Error("Enter a child label.");
      setBusy(true);
      setError(undefined);
      try {
        let created: CaseBinder;
        if (api && runtime) {
          created = assertBinder(await api.createCaseBinder({
            familyCircleId: runtime.familyCircleId,
            name: cleanName,
            childLabel: cleanChildLabel
          }, writeContext(runtime, "case-binder-create")), runtime);
        } else {
          const createdAt = new Date().toISOString();
          created = {
            id: `binder-${Date.now().toString(36)}`,
            schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
            version: 1,
            region: "ca",
            familyCircleId: demoActor.familyCircleId,
            ownerIdentityId: demoActor.identityId,
            name: cleanName,
            childLabel: cleanChildLabel,
            status: "active",
            provenance: { createdAt, createdBy: demoActor, source: "app" }
          };
          demoService.current.registerBinder(created);
        }
        setBinders((current) => [...current.filter((candidate) => candidate.id !== created.id), created]);
        setSelectedBinderId(created.id);
        setAttachmentIntent(undefined);
        setTimelineEntries([]);
        return created;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "PeacePad could not create the Case Binder.";
        setError(message);
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    async archiveBinder() {
      if (!binder) throw new Error("Select a Case Binder first.");
      if (!api || !runtime) {
        const archived = { ...binder, status: "archived" as const, version: binder.version + 1 };
        setBinders((current) => current.map((candidate) => candidate.id === binder.id ? archived : candidate));
        setSelectedBinderId(undefined);
        return archived;
      }
      setBusy(true);
      setError(undefined);
      try {
        const archived = assertBinder(await api.archiveCaseBinder(
          binder.id,
          writeContext(runtime, "case-binder-archive", binder.version)
        ), runtime);
        if (archived.status !== "archived") throw new Error("PeacePad could not verify the archived Case Binder.");
        setBinders((current) => current.map((candidate) => candidate.id === archived.id ? archived : candidate));
        setSelectedBinderId(undefined);
        setAttachmentIntent(undefined);
        setTimelineEntries([]);
        return archived;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "PeacePad could not archive the Case Binder.";
        setError(message);
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    async prepareAttachment(input) {
      if (!binder || binder.status !== "active") throw new Error("Create or select an active Case Binder first.");
      setBusy(true);
      setError(undefined);
      try {
        let prepared: AttachmentUploadIntent;
        const request: CreateAttachmentUploadIntentInput = {
          familyCircleId: api && runtime ? runtime.familyCircleId : demoActor.familyCircleId,
          target: { kind: "private-binder", binderId: binder.id },
          originalFileName: input.originalFileName,
          mediaType: input.mediaType,
          byteLength: input.byteLength
        };
        if (api && runtime) {
          prepared = assertAttachmentIntent(await api.createAttachmentUploadIntent(
            request,
            writeContext(runtime, "attachment-intent-prepare")
          ), runtime, binder.id);
        } else {
          prepared = demoService.current.prepare({
            ...request,
            ownerIdentityId: demoActor.identityId,
            idempotencyKey: idempotencyKey("attachment-intent")
          });
        }
        setAttachmentIntent(prepared);
        return prepared;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "PeacePad could not prepare the attachment details.";
        setError(message);
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    async linkTimelineSource(sourceKind, sourceId) {
      if (!api || !runtime) throw new Error("Private timeline linking is available after staging sign-in.");
      if (!binder || binder.status !== "active") throw new Error("Create or select an active Case Binder first.");
      setBusy(true);
      setError(undefined);
      try {
        const request: LinkTimelineSourceInput = {
          familyCircleId: runtime.familyCircleId,
          caseBinderId: binder.id,
          sourceKind,
          sourceId
        };
        const linked = assertTimelineEntry(await api.linkTimelineSource(
          request,
          writeContext(runtime, "timeline-source-link")
        ), runtime, binder.id);
        setTimelineEntries((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)]);
        return linked;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "PeacePad could not link this source.";
        setError(message);
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    reload
  }), [api, attachmentIntent, binder, binders, busy, error, loading, reload, runtime, timelineEntries]);

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecordsState() {
  const value = useContext(RecordsContext);
  if (!value) throw new Error("useRecordsState must be used inside RecordsStateProvider");
  return value;
}
