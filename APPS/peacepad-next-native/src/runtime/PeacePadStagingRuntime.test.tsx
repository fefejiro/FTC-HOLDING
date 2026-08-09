import React from "react";
import { Text } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createStagingCoordinationClient } from "../staging/StagingCoordinationClient";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { PeacePadStagingRuntime, validateVerifiedSessionContext } from "./PeacePadStagingRuntime";

jest.mock("../session/SupabaseSessionProvider", () => ({ useSupabaseSession: jest.fn() }));
jest.mock("../staging/StagingCoordinationClient", () => ({ createStagingCoordinationClient: jest.fn() }));

const IDENTITY = "11111111-1111-4111-8111-111111111111";
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
  actor: { identityId: IDENTITY, sessionId: SESSION, displayName: "Fictional Parent" },
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
    await waitFor(() => expect(screen.getByText("Start a conversation")).toBeTruthy());
    expect(screen.queryByText("ready")).toBeNull();
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

  it("fails closed when the token or verified session is unavailable", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ getAccessToken: jest.fn(async () => undefined) }));
    const view = render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("The staging session expired.")).toBeTruthy());

    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    view.rerender(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({}, false)} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("PeacePad could not restore this regional staging session.")).toBeTruthy());
  });
});
