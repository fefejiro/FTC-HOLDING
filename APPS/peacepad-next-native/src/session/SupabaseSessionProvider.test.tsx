import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { secureSupabaseStorage, SupabaseSessionProvider, useSupabaseSession } from "./SupabaseSessionProvider";

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

  it("unsubscribes from auth events on unmount", () => {
    const fake = fakeClient();
    const view = render(<SupabaseSessionProvider client={fake.client}><Probe /></SupabaseSessionProvider>);
    view.unmount();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
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
