import React from "react";
import { Linking, Text } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createStagingCoordinationClient } from "../staging/StagingCoordinationClient";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { invitationCodeFromStagingUrl, PeacePadStagingRuntime, validateVerifiedSessionContext } from "./PeacePadStagingRuntime";
import { useOptionalStagingAccountActions } from "../session/StagingAccountActions";

jest.mock("../session/SupabaseSessionProvider", () => ({ useSupabaseSession: jest.fn() }));
jest.mock("../staging/StagingCoordinationClient", () => ({ createStagingCoordinationClient: jest.fn() }));

const IDENTITY = "11111111-1111-4111-8111-111111111111";
const OTHER_IDENTITY = "66666666-6666-4666-8666-666666666666";
const SESSION = "22222222-2222-4222-8222-222222222222";
const FAMILY = "33333333-3333-4333-8333-333333333333";
const GRANT = "44444444-4444-4444-8444-444444444444";
const CONVERSATION = "55555555-5555-4555-8555-555555555555";

const environment = {
  apiBaseUrl: "https://ftdqnhlesqrkstnqgfxr.supabase.co/functions/v1/peacepad-v2-api",
  diagnosticsEnabled: false,
  environment: "staging" as const,
  productionApiWritesEnabled: false as const,
  requestTimeoutMs: 12_000
};
const supabase = {
  apiBaseUrl: environment.apiBaseUrl,
  projectRef: "ftdqnhlesqrkstnqgfxr",
  projectUrl: "https://ftdqnhlesqrkstnqgfxr.supabase.co",
  publishableKey: "sb_publishable_test",
  region: "ca" as const
};

const authValue = (overrides: Record<string, unknown> = {}) => ({
  status: "ready",
  session: { user: { id: IDENTITY } },
  error: undefined,
  getAccessToken: jest.fn(async () => "fictional-access-token"),
  signInWithPassword: jest.fn(async () => undefined),
  signOut: jest.fn(async () => undefined),
  ...overrides
});

function sessionResponse(value: unknown = valid, ok = true) {
  return jest.fn(async () => ({
    ok,
    json: async () => value
  })) as unknown as typeof fetch;
}

const valid = {
  actor: { identityId: IDENTITY, sessionId: SESSION, displayName: "Fictional Parent", version: 3 },
  memberships: [{
    familyCircleId: FAMILY,
    participantGrantId: GRANT,
    familyName: "Fictional Family",
    role: "parent",
    permissions: ["messages", "calendar"],
    version: 1
  }],
  region: "ca",
  schemaVersion: "2.0"
};

describe("validateVerifiedSessionContext", () => {
  it("accepts only the isolated staging invitation scheme", () => {
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/ab12c3")).toBe("AB12C3");
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/AB12C3/")).toBe("AB12C3");
    expect(invitationCodeFromStagingUrl("peacepad://invite/AB12C3")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("https://example.test/invite/AB12C3")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/TOO-LONG")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/ABC123/extra")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/ABC123?next=1")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/ABC123#fragment")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/ABC123\n")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://user:pass@invite/ABC123")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite:1234/ABC123")).toBeUndefined();
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/ABC12%33")).toBeUndefined();
  });

  it("accepts a server-verified regional actor and active membership", () => {
    expect(validateVerifiedSessionContext(valid, IDENTITY, "ca")).toEqual(valid);
  });

  it.each([
    ["missing response", null, "ca"],
    ["non-object response", "invalid", "ca"],
    ["missing actor", { ...valid, actor: undefined }, "ca"],
    ["identity mismatch", { ...valid, actor: { ...valid.actor, identityId: "55555555-5555-4555-8555-555555555555" } }, "ca"],
    ["invalid identity", { ...valid, actor: { ...valid.actor, identityId: "identity-current" } }, "ca"],
    ["invalid session", { ...valid, actor: { ...valid.actor, sessionId: "device-session" } }, "ca"],
    ["missing identity version", { ...valid, actor: { ...valid.actor, version: undefined } }, "ca"],
    ["invalid identity version", { ...valid, actor: { ...valid.actor, version: 0 } }, "ca"],
    ["region mismatch", { ...valid, region: "us" }, "ca"],
    ["invalid membership", { ...valid, memberships: [{ ...valid.memberships[0], familyCircleId: "family-current" }] }, "ca"],
    ["invalid grant", { ...valid, memberships: [{ ...valid.memberships[0], participantGrantId: "grant-current" }] }, "ca"],
    ["missing family name", { ...valid, memberships: [{ ...valid.memberships[0], familyName: undefined }] }, "ca"],
    ["missing role", { ...valid, memberships: [{ ...valid.memberships[0], role: undefined }] }, "ca"],
    ["invalid permissions collection", { ...valid, memberships: [{ ...valid.memberships[0], permissions: "messages" }] }, "ca"],
    ["invalid permission entry", { ...valid, memberships: [{ ...valid.memberships[0], permissions: ["messages", 2] }] }, "ca"],
    ["invalid membership version", { ...valid, memberships: [{ ...valid.memberships[0], version: 1.5 }] }, "ca"],
    ["invalid membership collection", { ...valid, memberships: null }, "ca"],
    ["schema mismatch", { ...valid, schemaVersion: "1.0" }, "ca"]
  ])("fails closed for %s", (_label, value, region) => {
    expect(() => validateVerifiedSessionContext(value, IDENTITY, region as "ca" | "us")).toThrow();
  });

  it("allows a verified account with no membership so the UI can show a safe empty state", () => {
    expect(validateVerifiedSessionContext({ ...valid, memberships: [] }, IDENTITY, "ca").memberships).toEqual([]);
  });
});

describe("PeacePadStagingRuntime gates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders restore, error, and signed-out gates without synthetic coordination", () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "loading", session: undefined }));
    const view = render(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);
    expect(screen.getByText("Restoring your session")).toBeTruthy();

    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "error", session: undefined, error: "Auth unavailable" }));
    view.rerender(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);
    expect(screen.getByText("Auth unavailable")).toBeTruthy();

    const signInWithPassword = jest.fn(async () => undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "signed-out", session: undefined, signInWithPassword }));
    view.rerender(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);
    expect(screen.getByText("Sign in to staging")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Staging email"), "fictional.parent@example.test");
    fireEvent.changeText(screen.getByLabelText("Staging password"), "fictional-password");
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    return waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith("fictional.parent@example.test", "fictional-password"));
  });

  it("shows safe empty states for an account without a family or conversation", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });
    const view = render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>ready</PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    expect(screen.queryByText("ready")).toBeNull();

    view.rerender(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Invite your co-parent")).toBeTruthy());
    expect(screen.queryByText("ready")).toBeNull();
  });

  it("prefills a staging deep-link code but still requires explicit review", async () => {
    jest.spyOn(Linking, "getInitialURL").mockResolvedValueOnce("peacepadnextlab://invite/ab12c3");
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByLabelText("Invitation code").props.value).toBe("AB12C3"));
    expect(screen.getByRole("button", { name: "Review invitation" })).toBeTruthy();
  });

  it("keeps the newest live invitation when cold-start link resolution finishes later", async () => {
    let resolveInitial!: (value: string | null) => void;
    const initialUrl = new Promise<string | null>((resolve) => { resolveInitial = resolve; });
    let receiveUrl!: (event: { url: string }) => void;
    const remove = jest.fn();
    jest.spyOn(Linking, "getInitialURL").mockReturnValueOnce(initialUrl);
    jest.spyOn(Linking, "addEventListener").mockImplementation((_, listener) => {
      receiveUrl = listener as (event: { url: string }) => void;
      return { remove } as never;
    });
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });

    const view = render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    act(() => receiveUrl({ url: "peacepadnextlab://invite/LIVE22" }));
    await waitFor(() => expect(screen.getByLabelText("Invitation code").props.value).toBe("LIVE22"));
    await act(async () => resolveInitial("peacepadnextlab://invite/COLD11"));
    expect(screen.getByLabelText("Invitation code").props.value).toBe("LIVE22");
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("clears a pending invitation before a different account signs in", async () => {
    jest.spyOn(Linking, "getInitialURL").mockResolvedValueOnce("peacepadnextlab://invite/OLD111");
    let currentAuth = authValue();
    (useSupabaseSession as jest.Mock).mockImplementation(() => currentAuth);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });
    const otherSession = {
      ...valid,
      actor: { ...valid.actor, identityId: OTHER_IDENTITY },
      memberships: []
    };
    const responses = [{ ...valid, memberships: [] }, otherSession];
    const fetcher = jest.fn(async () => ({ ok: true, json: async () => responses.shift() }));

    const view = render(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher as unknown as typeof fetch} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByLabelText("Invitation code").props.value).toBe("OLD111"));

    currentAuth = authValue({ status: "signed-out", session: undefined });
    view.rerender(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher as unknown as typeof fetch} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Sign in to staging")).toBeTruthy());

    currentAuth = authValue({ session: { user: { id: OTHER_IDENTITY } } });
    view.rerender(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher as unknown as typeof fetch} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    expect(screen.getByLabelText("Invitation code").props.value).toBe("");
  });

  it("creates a persisted family for a verified account without a membership", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...valid, memberships: [] }) })
      .mockResolvedValue({ ok: true, json: async () => valid }) as unknown as typeof fetch;
    const createFamily = jest.fn(async () => ({
      familyId: FAMILY,
      participantGrantId: GRANT,
      familyName: "Fictional Family",
      region: "ca"
    }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      createFamily,
      listConversations: jest.fn(async () => [])
    });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Family name"), "  Fictional Family  ");
    fireEvent.press(screen.getByRole("button", { name: "Create family" }));

    await waitFor(() => expect(createFamily).toHaveBeenCalledTimes(1));
    expect(createFamily).toHaveBeenCalledWith("  Fictional Family  ", expect.objectContaining({
      actor: { identityId: IDENTITY, sessionId: SESSION },
      expectedVersion: null,
      region: "ca",
      schemaVersion: "2.0"
    }));
    await waitFor(() => expect(screen.getByText("Invite your co-parent")).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("resolves and explicitly accepts an invitation before creating a conversation", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...valid, memberships: [] }) })
      .mockResolvedValue({ ok: true, json: async () => valid }) as unknown as typeof fetch;
    const invitationId = "66666666-6666-4666-8666-666666666666";
    const inviterId = "77777777-7777-4777-8777-777777777777";
    const resolveInvitation = jest.fn(async () => ({
      invitationId,
      version: 3,
      inviterDisplayName: "Fictional Parent A",
      familyDisplayName: "Fictional Family",
      invitedRole: "parent",
      permissions: ["message.write", "calendar.write"],
      expiresAt: "2026-08-12T12:00:00.000Z"
    }));
    const acceptInvitation = jest.fn(async () => ({ familyCircleId: FAMILY, grantedBy: inviterId }));
    const createConversation = jest.fn(async () => ({ id: CONVERSATION }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      acceptInvitation,
      createConversation,
      getMessageCheckPreference: jest.fn(async () => ({
        aiAssistanceEnabled: false,
        conversationId: CONVERSATION,
        enabled: false,
        id: "88888888-8888-4888-8888-888888888888",
        identityId: IDENTITY,
        provenance: { createdAt: "2026-08-09T12:00:00.000Z", createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" },
        region: "ca",
        schemaVersion: "2.0",
        version: 0
      })),
      listCalendarLayers: jest.fn(async () => []),
      listConversations: jest.fn(async () => [{ id: CONVERSATION, status: "active" }]),
      listMessages: jest.fn(async () => []),
      listScheduleEvents: jest.fn(async () => []),
      resolveInvitation
    });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher} supabase={supabase}>
        <Text testID="accepted-runtime">ready</Text>
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "ab-12c3");
    fireEvent.press(screen.getByRole("button", { name: "Review invitation" }));
    await waitFor(() => expect(resolveInvitation).toHaveBeenCalledWith("AB12C3"));
    expect(screen.getByText("Fictional Family")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledTimes(1));
    expect(acceptInvitation).toHaveBeenCalledWith(invitationId, expect.objectContaining({ expectedVersion: 3 }));
    expect(createConversation).toHaveBeenCalledWith({
      familyCircleId: FAMILY,
      participantIdentityIds: [IDENTITY, inviterId]
    }, expect.objectContaining({ actor: { identityId: IDENTITY, sessionId: SESSION }, region: "ca" }));
    expect(await screen.findByTestId("accepted-runtime", {}, { timeout: 5_000 })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("declines a reviewed invitation without creating family access", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const invitationId = "66666666-6666-4666-8666-666666666666";
    const resolveInvitation = jest.fn(async () => ({
      invitationId,
      version: 3,
      inviterDisplayName: "Fictional Parent A",
      familyDisplayName: "Fictional Family",
      invitedRole: "parent",
      permissions: ["message.write", "calendar.write"],
      expiresAt: "2026-08-12T12:00:00.000Z"
    }));
    const declineInvitation = jest.fn(async () => undefined);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ declineInvitation, resolveInvitation });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "AB12C3");
    fireEvent.press(screen.getByRole("button", { name: "Review invitation" }));
    await waitFor(() => expect(screen.getByText("Fictional Family")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Decline invitation" }));

    await waitFor(() => expect(declineInvitation).toHaveBeenCalledWith(
      invitationId,
      expect.objectContaining({ expectedVersion: 3 })
    ));
    expect(screen.queryByText("Fictional Family")).toBeNull();
  });

  it("creates and revokes a scoped single-use invitation for a family without a conversation", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const invitationId = "99999999-9999-4999-8999-999999999999";
    const createInvitation = jest.fn(async () => ({
      code: "PP2CA1",
      deepLink: "peacepadnextlab://invite/PP2CA1",
      invitation: {
        acceptedParticipantGrantId: null,
        expiresAt: "2026-08-12T12:00:00.000Z",
        familyCircleId: FAMILY,
        id: invitationId,
        invitedByIdentityId: IDENTITY,
        invitedRole: "parent",
        permissions: ["message.write", "calendar.write"],
        provenance: { createdAt: "2026-08-09T12:00:00.000Z", createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" },
        region: "ca",
        schemaVersion: "2.0",
        status: "pending",
        version: 1
      }
    }));
    const revokeInvitation = jest.fn(async () => undefined);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      createInvitation,
      listConversations: jest.fn(async () => []),
      revokeInvitation
    });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Invite your co-parent")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Create invitation code" }));
    await waitFor(() => expect(screen.getByText("PP2CA1")).toBeTruthy());
    expect(createInvitation).toHaveBeenCalledWith({
      expiresInHours: 72,
      familyCircleId: FAMILY,
      invitedRole: "parent",
      permissions: ["message.write", "calendar.write"]
    }, expect.objectContaining({ actor: { identityId: IDENTITY, sessionId: SESSION }, region: "ca" }));
    fireEvent.press(screen.getByRole("button", { name: "Revoke invitation" }));
    await waitFor(() => expect(revokeInvitation).toHaveBeenCalledWith(
      invitationId,
      expect.objectContaining({ expectedVersion: 1 })
    ));
    expect(screen.queryByText("PP2CA1")).toBeNull();
    expect(screen.getByRole("button", { name: "Create invitation code" })).toBeTruthy();
  });

  it("injects the verified runtime only after an authorized conversation is discovered", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      listConversations: jest.fn(async () => [{ id: CONVERSATION, status: "active" }]),
      listCalendarLayers: jest.fn(async () => []),
      listScheduleEvents: jest.fn(async () => []),
      listMessages: jest.fn(async () => []),
      getMessageCheckPreference: jest.fn(async () => ({
        aiAssistanceEnabled: false,
        conversationId: CONVERSATION,
        enabled: false,
        id: "66666666-6666-4666-8666-666666666666",
        identityId: IDENTITY,
        provenance: { createdAt: "2026-08-09T12:00:00.000Z", createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" },
        region: "ca",
        schemaVersion: "2.0",
        version: 0
      }))
    });
    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}><Text>authorized child</Text></PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("authorized child")).toBeTruthy());
    expect(createStagingCoordinationClient).toHaveBeenCalled();
  });

  it("deletes the verified staging account with optimistic concurrency and clears the local session", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const deleteAccount = jest.fn(async () => ({
      identityId: IDENTITY,
      region: "ca",
      status: "deleted",
      deletedAt: "2026-08-09T12:00:00.000Z",
      version: 4,
      authIdentityDeleted: true,
      refreshSessionsRevoked: true,
      authCleanupPending: false
    }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      deleteAccount,
      listConversations: jest.fn(async () => [{ id: CONVERSATION, status: "active" }]),
      listCalendarLayers: jest.fn(async () => []),
      listScheduleEvents: jest.fn(async () => []),
      listMessages: jest.fn(async () => []),
      getMessageCheckPreference: jest.fn(async () => ({
        aiAssistanceEnabled: false,
        conversationId: CONVERSATION,
        enabled: false,
        id: "66666666-6666-4666-8666-666666666666",
        identityId: IDENTITY,
        provenance: { createdAt: "2026-08-09T12:00:00.000Z", createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" },
        region: "ca",
        schemaVersion: "2.0",
        version: 0
      }))
    });

    function DeleteProbe() {
      const actions = useOptionalStagingAccountActions();
      return <Text accessibilityRole="button" onPress={() => void actions?.deleteAccount()}>delete now</Text>;
    }

    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}><DeleteProbe /></PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("delete now")).toBeTruthy());
    fireEvent.press(screen.getByText("delete now"));
    fireEvent.press(screen.getByText("delete now"));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    expect(deleteAccount).toHaveBeenCalledWith(expect.objectContaining({
      actor: { identityId: IDENTITY, sessionId: SESSION },
      expectedVersion: 3,
      region: "ca",
      schemaVersion: "2.0"
    }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it("allows an authenticated account with no family to delete after explicit confirmation", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const deleteAccount = jest.fn(async () => ({
      identityId: IDENTITY,
      region: "ca",
      status: "deleted",
      deletedAt: "2026-08-09T12:00:00.000Z",
      version: 4,
      authIdentityDeleted: true,
      refreshSessionsRevoked: true,
      authCleanupPending: false
    }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ deleteAccount });
    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    expect(deleteAccount).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 3 })));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it("does not sign out when the verified deletion request fails", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const deleteAccount = jest.fn(async () => { throw new Error("PeacePad could not verify the account deletion receipt."); });
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ deleteAccount });
    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Create or join a family")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("PeacePad could not verify the account deletion receipt."));
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("allows an authenticated account without a conversation to delete after explicit confirmation", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const deleteAccount = jest.fn(async () => ({
      identityId: IDENTITY,
      region: "ca",
      status: "deleted",
      deletedAt: "2026-08-09T12:00:00.000Z",
      version: 4,
      authIdentityDeleted: true,
      refreshSessionsRevoked: true,
      authCleanupPending: false
    }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      deleteAccount,
      listConversations: jest.fn(async () => [])
    });
    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Invite your co-parent")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it("fails closed when the token or verified session is unavailable", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ getAccessToken: jest.fn(async () => undefined) }));
    const view = render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("The staging session expired.")).toBeTruthy());

    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    view.rerender(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({}, false)} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("PeacePad could not restore this regional staging session.")).toBeTruthy());
  });
});
