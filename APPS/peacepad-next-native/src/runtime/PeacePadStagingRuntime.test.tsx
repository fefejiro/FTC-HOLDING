import React from "react";
import * as SecureStore from "expo-secure-store";
import { Linking, Share, Text } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createStagingCoordinationClient } from "../staging/StagingCoordinationClient";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { invitationCodeFromStagingUrl, PeacePadStagingRuntime, validateVerifiedSessionContext } from "./PeacePadStagingRuntime";
import { useOptionalStagingAccountActions } from "../session/StagingAccountActions";
import { secureMessageOutboxStore } from "../messaging/secureMessageOutbox";
import { LocalizationProvider } from "../localization/LocalizationProvider";

jest.mock("../session/SupabaseSessionProvider", () => ({ useSupabaseSession: jest.fn() }));
jest.mock("../staging/StagingCoordinationClient", () => ({ createStagingCoordinationClient: jest.fn() }));

const IDENTITY = "11111111-1111-4111-8111-111111111111";
const OTHER_IDENTITY = "66666666-6666-4666-8666-666666666666";
const SESSION = "22222222-2222-4222-8222-222222222222";
const FAMILY = "33333333-3333-4333-8333-333333333333";
const GRANT = "44444444-4444-4444-8444-444444444444";
const CONVERSATION = "55555555-5555-4555-8555-555555555555";

const environment = {
  apiBaseUrl: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api",
  diagnosticsEnabled: false,
  environment: "staging" as const,
  productionApiWritesEnabled: false as const,
  requestTimeoutMs: 12_000
};
const supabase = {
  apiBaseUrl: environment.apiBaseUrl,
  environment: "staging" as const,
  projectRef: "rohvkyuxbnqzglaromms",
  projectUrl: "https://rohvkyuxbnqzglaromms.supabase.co",
  publishableKey: "sb_publishable_test",
  region: "ca" as const
};
const productionEnvironment = {
  apiBaseUrl: "https://qzekqjewpugdotskrtni.supabase.co/functions/v1/peacepad-v2-api",
  diagnosticsEnabled: false,
  environment: "production" as const,
  productionApiWritesEnabled: true as const,
  requestTimeoutMs: 12_000
};
const productionSupabase = {
  apiBaseUrl: productionEnvironment.apiBaseUrl,
  environment: "production" as const,
  projectRef: "qzekqjewpugdotskrtni",
  projectUrl: "https://qzekqjewpugdotskrtni.supabase.co",
  publishableKey: "sb_publishable_test",
  region: "ca" as const
};

const authValue = (overrides: Record<string, unknown> = {}) => ({
  status: "ready",
  authIntent: "default",
  session: { user: { id: IDENTITY } },
  error: undefined,
  getAccessToken: jest.fn(async () => "fictional-access-token"),
  signInWithPassword: jest.fn(async () => undefined),
  signUpWithPassword: jest.fn(async () => ({ confirmationRequired: true })),
  signInWithApple: jest.fn(async () => undefined),
  signInWithGoogle: jest.fn(async () => undefined),
  sendPasswordReset: jest.fn(async () => undefined),
  updatePassword: jest.fn(async () => undefined),
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
    expect(invitationCodeFromStagingUrl("peacepad://invite/AB12C3", "peacepad:")).toBe("AB12C3");
    expect(invitationCodeFromStagingUrl("peacepadnextlab://invite/AB12C3", "peacepad:")).toBeUndefined();
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
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("routes verified-session reads to the exact regional Edge runtime", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const fetcher = sessionResponse({ ...valid, memberships: [] });
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({});

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );

    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    expect(fetcher).toHaveBeenCalledWith(
      `${environment.apiBaseUrl}/api/v2/session`,
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          Authorization: "Bearer fictional-access-token",
          "X-PeacePad-Region": "ca",
          "X-PeacePad-Schema-Version": "2.0",
          "X-Region": "ca-central-1"
        }
      })
    );
  });

  it("renders restore, error, and the full signed-out onboarding gate without synthetic coordination", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "loading", session: undefined }));
    const view = render(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);
    expect(screen.getByText("Restoring your session")).toBeTruthy();

    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "error", session: undefined, error: "Auth unavailable" }));
    view.rerender(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);
    expect(screen.getByText("Auth unavailable")).toBeTruthy();

    const signInWithPassword = jest.fn(async () => undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("true");
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "signed-out", session: undefined, signInWithPassword }));
    view.rerender(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);
    expect(await screen.findByTestId("staging-region-label")).toHaveTextContent("Canada staging");
    expect(screen.getByText("Create your PeacePad account")).toBeTruthy();
    fireEvent.press(screen.getByText("Sign in"));
    fireEvent.changeText(screen.getByLabelText("Email"), "fictional.parent@example.test");
    fireEvent.changeText(screen.getByLabelText("Password"), "fictional-password");
    fireEvent.press(screen.getAllByText("Sign in")[0]);
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith("fictional.parent@example.test", "fictional-password"));
  });

  it("submits staging credentials from the password keyboard exactly once", async () => {
    const signInWithPassword = jest.fn(async () => undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("true");
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue({ status: "signed-out", session: undefined, signInWithPassword }));
    render(<PeacePadStagingRuntime environment={environment} supabase={supabase}>ready</PeacePadStagingRuntime>);

    fireEvent.press(await screen.findByText("Sign in"));
    fireEvent.changeText(screen.getByLabelText("Email"), "  fictional.keyboard@example.test  ");
    fireEvent.changeText(screen.getByLabelText("Password"), "fictional-password");
    fireEvent(screen.getByLabelText("Password"), "submitEditing");
    fireEvent(screen.getByLabelText("Password"), "submitEditing");

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledTimes(1));
    expect(signInWithPassword).toHaveBeenCalledWith("fictional.keyboard@example.test", "fictional-password");
    await waitFor(() => expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0));
  });

  it("shows safe empty states for an account without a family or conversation", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });
    const view = render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>ready</PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    expect(screen.queryByText("ready")).toBeNull();

    view.rerender(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Invite another parent")).toBeTruthy());
    expect(screen.queryByText("ready")).toBeNull();
  });

  it("lets a new account continue privately before creating a family", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );

    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Start on my own" }));
    expect(await screen.findByTestId("solo-workspace")).toBeTruthy();
    expect(screen.getByText(/Use PeacePad privately now/)).toBeTruthy();
    expect(screen.getByText("Talk it through with PeaceBot")).toBeTruthy();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(`peacepad_v2_solo_onboarding:${IDENTITY}`, "enabled");
  });

  it.each([
    ["fr", "Inviter l’autre parent", "Vérifier la connexion"],
    ["es", "Invitar al otro progenitor", "Comprobar conexión"]
  ])("localizes the fail-closed conversation recovery state in %s", async (locale, title, recoveryAction) => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });
    render(
      <LocalizationProvider initialLocale={locale}>
        <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>ready</PeacePadStagingRuntime>
      </LocalizationProvider>
    );
    expect(await screen.findByRole("header", { name: title })).toBeTruthy();
    expect(screen.getByRole("button", { name: recoveryAction })).toBeTruthy();
  });

  it("requires explicit selection when more than one verified family is available", async () => {
    const familyB = "99999999-9999-4999-8999-999999999999";
    const grantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const listConversations = jest.fn(async (familyCircleId: string) => familyCircleId === familyB ? [{
      id: CONVERSATION,
      familyCircleId: familyB,
      participantIdentityIds: [IDENTITY, OTHER_IDENTITY],
      status: "active"
    }] : []);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      getMessageCheckPreference: jest.fn(async () => ({
        aiAssistanceEnabled: false, conversationId: CONVERSATION, enabled: false,
        id: "88888888-8888-4888-8888-888888888888", identityId: IDENTITY,
        provenance: { createdAt: "2026-08-09T12:00:00.000Z", createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" },
        region: "ca", schemaVersion: "2.0", version: 0
      })),
      listCalendarLayers: jest.fn(async () => []), listConversations,
      listMessages: jest.fn(async () => []), listScheduleEvents: jest.fn(async () => [])
    });
    const multiple = {
      ...valid,
      memberships: [
        valid.memberships[0],
        { ...valid.memberships[0], familyCircleId: familyB, participantGrantId: grantB, familyName: "Second Fictional Family" }
      ]
    };

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse(multiple)} supabase={supabase}>
        <Text testID="selected-family-ready">ready</Text>
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Choose a parenting space")).toBeTruthy());
    expect(listConversations).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Second Fictional Family - parent" }));
    await waitFor(() => expect(listConversations).toHaveBeenCalledWith(familyB));
    expect(await screen.findByTestId("selected-family-ready")).toBeTruthy();
    expect(listConversations).not.toHaveBeenCalledWith(FAMILY);
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
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
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
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("true");
    view.rerender(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher as unknown as typeof fetch} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByTestId("staging-region-label")).toHaveTextContent("Canada staging"));

    currentAuth = authValue({ session: { user: { id: OTHER_IDENTITY } } });
    view.rerender(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher as unknown as typeof fetch} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
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
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    expect(screen.queryByLabelText("Family name")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Prepare a private invitation" }));

    await waitFor(() => expect(createFamily).toHaveBeenCalledTimes(1));
    expect(createFamily).toHaveBeenCalledWith("PeacePad parenting space", expect.objectContaining({
      actor: { identityId: IDENTITY, sessionId: SESSION },
      expectedVersion: null,
      region: "ca",
      schemaVersion: "2.0"
    }));
    await waitFor(() => expect(screen.getByText("Invite another parent")).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("resolves and explicitly accepts an invitation with its atomic conversation", async () => {
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
      permissions: ["messages", "calendar", "shared-records", "calls"],
      expiresAt: "2026-08-12T12:00:00.000Z"
    }));
    const acceptedAt = "2026-08-09T12:00:00.000Z";
    const acceptInvitation = jest.fn(async () => ({
      grant: {
        id: "88888888-8888-4888-8888-888888888888", familyCircleId: FAMILY, identityId: IDENTITY,
        role: "parent", permissions: ["messages", "calendar", "shared-records", "calls"], grantedAt: acceptedAt,
        revokedAt: null, grantedBy: inviterId, schemaVersion: "2.0", version: 1, region: "ca",
        provenance: { createdAt: acceptedAt, createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" }
      },
      conversation: {
        id: CONVERSATION, familyCircleId: FAMILY, participantIdentityIds: [IDENTITY, inviterId], status: "active",
        schemaVersion: "2.0", version: 1, region: "ca",
        provenance: { createdAt: acceptedAt, createdBy: { identityId: IDENTITY, sessionId: SESSION }, source: "app" }
      }
    }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      acceptInvitation,
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
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "ab-12c3");
    fireEvent.press(screen.getByRole("button", { name: "Review invitation" }));
    await waitFor(() => expect(resolveInvitation).toHaveBeenCalledWith("AB12C3"));
    expect(screen.getByText("Fictional Family")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledTimes(1));
    expect(acceptInvitation).toHaveBeenCalledWith(invitationId, expect.objectContaining({ expectedVersion: 3 }));
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
      permissions: ["messages", "calendar", "shared-records", "calls"],
      expiresAt: "2026-08-12T12:00:00.000Z"
    }));
    const declineInvitation = jest.fn(async () => undefined);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ declineInvitation, resolveInvitation });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
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
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
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
        permissions: ["messages", "calendar", "shared-records", "calls"],
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
    await waitFor(() => expect(screen.getByText("Invite another parent")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Create invitation" }));
    await waitFor(() => expect(screen.getByText("PP2CA1")).toBeTruthy());
    expect(createInvitation).toHaveBeenCalledWith({
      expiresInHours: 72,
      familyCircleId: FAMILY,
      invitedRole: "parent",
      permissions: ["messages", "calendar", "shared-records", "calls"]
    }, expect.objectContaining({ actor: { identityId: IDENTITY, sessionId: SESSION }, region: "ca" }));
    fireEvent.press(screen.getByRole("button", { name: "Share invitation" }));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining("PP2CA1")
    }));
    fireEvent.press(screen.getByRole("button", { name: "Cancel invitation" }));
    await waitFor(() => expect(revokeInvitation).toHaveBeenCalledWith(
      invitationId,
      expect.objectContaining({ expectedVersion: 1 })
    ));
    expect(screen.queryByText("PP2CA1")).toBeNull();
    expect(screen.getByRole("button", { name: "Create invitation" })).toBeTruthy();
    shareSpy.mockRestore();
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
    const clearOutbox = jest.spyOn(secureMessageOutboxStore, "clear").mockResolvedValue(undefined);
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
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    expect(deleteAccount).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 3 })));
    expect(clearOutbox).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it("clears queued message content before signing out", async () => {
    const auth = authValue();
    const clearOutbox = jest.spyOn(secureMessageOutboxStore, "clear").mockResolvedValue(undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({});
    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(clearOutbox).toHaveBeenCalledTimes(1);
    expect(clearOutbox.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0]);
  });

  it("routes ready-state sign out through queued-message cleanup", async () => {
    const auth = authValue();
    const clearOutbox = jest.spyOn(secureMessageOutboxStore, "clear").mockResolvedValue(undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
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

    function ReadySignOutProbe() {
      const actions = useOptionalStagingAccountActions();
      return <Text accessibilityRole="button" onPress={() => void actions?.signOut()}>sign out ready</Text>;
    }

    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}><ReadySignOutProbe /></PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("sign out ready")).toBeTruthy());
    fireEvent.press(screen.getByText("sign out ready"));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(clearOutbox).toHaveBeenCalledTimes(1);
    expect(clearOutbox.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0]);
  });

  it("does not sign out when the verified deletion request fails", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const deleteAccount = jest.fn(async () => { throw new Error("PeacePad could not verify the account deletion receipt."); });
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ deleteAccount });
    render(<PeacePadStagingRuntime environment={environment} fetcher={sessionResponse({ ...valid, memberships: [] })} supabase={supabase}>ready</PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "Delete staging account" }));
    fireEvent.press(screen.getByRole("button", { name: "Delete account permanently" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("PeacePad could not verify the account deletion receipt."));
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("updates the verified profile with actor-bound optimistic concurrency", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const updateProfile = jest.fn(async () => ({
      identityId: IDENTITY,
      displayName: "Calm Parent",
      region: "ca",
      version: 4
    }));
    const prepareAccountExport = jest.fn(async () => ({
      identityId: IDENTITY,
      region: "ca" as const,
      schemaVersion: "2.0" as const,
      generatedAt: "2026-08-29T12:00:00.000Z",
      contentIncluded: false as const,
      status: "manifest-ready" as const,
      counts: { families: 1, conversations: 1, messageEvents: 0, calendarEvents: 0, privateRecords: 0, privateAttachments: 0, legacyTasks: 0, legacyExpenses: 0 }
    }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      updateProfile,
      prepareAccountExport,
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

    function ProfileProbe() {
      const actions = useOptionalStagingAccountActions();
      return <>
        <Text accessibilityRole="button" onPress={() => void actions?.updateProfile?.("Calm Parent")}>update profile</Text>
        <Text accessibilityRole="button" onPress={() => void actions?.exportAccount?.()}>prepare export</Text>
      </>;
    }

    const fetcher = sessionResponse();
    render(<PeacePadStagingRuntime environment={environment} fetcher={fetcher} supabase={supabase}><ProfileProbe /></PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("update profile")).toBeTruthy());
    fireEvent.press(screen.getByText("update profile"));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith("Calm Parent", expect.objectContaining({
      actor: { identityId: IDENTITY, sessionId: SESSION },
      expectedVersion: 3,
      region: "ca",
      schemaVersion: "2.0"
    })));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    fireEvent.press(screen.getByText("prepare export"));
    await waitFor(() => expect(prepareAccountExport).toHaveBeenCalledWith(expect.objectContaining({
      actor: { identityId: IDENTITY, sessionId: SESSION },
      expectedVersion: 3,
      region: "ca",
      schemaVersion: "2.0"
    })));
  });

  it("leaves only the verified family grant with optimistic concurrency", async () => {
    const auth = authValue();
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const leaveFamily = jest.fn(async () => ({
      familyCircleId: FAMILY,
      participantGrantId: GRANT,
      status: "left",
      leftAt: "2026-08-14T12:00:00.000Z",
      version: 2
    }));
    jest.spyOn(secureMessageOutboxStore, "list").mockResolvedValue([]);
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({
      leaveFamily,
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

    function LeaveFamilyProbe() {
      const actions = useOptionalStagingAccountActions();
      return <Text accessibilityRole="button" onPress={() => void actions?.leaveFamily?.()}>leave now</Text>;
    }

    const fetcher = sessionResponse();
    render(<PeacePadStagingRuntime environment={environment} fetcher={fetcher} supabase={supabase}><LeaveFamilyProbe /></PeacePadStagingRuntime>);
    await waitFor(() => expect(screen.getByText("leave now")).toBeTruthy());
    fireEvent.press(screen.getByText("leave now"));
    fireEvent.press(screen.getByText("leave now"));

    await waitFor(() => expect(leaveFamily).toHaveBeenCalledTimes(1));
    expect(leaveFamily).toHaveBeenCalledWith(FAMILY, expect.objectContaining({
      actor: { identityId: IDENTITY, sessionId: SESSION },
      expectedVersion: 1,
      region: "ca",
      schemaVersion: "2.0"
    }));
    expect(secureMessageOutboxStore.list).toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("leave now")).toBeTruthy());
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
    await waitFor(() => expect(screen.getByText("Invite another parent")).toBeTruthy());
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

  it("bootstraps an unbound production identity and retries session hydration", async () => {
    const auth = authValue({ session: { user: { id: IDENTITY, email: "new-parent@example.test", user_metadata: { full_name: "New Parent" } } } });
    (useSupabaseSession as jest.Mock).mockReturnValue(auth);
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: { code: "IDENTITY_NOT_BOUND" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...valid, memberships: [] }) });
    const bootstrapIdentity = jest.fn(async () => ({ identityId: IDENTITY, region: "ca" as const, displayName: "New Parent" }));
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ bootstrapIdentity, listConversations: jest.fn(async () => []) });

    render(<PeacePadStagingRuntime environment={productionEnvironment} fetcher={fetcher as unknown as typeof fetch} supabase={productionSupabase}>ready</PeacePadStagingRuntime>);

    await waitFor(() => expect(screen.getByText("Start with PeacePad")).toBeTruthy());
    expect(bootstrapIdentity).toHaveBeenCalledWith("New Parent", "ca");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("lets a sole parent continue without an invitation and remembers that choice", async () => {
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    const fetcher = sessionResponse();
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={fetcher} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );

    await waitFor(() => expect(screen.getByRole("header", { name: "Invite another parent" })).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Start on my own" }));

    expect(await screen.findByTestId("solo-workspace")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Your private PeacePad space" })).toBeTruthy();
    expect(screen.getByText(/Nothing is shared with another parent/)).toBeTruthy();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      `peacepad_v2_solo:${IDENTITY}:${FAMILY}`,
      "enabled"
    );
  });

  it("gives a sole parent the legacy Pause draft and shares only when they choose", async () => {
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
    (useSupabaseSession as jest.Mock).mockReturnValue(authValue());
    (createStagingCoordinationClient as jest.Mock).mockReturnValue({ listConversations: jest.fn(async () => []) });

    render(
      <PeacePadStagingRuntime environment={environment} fetcher={sessionResponse()} supabase={supabase}>
        ready
      </PeacePadStagingRuntime>
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Start on my own" })).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Start on my own" }));
    const draft = await screen.findByLabelText("Private draft");
    await waitFor(() => expect(draft.props.editable).toBe(true));
    fireEvent.changeText(draft, "I would like to talk about Saturday.");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      `peacepad_v2_solo_draft:${IDENTITY}:${FAMILY}`,
      "I would like to talk about Saturday.",
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
    fireEvent.press(screen.getByRole("button", { name: "Share draft" }));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledWith({
      message: "I would like to talk about Saturday.",
      title: "PeacePad"
    }));
    shareSpy.mockRestore();
  });
});
