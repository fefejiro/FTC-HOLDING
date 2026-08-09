import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import type { CreatedInvitation, PeacePadCoordinationApi } from "../api/CoordinationApi";
import { createStagingCoordinationClient } from "../staging/StagingCoordinationClient";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import { CoordinationStateProvider } from "../coordination/CoordinationState";
import { LabButton } from "../components/LabButton";
import type { PeacePadEnvironmentConfig, PeacePadSupabaseConfig } from "../config/environment";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { StagingAccountActionsProvider } from "../session/StagingAccountActions";
import { createWriteContext, type InvitationPreview } from "../domain/v2";
import { colors, spacing, typography } from "../theme";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function invitationCodeFromStagingUrl(url?: string | null): string | undefined {
  if (!url || url.trim() !== url) return undefined;
  try {
    const parsed = new URL(url);
    const code = parsed.pathname.match(/^\/([a-z0-9]{6})\/?$/i)?.[1];
    if (
      parsed.protocol !== "peacepadnextlab:"
      || parsed.hostname !== "invite"
      || parsed.port
      || parsed.username
      || parsed.password
      || parsed.search
      || parsed.hash
      || !code
    ) return undefined;
    return code.toUpperCase();
  } catch {
    return undefined;
  }
}

type Membership = Readonly<{
  familyCircleId: string;
  participantGrantId: string;
  familyName: string;
  role: string;
  permissions: readonly string[];
  version: number;
}>;

type VerifiedSessionContext = Readonly<{
  actor: { identityId: string; sessionId: string; displayName: string | null; version: number };
  memberships: readonly Membership[];
  region: "ca" | "us";
  schemaVersion: "2.0";
}>;

type RuntimeState =
  | { status: "loading" }
  | { status: "membership-empty"; api: PeacePadCoordinationApi; verified: VerifiedSessionContext }
  | { status: "conversation-empty"; api: PeacePadCoordinationApi; membership: Membership; verified: VerifiedSessionContext }
  | { status: "ready"; api: PeacePadCoordinationApi; runtime: CoordinationRuntime }
  | { status: "error"; message: string };

type PendingStagingInvitation = Readonly<{
  code?: string;
  claim: () => string | undefined;
}>;

const PendingStagingInvitationContext = createContext<PendingStagingInvitation>({ claim: () => undefined });

export function PendingStagingInvitationProvider({
  children,
  code,
  onConsumed
}: {
  children: React.ReactNode;
  code?: string;
  onConsumed: () => void;
}) {
  const claimedCode = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!code) claimedCode.current = undefined;
  }, [code]);
  const claim = useCallback(() => {
    if (!code || claimedCode.current === code) return undefined;
    claimedCode.current = code;
    onConsumed();
    return code;
  }, [code, onConsumed]);
  const value = useMemo(() => ({ code, claim }), [claim, code]);
  return <PendingStagingInvitationContext.Provider value={value}>{children}</PendingStagingInvitationContext.Provider>;
}

export function usePendingStagingInvitation() {
  return useContext(PendingStagingInvitationContext);
}

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
  if (!Number.isInteger(candidate.actor.version) || candidate.actor.version < 1) {
    throw new Error("The staging account version is invalid.");
  }
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
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [reloadVersion, setReloadVersion] = useState(0);
  const [incomingInvitationCode, setIncomingInvitationCode] = useState<string>();
  const generation = useRef(0);
  const deleteInFlight = useRef(false);
  const lastReadyIdentity = useRef<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    let liveUrlReceived = false;
    const receive = (url?: string | null) => {
      const code = invitationCodeFromStagingUrl(url);
      if (mounted && code) setIncomingInvitationCode(code);
    };
    const subscription = Linking.addEventListener("url", ({ url }) => {
      liveUrlReceived = true;
      receive(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (!liveUrlReceived) receive(url);
    }).catch(() => undefined);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const identityId = auth.status === "ready" ? auth.session?.user.id : undefined;
    if (identityId) {
      if (lastReadyIdentity.current && lastReadyIdentity.current !== identityId) {
        setIncomingInvitationCode(undefined);
      }
      lastReadyIdentity.current = identityId;
      return;
    }
    if (auth.status === "signed-out" && lastReadyIdentity.current) {
      setIncomingInvitationCode(undefined);
      lastReadyIdentity.current = undefined;
    }
  }, [auth.session?.user.id, auth.status]);

  const deleteVerifiedAccount = async (
    api: PeacePadCoordinationApi,
    actor: VerifiedSessionContext["actor"],
    region: "ca" | "us"
  ) => {
    if (deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteBusy(true);
    setDeleteError(undefined);
    try {
      await api.deleteAccount(createWriteContext({
        actor: { identityId: actor.identityId, sessionId: actor.sessionId },
        expectedVersion: actor.version,
        idempotencyKey: `account-delete-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        region
      }));
      await auth.signOut();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "PeacePad could not delete this staging account.");
      throw cause;
    } finally {
      deleteInFlight.current = false;
      setDeleteBusy(false);
    }
  };

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
      const api = createStagingCoordinationClient(environment, auth.getAccessToken, fetcher);
      const membership = verified.memberships[0];
      if (!membership) {
        setRuntimeState({ status: "membership-empty", api, verified });
        return;
      }
      const conversations = await api.listConversations(membership.familyCircleId);
      if (currentGeneration !== generation.current) return;
      const conversation = conversations.find((item) => item.status === "active");
      if (!conversation) {
        setRuntimeState({ status: "conversation-empty", api, membership, verified });
        return;
      }
      setRuntimeState({
        status: "ready",
        api,
        runtime: {
          actorIdentityId: verified.actor.identityId,
          identityVersion: verified.actor.version,
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
  }, [auth.getAccessToken, auth.session, auth.status, environment, fetcher, reloadVersion, supabase]);

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
  if (runtimeState.status === "membership-empty") return <FamilySetup accountDeletion={{ deleteAccount: () => deleteVerifiedAccount(runtimeState.api, runtimeState.verified.actor, runtimeState.verified.region), deleting: deleteBusy, error: deleteError }} api={runtimeState.api} initialInvitationCode={incomingInvitationCode} onInvitationCodeConsumed={() => setIncomingInvitationCode(undefined)} onReload={() => setReloadVersion((value) => value + 1)} onSignOut={auth.signOut} verified={runtimeState.verified} />;
  if (runtimeState.status === "conversation-empty") return <ConversationSetup accountDeletion={{ deleteAccount: () => deleteVerifiedAccount(runtimeState.api, runtimeState.verified.actor, runtimeState.verified.region), deleting: deleteBusy, error: deleteError }} api={runtimeState.api} membership={runtimeState.membership} onReload={() => setReloadVersion((value) => value + 1)} onSignOut={auth.signOut} verified={runtimeState.verified} />;
  if (runtimeState.status === "error") return <GateMessage title="PeacePad is unavailable" body={runtimeState.message} />;
  const accountActions = {
    deleting: deleteBusy,
    error: deleteError,
    deleteAccount: () => deleteVerifiedAccount(runtimeState.api, {
      identityId: runtimeState.runtime.actorIdentityId,
      sessionId: runtimeState.runtime.sessionId,
      displayName: null,
      version: runtimeState.runtime.identityVersion
    }, runtimeState.runtime.region)
  };
  return (
    <PendingStagingInvitationProvider code={incomingInvitationCode} onConsumed={() => setIncomingInvitationCode(undefined)}>
      <StagingAccountActionsProvider value={accountActions}>
        <CoordinationStateProvider api={runtimeState.api} runtime={runtimeState.runtime}>{children}</CoordinationStateProvider>
      </StagingAccountActionsProvider>
    </PendingStagingInvitationProvider>
  );
}

function runtimeWriteContext(verified: VerifiedSessionContext, expectedVersion: number | null = null) {
  return createWriteContext({
    actor: { identityId: verified.actor.identityId, sessionId: verified.actor.sessionId },
    expectedVersion,
    idempotencyKey: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    region: verified.region
  });
}

function FamilySetup({ accountDeletion, api, initialInvitationCode, onInvitationCodeConsumed, onReload, onSignOut, verified }: {
  accountDeletion: { deleteAccount: () => Promise<void>; deleting: boolean; error?: string };
  api: PeacePadCoordinationApi;
  initialInvitationCode?: string;
  onInvitationCodeConsumed: () => void;
  onReload: () => void;
  onSignOut: () => Promise<void>;
  verified: VerifiedSessionContext;
}) {
  const [familyName, setFamilyName] = useState("");
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode ?? "");
  const [preview, setPreview] = useState<InvitationPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (initialInvitationCode) {
      setInvitationCode(initialInvitationCode);
      setPreview(undefined);
    }
  }, [initialInvitationCode]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try { await operation(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not complete that request.");
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.page}>
      <Brand />
      <Text style={styles.title}>Create or join a family</Text>
      <Text style={styles.body}>Use fictional staging information only. A connection is created only after an invitation is accepted.</Text>
      <Text style={styles.sectionTitle}>Create a family space</Text>
      <TextInput accessibilityLabel="Family name" maxLength={120} onChangeText={setFamilyName} placeholder="Family name" style={styles.input} value={familyName} />
      <LabButton disabled={busy || !familyName.trim()} label="Create family" onPress={() => void run(async () => {
        await api.createFamily(familyName, runtimeWriteContext(verified));
        onReload();
      })} />
      <Text style={styles.sectionTitle}>Enter an invitation code</Text>
      <TextInput accessibilityLabel="Invitation code" autoCapitalize="characters" maxLength={6} onChangeText={(value) => {
        setInvitationCode(value.replace(/[^a-z0-9]/gi, "").toUpperCase());
        setPreview(undefined);
      }} placeholder="6-character code" style={styles.input} value={invitationCode} />
      {preview ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{preview.familyDisplayName}</Text>
          <Text style={styles.body}>Invited by {preview.inviterDisplayName} as {preview.invitedRole}.</Text>
          <LabButton disabled={busy} label="Accept invitation" onPress={() => void run(async () => {
            const grant = await api.acceptInvitation(preview.invitationId, runtimeWriteContext(verified, preview.version));
            if (grant.grantedBy !== verified.actor.identityId) {
              await api.createConversation({
                familyCircleId: grant.familyCircleId,
                participantIdentityIds: [verified.actor.identityId, grant.grantedBy]
              }, runtimeWriteContext(verified));
            }
            onReload();
          })} />
          <LabButton disabled={busy} label="Decline invitation" onPress={() => void run(async () => {
            await api.declineInvitation(preview.invitationId, runtimeWriteContext(verified, preview.version));
            setPreview(undefined);
            setInvitationCode("");
          })} variant="secondary" />
        </View>
      ) : <LabButton disabled={busy || invitationCode.length !== 6} label="Review invitation" onPress={() => void run(async () => {
        setPreview(await api.resolveInvitation(invitationCode));
        onInvitationCodeConsumed();
      })} variant="secondary" />}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <LabButton disabled={busy} label="Sign out" onPress={() => void onSignOut()} variant="secondary" />
      <AccountDeletionControls value={accountDeletion} />
    </View>
  );
}

function ConversationSetup({ accountDeletion, api, membership, onReload, onSignOut, verified }: {
  accountDeletion: { deleteAccount: () => Promise<void>; deleting: boolean; error?: string };
  api: PeacePadCoordinationApi;
  membership: Membership;
  onReload: () => void;
  onSignOut: () => Promise<void>;
  verified: VerifiedSessionContext;
}) {
  const [busy, setBusy] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation>();
  const [error, setError] = useState<string>();
  const createInvitation = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const created = await api.createInvitation({
        expiresInHours: 72,
        familyCircleId: membership.familyCircleId,
        invitedRole: "parent",
        permissions: ["message.write", "calendar.write"]
      }, runtimeWriteContext(verified));
      setCreatedInvitation(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not create an invitation.");
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.page}>
      <Brand />
      <Text style={styles.title}>Invite your co-parent</Text>
      <Text style={styles.body}>{membership.familyName} is ready. Share a single-use code, then check again after it is accepted.</Text>
      {createdInvitation ? <View style={styles.codeCard}><Text accessibilityLabel="Invitation code" selectable style={styles.code}>{createdInvitation.code}</Text><Text style={styles.body}>Expires in 72 hours. Do not use real family information in staging.</Text></View> : null}
      {createdInvitation ? <LabButton disabled={busy} label="Revoke invitation" onPress={() => void (async () => {
        setBusy(true);
        setError(undefined);
        try {
          await api.revokeInvitation(createdInvitation.invitation.id, runtimeWriteContext(verified, createdInvitation.invitation.version));
          setCreatedInvitation(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "PeacePad could not revoke the invitation.");
        } finally { setBusy(false); }
      })()} variant="secondary" /> : <LabButton disabled={busy} label="Create invitation code" onPress={() => void createInvitation()} />}
      <LabButton disabled={busy} label="Check connection" onPress={onReload} variant="secondary" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <LabButton disabled={busy} label="Sign out" onPress={() => void onSignOut()} variant="secondary" />
      <AccountDeletionControls value={accountDeletion} />
    </View>
  );
}

function AccountDeletionControls({ value }: {
  value: { deleteAccount: () => Promise<void>; deleting: boolean; error?: string };
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <LabButton label="Delete staging account" onPress={() => setConfirming(true)} variant="secondary" />;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Delete this staging account?</Text>
      <Text style={styles.body}>This permanently deletes the fictional staging identity and revokes its family access. This cannot be undone.</Text>
      <LabButton disabled={value.deleting} label={value.deleting ? "Deleting account..." : "Delete account permanently"} onPress={() => void value.deleteAccount().catch(() => undefined)} />
      <LabButton disabled={value.deleting} label="Cancel" onPress={() => setConfirming(false)} variant="secondary" />
      {value.error ? <Text accessibilityRole="alert" style={styles.error}>{value.error}</Text> : null}
    </View>
  );
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
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 16, padding: spacing.md },
  error: { color: colors.dangerText, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  codeCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  code: { color: colors.brand, fontSize: 34, fontWeight: "800", letterSpacing: 8 }
});
