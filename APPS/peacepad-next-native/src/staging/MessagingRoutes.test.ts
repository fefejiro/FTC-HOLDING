import { StagingMessagingRoutes } from "./MessagingRoutes";
import type { MessagingService } from "./MessagingService";
import type { StagingInvitationRequest } from "./InvitationRoutes";

const actor = { identityId: "parent-a", displayName: "Parent A", sessionId: "session-a", familyPermissions: { family: ["messages:read", "messages:write"] } } as const;
const headers = { "Idempotency-Key": "request-1", "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0" };
const request = (method: StagingInvitationRequest["method"], path: string, body?: unknown, authenticated = true): StagingInvitationRequest => ({ method, path, body, headers, actor: authenticated ? actor : undefined, requesterKey: "fictional-requester" });

describe("StagingMessagingRoutes", () => {
  const setup = () => {
    const service = {
      listConversations: jest.fn(async () => []), createConversation: jest.fn(async () => ({ id: "conversation-1" })),
      listMessages: jest.fn(async () => []), sendMessage: jest.fn(async () => ({ id: "message-1" })),
      recordLifecycle: jest.fn(async () => ({ id: "message-viewed-1" })),
      getPreference: jest.fn(async () => ({ enabled: false })), setPreference: jest.fn(async () => ({ enabled: true })),
      preview: jest.fn(async () => ({ tone: "clear" }))
    };
    return { service, routes: new StagingMessagingRoutes(service as unknown as MessagingService) };
  };
  it("routes conversation list and creation", async () => {
    const { routes, service } = setup();
    expect((await routes.handle(request("GET", "/api/v2/conversations?familyCircleId=family"))).status).toBe(200);
    expect((await routes.handle(request("POST", "/api/v2/conversations", { familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }))).status).toBe(201);
    expect(service.listConversations).toHaveBeenCalledWith("family", actor);
  });
  it("routes message list and append without putting content in the path", async () => {
    const { routes, service } = setup(); const body = { familyCircleId: "family", conversationId: "conversation-1", body: "Synthetic text" };
    expect((await routes.handle(request("GET", "/api/v2/conversations/conversation-1/messages"))).status).toBe(200);
    expect((await routes.handle(request("POST", "/api/v2/conversations/conversation-1/messages", body))).status).toBe(201);
    expect(service.sendMessage).toHaveBeenCalledWith(body, expect.objectContaining({ idempotencyKey: "request-1" }), actor);
  });
  it("routes typed delivery and view events to the immutable lifecycle service", async () => {
    const { routes, service } = setup();
    const body = { familyCircleId: "family", conversationId: "conversation-1", originalMessageEventId: "message-1", eventType: "viewed" };
    expect((await routes.handle(request("POST", "/api/v2/conversations/conversation-1/messages/message-1/events", body))).status).toBe(201);
    expect(service.recordLifecycle).toHaveBeenCalledWith(body, expect.objectContaining({ idempotencyKey: "request-1" }), actor);
  });
  it("routes default-off preference read, update, and rule preview", async () => {
    const { routes, service } = setup();
    expect((await routes.handle(request("GET", "/api/v2/conversations/conversation-1/message-check"))).status).toBe(200);
    expect((await routes.handle(request("PUT", "/api/v2/conversations/conversation-1/message-check", { enabled: true, aiAssistanceEnabled: false }))).status).toBe(200);
    expect((await routes.handle(request("POST", "/api/v2/message-previews", { conversationId: "conversation-1", content: "Pickup at 5." }))).status).toBe(200);
    expect(service.preview).toHaveBeenCalledWith("conversation-1", "Pickup at 5.", actor);
  });
  it.each([
    [request("GET", "/api/v2/conversations"), 400],
    [request("POST", "/api/v2/conversations/conversation-1/messages", { conversationId: "other", body: "x" }), 400],
    [request("POST", "/api/v2/conversations/conversation-1/messages/message-1/events", { conversationId: "conversation-1", originalMessageEventId: "wrong", eventType: "viewed" }), 400],
    [request("PUT", "/api/v2/conversations/conversation-1/message-check", { enabled: "yes", aiAssistanceEnabled: false }), 400],
    [request("POST", "/api/v2/message-previews", { conversationId: 1, content: "x" }), 400],
    [request("GET", "/api/v2/conversations", undefined, false), 401],
    [request("PATCH", "/api/v2/conversations"), 405]
  ] as const)("fails safely for malformed messaging requests", async (input, status) => {
    expect((await setup().routes.handle(input)).status).toBe(status);
  });
});
