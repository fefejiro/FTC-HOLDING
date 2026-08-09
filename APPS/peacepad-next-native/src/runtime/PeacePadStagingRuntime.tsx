import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from "react-native";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import { createStagingCoordinationClient } from "../staging/StagingCoordinationClient";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import { CoordinationStateProvider } from "../coordination/CoordinationState";
import { LabButton } from "../components/LabButton";
import type { PeacePadEnvironmentConfig, PeacePadSupabaseConfig } from "../config/environment";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { colors, spacing, typography } from "../theme";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Membership = Readonly<{
  familyCircleId: string;
  participantGrantId: string;
  familyName: string;
  role: string;
  permissions: readonly string[];
  version: number;
}>;

type VerifiedSessionContext = Readonly<{
  actor: { identityId: string; sessionId: string; displayName: string | null };
  memberships: readonly Membership[];
  region: "ca" | "us";
  schemaVersion: "2.0";
}>;

type RuntimeState =
  | { status: "loading" }
  | { status: "membership-empty" }
  | { status: "conversation-empty" }
  | { status: "ready"; api: PeacePadCoordinationApi; runtime: CoordinationRuntime }
  | { status: "error"; message: string };

function isMembership(value: unknown): value is Membership {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Membership>;
  return Boolean(
    typeof candidate.familyCircleId === "string" && UUID_PATTERN.test(candidate.familyCircleId)
    && typeof candidate.participantGrantId === "string" && UUID_PATTERN.test(candidate.participantGrantId)
    && typeof candidate.familyName === "string"
    && typeof candidate.role === "string"
    && Array.isArray(candidate.permissions)
    && candidate.permissions.every((permission) => typeof permission === "string")
    && Number.isInteger(candidate.version)
  );
}

export function validateVerifiedSessionContext(
  value: unknown,
  expectedIdentityId: string,
  expectedRegion: "ca" | "us"
): VerifiedSessionContext {
  if (!value || typeof value !== "object") throw new Error("The staging session response is invalid.");
  const candidate = value as Partial<VerifiedSessionContext>;
  if (!candidate.actor || candidate.actor.identityId !== expectedIdentityId || !UUID_PATTERN.test(candidate.actor.identityId)) {
    throw new Error("The staging identity could not be verified.");
  }
  if (!UUID_PATTERN.test(candidate.actor.sessionId)) throw new Error("The staging session context is incomplete.");
  if (candidate.region !== expectedRegion || candidate.schemaVersion !== "2.0") {
    throw new Error("The staging session belongs to a different regional environment.");
  }
  if (!Array.isArray(candidate.memberships) || !candidate.memberships.every(isMembership)) {
    throw new Error("The staging family membership response is invalid.");
  }
  return candidate as VerifiedSessionContext;
}

async function fetchVerifiedSession(
  config: PeacePadSupabaseConfig,
  expectedIdentityId: string,
  accessToken: string,
  fetcher: typeof fetch
): Promise<VerifiedSessionContext> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetcher(`${config.apiBaseUrl}/api/v2/session`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error("PeacePad could not restore this regional staging session.");
    return validateVerifiedSessionContext(payload, expectedIdentityId, config.region);
  } finally {
    clearTimeout(timeout);
  }
}

export function PeacePadStagingRuntime({
  children,
  environment,
  supabase,
  fetcher = fetch
}: {
  children: React.ReactNode;
  environment: PeacePadEnvironmentConfig;
  supabase: PeacePadSupabaseConfig;
  fetcher?: typeof fetch;
}) {
  const auth = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({ status: "loading" });
  const generation = useRef(0);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    if (auth.status !== "ready" || !auth.session) {
      setRuntimeState({ status: "loading" });
      return;
    }
    setRuntimeState({ status: "loading" });
    void auth.getAccessToken().then(async (token) => {
      if (!token) throw new Error("The staging session expired.");
      const verified = await fetchVerifiedSession(supabase, auth.session!.user.id, token, fetcher);
      if (currentGeneration !== generation.current) return;
      const membership = verified.memberships[0];
      if (!membership) {
        setRuntimeState({ status: "membership-empty" });
        return;
      }
      const api = createStagingCoordinationClient(environment, auth.getAccessToken, fetcher);
      const conversations = await api.listConversations(membership.familyCircleId);
      if (currentGeneration !== generation.current) return;
      const conversation = conversations.find((item) => item.status === "active");
      if (!conversation) {
        setRuntimeState({ status: "conversation-empty" });
        return;
      }
      setRuntimeState({
        status: "ready",
        api,
        runtime: {
          actorIdentityId: verified.actor.identityId,
          sessionId: verified.actor.sessionId,
          familyCircleId: membership.familyCircleId,
          participantGrantId: membership.participantGrantId,
          conversationId: conversation.id,
          region: verified.region
        }
      });
    }).catch((error) => {
      if (currentGeneration !== generation.current) return;
      setRuntimeState({ status: "error", message: error instanceof Error ? error.message : "PeacePad staging is unavailable." });
    });
  }, [auth.getAccessToken, auth.session, auth.status, environment, fetcher, supabase]);

  if (auth.status === "loading") return <GateMessage busy title="Restoring your session" body="Checking this device securely." />;
  if (auth.status === "error") return <GateMessage title="Session unavailable" body={auth.error ?? "PeacePad could not restore this session."} />;
  if (auth.status === "signed-out") {
    return (
      <View style={styles.page}>
        <Brand />
        <Text style={styles.title}>Sign in to staging</Text>
        <Text style={styles.body}>Use a fictional PeacePad staging account. Real family information is not permitted.</Text>
        <TextInput accessibilityLabel="Staging email" autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} />
        <TextInput accessibilityLabel="Staging password" onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} value={password} />
        <LabButton disabled={signInBusy || !email.trim() || !password} label={signInBusy ? "Signing in..." : "Sign in"} onPress={() => {
          setSignInBusy(true);
          void auth.signInWithPassword(email, password).catch(() => undefined).finally(() => setSignInBusy(false));
        }} />
        {auth.error ? <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text> : null}
      </View>
    );
  }
  if (runtimeState.status === "loading") return <GateMessage busy title="Opening PeacePad" body="Loading your authorized family space." />;
  if (runtimeState.status === "membership-empty") return <GateMessage onSignOut={auth.signOut} title="Create or join a family" body="This account has no active family membership yet." />;
  if (runtimeState.status === "conversation-empty") return <GateMessage onSignOut={auth.signOut} title="Start a conversation" body="Your family space is ready. Create a conversation before opening Messages." />;
  if (runtimeState.status === "error") return <GateMessage title="PeacePad is unavailable" body={runtimeState.message} />;
  return <CoordinationStateProvider api={runtimeState.api} runtime={runtimeState.runtime}>{children}</CoordinationStateProvider>;
}

function Brand() {
  return <View style={styles.brand}><Image accessibilityLabel="PeacePad conch logo" source={require("../foundation/peacepad-conch.png")} style={styles.logo} /><Text style={styles.brandName}>PeacePad</Text></View>;
}

function GateMessage({ busy = false, body, onSignOut, title }: { busy?: boolean; body: string; onSignOut?: () => Promise<void>; title: string }) {
  return <View style={styles.page}><Brand />{busy ? <ActivityIndicator color={colors.brand} /> : null}<Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text>{onSignOut ? <LabButton label="Sign out" onPress={() => void onSignOut()} variant="secondary" /> : null}</View>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  brand: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  logo: { height: 52, width: 52 },
  brandName: { color: colors.text, fontSize: 24, fontWeight: "800" },
  title: { color: colors.text, fontSize: 32, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 16, padding: spacing.md },
  error: { color: colors.dangerText, fontSize: 14 }
});
