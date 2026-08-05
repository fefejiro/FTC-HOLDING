import React, { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { PEACEPAD_V2_SCHEMA_VERSION, type AttachmentMediaType, type AttachmentUploadIntent, type CaseBinder } from "../domain/v2";
import { MetadataAttachmentService } from "./MetadataAttachmentService";

const actor = { identityId: "fictional-identity", familyCircleId: "fictional-family", sessionId: "device-session" };

type RecordsContextValue = {
  binder?: CaseBinder;
  attachmentIntent?: AttachmentUploadIntent;
  createBinder: (name: string, childLabel: string) => CaseBinder;
  prepareAttachment: (input: { originalFileName: string; mediaType: AttachmentMediaType; byteLength: number }) => AttachmentUploadIntent;
};

const RecordsContext = createContext<RecordsContextValue | undefined>(undefined);

export function RecordsStateProvider({ children }: { children: ReactNode }) {
  const [binder, setBinder] = useState<CaseBinder>();
  const [attachmentIntent, setAttachmentIntent] = useState<AttachmentUploadIntent>();
  const service = useRef(new MetadataAttachmentService(actor));
  const value = useMemo<RecordsContextValue>(() => ({
    binder,
    attachmentIntent,
    createBinder(name, childLabel) {
      const cleanName = name.trim();
      const cleanChildLabel = childLabel.trim();
      if (cleanName.length < 3) throw new Error("Enter a Case Binder name.");
      if (cleanChildLabel.length < 2) throw new Error("Enter a child label.");
      const createdAt = new Date().toISOString();
      const created: CaseBinder = {
        id: "binder-current", schemaVersion: PEACEPAD_V2_SCHEMA_VERSION, version: 1, region: "ca",
        familyCircleId: actor.familyCircleId, ownerIdentityId: actor.identityId,
        name: cleanName, childLabel: cleanChildLabel, status: "active",
        provenance: { createdAt, createdBy: actor, source: "app" }
      };
      service.current.registerBinder(created);
      setBinder(created);
      setAttachmentIntent(undefined);
      return created;
    },
    prepareAttachment(input) {
      if (!binder) throw new Error("Create a Case Binder first.");
      const prepared = service.current.prepare({
        familyCircleId: actor.familyCircleId, ownerIdentityId: actor.identityId,
        target: { kind: "private-binder", binderId: binder.id },
        originalFileName: input.originalFileName, mediaType: input.mediaType, byteLength: input.byteLength,
        idempotencyKey: `intent-${binder.id}-${input.originalFileName}-${input.byteLength}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96)
      });
      setAttachmentIntent(prepared);
      return prepared;
    }
  }), [attachmentIntent, binder]);
  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecordsState() {
  const value = useContext(RecordsContext);
  if (!value) throw new Error("useRecordsState must be used inside RecordsStateProvider");
  return value;
}
