import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import { PEACEPAD_V2_SCHEMA_VERSION, type AttachmentUploadIntent, type CaseBinder, type PrivateAttachment, type PrivateTimelineEntry } from "../domain/v2";
import { RecordsStateProvider, useRecordsState } from "./RecordsState";

const runtime: CoordinationRuntime = {
  actorIdentityId: "11111111-1111-4111-8111-111111111111",
  identityVersion: 1,
  sessionId: "22222222-2222-4222-8222-222222222222",
  familyCircleId: "33333333-3333-4333-8333-333333333333",
  participantGrantId: "44444444-4444-4444-8444-444444444444",
  participantGrantVersion: 1,
  conversationId: "55555555-5555-4555-8555-555555555555",
  region: "ca"
};

function binder(overrides: Partial<CaseBinder> = {}): CaseBinder {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
    version: 1,
    region: runtime.region,
    familyCircleId: runtime.familyCircleId,
    ownerIdentityId: runtime.actorIdentityId,
    name: "School records",
    childLabel: "Child A",
    status: "active",
    provenance: {
      createdAt: "2026-08-10T12:00:00.000Z",
      createdBy: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId },
      source: "app"
    },
    ...overrides
  };
}

function attachmentIntent(): AttachmentUploadIntent {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
    version: 1,
    region: runtime.region,
    familyCircleId: runtime.familyCircleId,
    ownerIdentityId: runtime.actorIdentityId,
    target: { kind: "private-binder", binderId: binder().id },
    originalFileName: "school-note.pdf",
    mediaType: "application/pdf",
    byteLength: 1200,
    expiresAt: "2099-08-10T12:15:00.000Z",
    status: "awaiting-upload",
    uploadTransport: "supabase-signed",
    uploadUrl: "https://storage.peacepad.test/upload/fictional",
    objectPath: `ca/${runtime.actorIdentityId}/${binder().id}/fictional.pdf`,
    provenance: {
      createdAt: "2026-08-10T12:00:00.000Z",
      createdBy: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId },
      source: "app"
    }
  };
}

function privateAttachment(): PrivateAttachment {
  const intent = attachmentIntent();
  return {
    id: intent.id,
    schemaVersion: intent.schemaVersion,
    version: 1,
    region: intent.region,
    familyCircleId: intent.familyCircleId,
    ownerIdentityId: intent.ownerIdentityId,
    target: { kind: "private-binder", binderId: binder().id },
    originalFileName: intent.originalFileName,
    mediaType: intent.mediaType,
    byteLength: intent.byteLength,
    status: "available",
    provenance: intent.provenance
  };
}

function timelineEntry(overrides: Partial<PrivateTimelineEntry> = {}): PrivateTimelineEntry {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
    version: 1,
    region: runtime.region,
    familyCircleId: runtime.familyCircleId,
    ownerIdentityId: runtime.actorIdentityId,
    caseBinderId: binder().id,
    source: {
      kind: "message-event",
      sourceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventType: "sent",
      sourceVersion: null
    },
    occurredAt: "2026-08-10T12:00:00.000Z",
    provenance: {
      createdAt: "2026-08-10T12:01:00.000Z",
      createdBy: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId },
      source: "app"
    },
    ...overrides
  };
}

describe("RecordsState", () => {
  it("validates binder fields and keeps prepared metadata in the explicit demo session", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RecordsStateProvider>{children}</RecordsStateProvider>;
    const { result } = renderHook(() => useRecordsState(), { wrapper });
    await expect(result.current.createBinder("", "A")).rejects.toThrow("Case Binder name");
    await act(async () => { await result.current.createBinder("School records", "Child A"); });
    await act(async () => { await result.current.prepareAttachment({ originalFileName: "school-note.pdf", mediaType: "application/pdf", byteLength: 1200 }); });
    expect(result.current.binder?.name).toBe("School records");
    expect(result.current.attachmentIntent).toMatchObject({ uploadTransport: "disabled", uploadUrl: null });
  });

  it("hydrates and writes private records with the authenticated runtime", async () => {
    const listed = binder();
    const api = {
      listCaseBinders: jest.fn(async () => [listed]),
      listPrivateAttachments: jest.fn(async () => [privateAttachment()]),
      listPrivateTimeline: jest.fn(async () => [timelineEntry()]),
      linkTimelineSource: jest.fn(async () => timelineEntry()),
      createCaseBinder: jest.fn(async () => binder({ id: "88888888-8888-4888-8888-888888888888", name: "Health records" })),
      createAttachmentUploadIntent: jest.fn(async () => attachmentIntent()),
      uploadPrivateAttachment: jest.fn(async () => undefined),
      completePrivateAttachment: jest.fn(async () => privateAttachment()),
      getPrivateAttachmentDownload: jest.fn(async () => ({ attachment: privateAttachment(), downloadUrl: "https://storage.peacepad.test/download/fictional", expiresAt: "2099-08-10T12:16:00.000Z" })),
      archiveCaseBinder: jest.fn(async () => binder({ status: "archived", version: 2 }))
    } as unknown as PeacePadCoordinationApi;
    const wrapper = ({ children }: { children: React.ReactNode }) => <RecordsStateProvider api={api} runtime={runtime}>{children}</RecordsStateProvider>;
    const { result } = renderHook(() => useRecordsState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.binder?.id).toBe(listed.id);
    await waitFor(() => expect(result.current.timelineEntries).toHaveLength(1));
    await waitFor(() => expect(result.current.attachments).toHaveLength(1));
    await act(async () => { await result.current.linkTimelineSource("message-event", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); });
    expect(api.linkTimelineSource).toHaveBeenCalledWith(
      expect.objectContaining({ familyCircleId: runtime.familyCircleId, caseBinderId: listed.id, sourceKind: "message-event" }),
      expect.objectContaining({ region: runtime.region, actor: expect.objectContaining({ identityId: runtime.actorIdentityId }) })
    );
    const bytes = new ArrayBuffer(1200);
    await act(async () => { await result.current.uploadAttachment({ originalFileName: "school-note.pdf", mediaType: "application/pdf", byteLength: 1200, bytes }); });
    expect(api.uploadPrivateAttachment).toHaveBeenCalledWith(expect.objectContaining({ uploadTransport: "supabase-signed" }), bytes);
    expect(api.completePrivateAttachment).toHaveBeenCalledWith(
      attachmentIntent().id,
      expect.objectContaining({ expectedVersion: 1, region: "ca" })
    );
    await act(async () => { await result.current.createBinder("Health records", "Child A"); });
    expect(api.createCaseBinder).toHaveBeenCalledWith(
      { familyCircleId: runtime.familyCircleId, name: "Health records", childLabel: "Child A" },
      expect.objectContaining({ region: "ca", actor: expect.objectContaining({ identityId: runtime.actorIdentityId, sessionId: runtime.sessionId }) })
    );
  });

  it("fails closed when a persisted response belongs to another owner", async () => {
    const api = {
      listCaseBinders: jest.fn(async () => [binder({ ownerIdentityId: "99999999-9999-4999-8999-999999999999" })]),
      listPrivateAttachments: jest.fn(async () => []),
      listPrivateTimeline: jest.fn(async () => [])
    } as unknown as PeacePadCoordinationApi;
    const wrapper = ({ children }: { children: React.ReactNode }) => <RecordsStateProvider api={api} runtime={runtime}>{children}</RecordsStateProvider>;
    const { result } = renderHook(() => useRecordsState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.binders).toHaveLength(0);
    expect(result.current.error).toMatch(/verify the Case Binder/);
  });
});
