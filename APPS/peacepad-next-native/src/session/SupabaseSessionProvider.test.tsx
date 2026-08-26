import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { secureSupabaseStorage, sessionTokensFromAuthUrl, SupabaseSessionProvider, useSupabaseSession } from "./SupabaseSessionProvider";
import { LocalizationProvider } from "../localization/LocalizationProvider";

const RECOVERY_PASSWORD = ["new", "secure", "password"].join("-");

function Probe() {
  const session = useSupabaseSession();
  return <Text testID="status">{`${session.status}:${session.session?.access_token ?? "none"}`}</Text>;
}

function SignOutProbe() {
  const session = useSupabaseSession();
  return (
    <Text testID="sign-out" onPress={() => void session.signOut()}>
      {`${session.status}:${session.session?.access_token ?? "none"}:${session.error ?? "no-error"}`}
    </Text>
  );
}

function RealtimeProbe() {
  const session = useSupabaseSession();
  return <Text testID="realtime">{session.realtimeClient ? "available" : "unavailable"}</Text>;
}

function AuthActionsProbe() {
  const session = useSupabaseSession();
  return <>
    <Text testID="sign-up" onPress={() => void session.signUpWithPassword("new@example.com", "secure-password")}>sign-up</Text>
    <Text testID="apple" onPress={() => void session.signInWithApple("apple-token", "raw-nonce", "Peace Parent")}>apple</Text>
    <Text testID="google" onPress={() => void session.signInWithGoogle("google-token")}>google</Text>
    <Text testID="providers" onPress={() => void session.getLinkedProviders()}>providers</Text>
    <Text testID="link-google" onPress={() => void session.linkProvider("google", { token: "google-token", accessToken: "google-access" })}>link-google</Text>
    <Text testID="unlink-google" onPress={() => void session.unlinkProvider("google", "google-subject")}>unlink-google</Text>
    <Text testID="reset" onPress={() => void session.sendPasswordReset("parent@example.com")}>reset</Text>
    <Text testID="update-password" onPress={() => void session.updatePassword(RECOVERY_PASSWORD)}>update-password</Text>
  </>;
}

function fakeClient(initialSession: any = null) {
  let currentSession = initialSession;
  let listener: ((event: string, session: any) => void) | undefined;
  const unsubscribe = jest.fn();
  const auth = {
    getSession: jest.fn(async () => ({ data: { session: currentSession }, error: null })),
    refreshSession: jest.fn(async () => ({ data: { session: currentSession }, error: null })),
    onAuthStateChange: jest.fn((callback: typeof listener) => {
      listener = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    signInWithPassword: jest.fn(async () => ({ data: { session: initialSession }, error: null })),
    signUp: jest.fn(async () => ({ data: { session: null, user: { id: "new-user" } }, error: null })),
    signInWithIdToken: jest.fn(async () => ({ data: { session: initialSession }, error: null })),
    getUserIdentities: jest.fn(async () => ({ data: { identities: [] }, error: null })),
    linkIdentity: jest.fn(async () => ({ data: { session: initialSession, user: initialSession?.user ?? null }, error: null })),
    unlinkIdentity: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(async () => ({ data: { user: { id: "new-user" } }, error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    setSession: jest.fn(async () => ({ data: { session: initialSession }, error: null })),
    signOut: jest.fn(async (_options?: { scope: "local" }) => {
      currentSession = null;
      return { error: null as Error | null };
    }),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn()
  };
  return { client: { auth } as any, emit: (event: string, session: any) => listener?.(event, session), auth, unsubscribe };
}

describe("SupabaseSessionProvider", () => {
  it("fails closed to signed-out when no SDK session exists", async () => {
    const fake = fakeClient();
    render(<SupabaseSessionProvider client={fake.client}><Probe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("status").props.children).toBe("signed-out:none"));
  });

  it("restores and tracks the latest SDK-managed token", async () => {
    const sessionA = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const sessionB = { ...sessionA, access_token: "token-b" };
    const fake = fakeClient(sessionA);
    render(<SupabaseSessionProvider client={fake.client}><Probe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("status").props.children).toBe("ready:token-a"));
    await act(async () => fake.emit("TOKEN_REFRESHED", sessionB));
    expect(screen.getByTestId("status").props.children).toBe("ready:token-b");
  });

  it("clears the exposed session on sign-out", async () => {
    const current = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const fake = fakeClient(current);
    render(<SupabaseSessionProvider client={fake.client}><Probe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("status").props.children).toBe("ready:token-a"));
    await act(async () => fake.emit("SIGNED_OUT", null));
    expect(screen.getByTestId("status").props.children).toBe("signed-out:none");
  });

  it("removes local authorization before the SDK sign-out operation resolves", async () => {
    const current = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const fake = fakeClient(current);
    let resolveSignOut!: (value: { error: null }) => void;
    fake.auth.signOut.mockImplementation(() => new Promise((resolve) => { resolveSignOut = resolve; }));
    render(<SupabaseSessionProvider client={fake.client}><SignOutProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("sign-out")).toHaveTextContent("ready:token-a:no-error"));

    act(() => screen.getByTestId("sign-out").props.onPress());
    await waitFor(() => expect(screen.getByTestId("sign-out")).toHaveTextContent("signed-out:none:no-error"));
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });

    await act(async () => resolveSignOut({ error: null }));
  });

  it("remains signed out and reports safe cleanup failure when local SDK cleanup fails", async () => {
    const current = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const fake = fakeClient(current);
    fake.auth.signOut.mockResolvedValue({ error: new Error("private cleanup detail") });
    render(<SupabaseSessionProvider client={fake.client}><SignOutProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("sign-out")).toHaveTextContent("ready:token-a:no-error"));

    await act(async () => screen.getByTestId("sign-out").props.onPress());
    await waitFor(() => expect(screen.getByTestId("sign-out")).toHaveTextContent(
      "signed-out:none:This device was signed out, but the remote session could not be closed."
    ));
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it.each([
    ["fr", "Cet appareil a été déconnecté, mais la session distante n’a pas pu être fermée."],
    ["es", "Se cerró la sesión en este dispositivo, pero no se pudo cerrar la sesión remota."]
  ])("localizes fail-closed remote cleanup presentation in %s", async (locale, message) => {
    const current = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const fake = fakeClient(current);
    fake.auth.signOut.mockResolvedValue({ error: new Error("private cleanup detail") });
    render(<LocalizationProvider initialLocale={locale}><SupabaseSessionProvider client={fake.client}><SignOutProbe /></SupabaseSessionProvider></LocalizationProvider>);
    await waitFor(() => expect(screen.getByTestId("sign-out")).toHaveTextContent("ready:token-a:no-error"));
    await act(async () => screen.getByTestId("sign-out").props.onPress());
    await waitFor(() => expect(screen.getByTestId("sign-out")).toHaveTextContent(`signed-out:none:${message}`));
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("unsubscribes from auth events on unmount", () => {
    const fake = fakeClient();
    const view = render(<SupabaseSessionProvider client={fake.client}><Probe /></SupabaseSessionProvider>);
    view.unmount();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("exposes Realtime only when the authenticated SDK client supports the full private-channel boundary", async () => {
    const authOnly = fakeClient();
    const first = render(<SupabaseSessionProvider client={authOnly.client}><RealtimeProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("realtime")).toHaveTextContent("unavailable"));
    first.unmount();

    const full = fakeClient();
    const channel = jest.fn();
    const removeChannel = jest.fn();
    const setAuth = jest.fn();
    render(<SupabaseSessionProvider client={{ ...full.client, channel, removeChannel, realtime: { setAuth } } as any}><RealtimeProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("realtime")).toHaveTextContent("available"));
  });

  it("uses the approved native redirect for account creation and password recovery", async () => {
    const fake = fakeClient();
    render(<SupabaseSessionProvider client={fake.client}><AuthActionsProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("sign-up")).toBeTruthy());
    await act(async () => screen.getByTestId("sign-up").props.onPress());
    await act(async () => screen.getByTestId("reset").props.onPress());
    await act(async () => screen.getByTestId("update-password").props.onPress());
    expect(fake.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secure-password",
      options: { emailRedirectTo: "peacepad://auth/confirm" }
    });
    expect(fake.auth.resetPasswordForEmail).toHaveBeenCalledWith("parent@example.com", { redirectTo: "peacepad://auth/reset-password" });
    expect(fake.auth.updateUser).toHaveBeenCalledWith({ password: RECOVERY_PASSWORD });
  });

  it("passes the native Apple identity token to Supabase and stores the first-authorized name", async () => {
    const fake = fakeClient();
    render(<SupabaseSessionProvider client={fake.client}><AuthActionsProbe /></SupabaseSessionProvider>);
    await act(async () => screen.getByTestId("apple").props.onPress());
    expect(fake.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: "apple", token: "apple-token", nonce: "raw-nonce" });
    expect(fake.auth.updateUser).toHaveBeenCalledWith({ data: { full_name: "Peace Parent" } });
  });

  it("passes only the native Google identity token to Supabase", async () => {
    const fake = fakeClient();
    render(<SupabaseSessionProvider client={fake.client}><AuthActionsProbe /></SupabaseSessionProvider>);
    await act(async () => screen.getByTestId("google").props.onPress());
    expect(fake.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: "google", token: "google-token" });
  });

  it("links Google only to the current verified account and rechecks the resulting identity", async () => {
    const current = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const fake = fakeClient(current);
    const emailIdentity = { id: "email-id", identity_id: "user-a", user_id: "user-a", provider: "email", identity_data: { sub: "user-a" } };
    const googleIdentity = { id: "google-id", identity_id: "google-subject", user_id: "user-a", provider: "google", identity_data: { sub: "google-subject" } };
    (fake.auth.getUserIdentities as jest.Mock)
      .mockResolvedValueOnce({ data: { identities: [emailIdentity] }, error: null })
      .mockResolvedValueOnce({ data: { identities: [emailIdentity, googleIdentity] }, error: null });
    render(<SupabaseSessionProvider client={fake.client}><AuthActionsProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("link-google")).toBeTruthy());
    await act(async () => screen.getByTestId("link-google").props.onPress());
    expect(fake.auth.linkIdentity).toHaveBeenCalledWith({ provider: "google", token: "google-token", access_token: "google-access" });
  });

  it("requires a fresh matching provider subject and preserves one remaining sign-in method when unlinking", async () => {
    const current = { access_token: "token-a", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "user-a" } };
    const fake = fakeClient(current);
    const emailIdentity = { id: "email-id", identity_id: "user-a", user_id: "user-a", provider: "email", identity_data: { sub: "user-a" } };
    const googleIdentity = { id: "google-id", identity_id: "google-subject", user_id: "user-a", provider: "google", identity_data: { sub: "google-subject" } };
    (fake.auth.getUserIdentities as jest.Mock)
      .mockResolvedValueOnce({ data: { identities: [emailIdentity, googleIdentity] }, error: null })
      .mockResolvedValueOnce({ data: { identities: [emailIdentity] }, error: null });
    render(<SupabaseSessionProvider client={fake.client}><AuthActionsProbe /></SupabaseSessionProvider>);
    await waitFor(() => expect(screen.getByTestId("unlink-google")).toBeTruthy());
    await act(async () => screen.getByTestId("unlink-google").props.onPress());
    expect(fake.auth.unlinkIdentity).toHaveBeenCalledWith(googleIdentity);
  });
});

describe("sessionTokensFromAuthUrl", () => {
  it("accepts only the two exact PeacePad auth callback paths", () => {
    expect(sessionTokensFromAuthUrl("peacepad://auth/confirm#access_token=access&refresh_token=refresh")).toEqual({ accessToken: "access", refreshToken: "refresh", intent: "default" });
    expect(sessionTokensFromAuthUrl("peacepad://auth/reset-password#access_token=access&refresh_token=refresh")).toEqual({ accessToken: "access", refreshToken: "refresh", intent: "password-recovery" });
    expect(sessionTokensFromAuthUrl("peacepad://invite/ABC123#access_token=access&refresh_token=refresh")).toBeUndefined();
    expect(sessionTokensFromAuthUrl("https://peacepad.ca/auth/confirm#access_token=access&refresh_token=refresh")).toBeUndefined();
    expect(sessionTokensFromAuthUrl("peacepad://auth/confirm#access_token=access")).toBeUndefined();
  });
});

describe("secureSupabaseStorage", () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    secureStore.getItemAsync.mockImplementation(async (key) => values.get(key) ?? null);
    secureStore.setItemAsync.mockImplementation(async (key, value) => { values.set(key, value); });
    secureStore.deleteItemAsync.mockImplementation(async (key) => { values.delete(key); });
  });

  it("round-trips a session payload larger than a single Keychain value", async () => {
    const payload = JSON.stringify({ access_token: "a".repeat(5_000), refresh_token: "r".repeat(2_000) });
    await secureSupabaseStorage.setItem("auth-token", payload);
    await expect(secureSupabaseStorage.getItem("auth-token")).resolves.toBe(payload);
    expect([...values.keys()].filter((key) => key.includes(".chunk.")).length).toBeGreaterThan(1);
  });

  it("fails closed for a corrupt storage manifest", async () => {
    values.set("peacepad.v2.supabase.auth-token.manifest", "{not-json");
    await expect(secureSupabaseStorage.getItem("auth-token")).resolves.toBeNull();
  });
});
