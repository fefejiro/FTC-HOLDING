import { StagingAttachmentIntentRoutes } from "./AttachmentIntentRoutes";

const actor = {
  identityId: "parent-a", displayName: "Parent A", sessionId: "session-a",
  familyPermissions: { family: ["messages:write"] }
};
const request = (body: unknown, authenticated = true) => ({
  method: "POST" as const, path: "/api/v2/attachment-upload-intents", body, requesterKey: "requester-a",
  headers: { "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0", "Idempotency-Key": "intent-1" },
  actor: authenticated ? actor : undefined
});

describe("StagingAttachmentIntentRoutes", () => {
  const intent = { id: "attachment-intent-1", uploadTransport: "disabled", uploadUrl: null };
  const service = { create: jest.fn(async () => intent) };
  const routes = new StagingAttachmentIntentRoutes(service as never);
  const metadata = {
    familyCircleId: "family", target: { kind: "conversation", conversationId: "conversation-1" },
    originalFileName: "school-note.pdf", mediaType: "application/pdf", byteLength: 1024
  };

  beforeEach(() => service.create.mockClear());

  it("accepts metadata only and returns a disabled transport", async () => {
    await expect(routes.handle(request(metadata))).resolves.toEqual({ status: 201, body: intent });
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...metadata, content: "base64-bytes" },
    { ...metadata, fileBytes: [1, 2, 3] },
    { ...metadata, target: { kind: "conversation", conversationId: "conversation-1", familyName: "leak" } },
    { ...metadata, target: { kind: "unknown", binderId: "binder-1" } }
  ])("rejects file content and unsupported shapes before calling the service", async (body) => {
    const response = await routes.handle(request(body));
    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("requires an authenticated staging actor", async () => {
    expect((await routes.handle(request(metadata, false))).status).toBe(401);
  });
});
