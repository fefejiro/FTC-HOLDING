import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { CreatedInvitation, PeacePadCoordinationApi } from "../api/CoordinationApi";
import { RecordsStateProvider } from "../records/RecordsState";
import { createStagingCoordinationClient } from "../staging/StagingCoordinationClient";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import { CoordinationStateProvider } from "../coordination/CoordinationState";
import { AudioCallStateProvider } from "../calls/AudioCallState";
import type { AudioCallMediaRuntime } from "../calls/AudioCallMediaCoordinator";
import { LabButton } from "../components/LabButton";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { resolveFunctionInvocationRegion, type PeacePadEnvironmentConfig, type PeacePadSupabaseConfig } from "../config/environment";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { StagingAccountActionsProvider } from "../session/StagingAccountActions";
import { createWriteContext, type AcceptedInvitation, type InvitationPreview } from "../domain/v2";
import { colors, spacing, typography } from "../theme";
import { removeQueuedMessagesForFamily, secureMessageOutboxStore } from "../messaging/secureMessageOutbox";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { PublicOnboardingAuth } from "../auth/PublicOnboardingAuth";
import {
  currentDeviceNotificationState,
  disableDeviceNotifications,
  enableDeviceNotifications,
  type DeviceNotificationState
} from "../notifications/DevicePushRegistration";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function invitationCodeFromStagingUrl(url?: string | null, expectedProtocol = "peacepadnextlab:"): string | undefined {
  if (!url || url.trim() !== url) return undefined;
  try {
    const parsed = new URL(url);
    const code = parsed.pathname.match(/^\/([a-z0-9]{6})\/?$/i)?.[1];
    if (
      parsed.protocol !== expectedProtocol
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

class VerifiedSessionRequestError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, production: boolean) {
    super(production ? "PeacePad could not restore your session. Please sign in again." : "PeacePad could not restore this regional staging session.");
    this.name = "VerifiedSessionRequestError";
  }
}

type RuntimeState =
  | { status: "loading" }
  | { status: "membership-empty"; api: PeacePadCoordinationApi; verified: VerifiedSessionContext }
  | { status: "membership-selection"; api: PeacePadCoordinationApi; memberships: readonly Membership[]; verified: VerifiedSessionContext }
  | { status: "conversation-empty"; api: PeacePadCoordinationApi; membership: Membership; verified: VerifiedSessionContext }
  | { status: "ready"; api: PeacePadCoordinationApi; runtime: CoordinationRuntime; verified: VerifiedSessionContext }
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
  const { t } = useOptionalLocalization();
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
    const functionRegion = resolveFunctionInvocationRegion(config.apiBaseUrl);
    const response = await fetcher(`${config.apiBaseUrl}/api/v2/session`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-PeacePad-Region": config.region,
        "X-PeacePad-Schema-Version": "2.0",
        ...(functionRegion ? { "X-Region": functionRegion } : {})
      },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorCode = payload && typeof payload === "object" && "error" in payload
        && payload.error && typeof payload.error === "object" && "code" in payload.error
        && typeof payload.error.code === "string" ? payload.error.code : undefined;
      throw new VerifiedSessionRequestError(response.status, errorCode, config.environment === "production");
    }
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
  const { t } = useOptionalLocalization();
  const auth = useSupabaseSession();
  const audioMediaRuntime = useMemo<AudioCallMediaRuntime | undefined>(() => auth.realtimeClient ? {
    getAccessToken: auth.getAccessToken,
    realtimeClient: auth.realtimeClient,
    createMedia: async (iceServers, callbacks) => {
      const { NativeAudioMediaSession } = await import("../calls/NativeAudioMedia");
      return NativeAudioMediaSession.create(iceServers, callbacks);
    }
  } : undefined, [auth.getAccessToken, auth.realtimeClient]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const signInInFlight = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({ status: "loading" });
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [leaveFamilyBusy, setLeaveFamilyBusy] = useState(false);
  const [leaveFamilyError, setLeaveFamilyError] = useState<string>();
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string>();
  const [notificationStatus, setNotificationStatus] = useState<DeviceNotificationState | "busy">("not-enabled");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string>();

  const submitSignIn = useCallback(() => {
    const normalizedEmail = email.trim();
    if (signInInFlight.current || !normalizedEmail || !password) return;
    signInInFlight.current = true;
    setSignInBusy(true);
    void auth.signInWithPassword(normalizedEmail, password)
      .catch(() => undefined)
      .finally(() => {
        signInInFlight.current = false;
        setSignInBusy(false);
      });
  }, [auth, email, password]);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [incomingInvitationCode, setIncomingInvitationCode] = useState<string>();
  const [selectedFamilyCircleId, setSelectedFamilyCircleId] = useState<string>();
  const [pendingActivation, setPendingActivation] = useState<{ familyCircleId: string; conversationId: string }>();
  const generation = useRef(0);
  const deleteInFlight = useRef(false);
  const leaveFamilyInFlight = useRef(false);
  const activationInFlight = useRef<{
    familyCircleId: string;
    conversationId: string;
    resolve: () => void;
    reject: (cause: Error) => void;
  } | undefined>(undefined);
  const lastReadyIdentity = useRef<string | undefined>(undefined);
  const signOutSafely = useCallback(async () => {
    if (runtimeState.status === "ready") {
      await disableDeviceNotifications(runtimeState.api, runtimeState.runtime).catch(() => undefined);
    }
    await secureMessageOutboxStore.clear().catch(() => undefined);
    await auth.signOut();
  }, [auth.signOut, runtimeState]);

  const leaveVerifiedFamily = async (api: PeacePadCoordinationApi, runtime: CoordinationRuntime) => {
    if (leaveFamilyInFlight.current) return;
    leaveFamilyInFlight.current = true;
    setLeaveFamilyBusy(true);
    setLeaveFamilyError(undefined);
    try {
      await api.leaveFamily(runtime.familyCircleId, createWriteContext({
        actor: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId },
        expectedVersion: runtime.participantGrantVersion,
        idempotencyKey: `family-leave-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        region: runtime.region
      }));
      await removeQueuedMessagesForFamily(secureMessageOutboxStore, {
        actorIdentityId: runtime.actorIdentityId,
        familyCircleId: runtime.familyCircleId,
        region: runtime.region
      }).catch(() => undefined);
      setSelectedFamilyCircleId(undefined);
      setRuntimeState({ status: "loading" });
      setReloadVersion((value) => value + 1);
    } catch (cause) {
      setLeaveFamilyError(cause instanceof Error ? cause.message : "PeacePad could not leave this family.");
      throw cause;
    } finally {
      leaveFamilyInFlight.current = false;
      setLeaveFamilyBusy(false);
    }
  };

  useEffect(() => {
    if (runtimeState.status !== "ready") {
      setNotificationStatus("not-enabled");
      return;
    }
    let active = true;
    void currentDeviceNotificationState(runtimeState.runtime.actorIdentityId)
      .then((status) => { if (active) setNotificationStatus(status); })
      .catch(() => { if (active) setNotificationStatus("unavailable"); });
    return () => { active = false; };
  }, [runtimeState]);

  useEffect(() => {
    let mounted = true;
    let liveUrlReceived = false;
    const receive = (url?: string | null) => {
      const code = invitationCodeFromStagingUrl(url, supabase.environment === "production" ? "peacepad:" : "peacepadnextlab:");
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
        activationInFlight.current?.reject(new Error("The signed-in identity changed before family access was verified."));
        activationInFlight.current = undefined;
        setIncomingInvitationCode(undefined);
        setSelectedFamilyCircleId(undefined);
        setPendingActivation(undefined);
      }
      lastReadyIdentity.current = identityId;
      return;
    }
    if (auth.status === "signed-out" && lastReadyIdentity.current) {
      activationInFlight.current?.reject(new Error("Sign in again to verify the accepted family access."));
      activationInFlight.current = undefined;
      setIncomingInvitationCode(undefined);
      setSelectedFamilyCircleId(undefined);
      setPendingActivation(undefined);
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
      await secureMessageOutboxStore.clear().catch(() => undefined);
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
    if (auth.status !== "ready" || !auth.session || auth.authIntent === "password-recovery") {
      setRuntimeState({ status: "loading" });
      return;
    }
    if (!pendingActivation) setRuntimeState({ status: "loading" });
    void auth.getAccessToken().then(async (token) => {
      if (!token) throw new Error(supabase.environment === "production" ? "Your PeacePad session expired. Sign in again." : "The staging session expired.");
      const api = createStagingCoordinationClient(environment, auth.getAccessToken, fetcher);
      let verified: VerifiedSessionContext;
      try {
        verified = await fetchVerifiedSession(supabase, auth.session!.user.id, token, fetcher);
      } catch (error) {
        if (supabase.environment === "production" && error instanceof VerifiedSessionRequestError
          && error.status === 409 && error.code === "IDENTITY_NOT_BOUND") {
          if (!api.bootstrapIdentity) throw error;
          const metadata = auth.session!.user.user_metadata as Record<string, unknown> | undefined;
          const displayName = typeof metadata?.full_name === "string" ? metadata.full_name
            : typeof metadata?.name === "string" ? metadata.name
            : auth.session!.user.email?.split("@")[0] ?? "PeacePad member";
          await api.bootstrapIdentity(displayName, "ca");
          verified = await fetchVerifiedSession(supabase, auth.session!.user.id, token, fetcher);
        } else {
          throw error;
        }
      }
      if (currentGeneration !== generation.current) return;
      const memberships = [...verified.memberships].sort((left, right) => left.familyName.localeCompare(right.familyName) || left.familyCircleId.localeCompare(right.familyCircleId));
      if (!memberships.length) {
        if (pendingActivation) throw new Error("The accepted family access is not present in the refreshed session.");
        setRuntimeState({ status: "membership-empty", api, verified });
        return;
      }
      const requestedFamilyId = pendingActivation?.familyCircleId ?? selectedFamilyCircleId;
      if (!requestedFamilyId && memberships.length > 1) {
        setRuntimeState({ status: "membership-selection", api, memberships, verified });
        return;
      }
      const membership = requestedFamilyId
        ? memberships.find((item) => item.familyCircleId === requestedFamilyId)
        : memberships[0];
      if (!membership) throw new Error("The selected family is no longer authorized. Choose a family again.");
      const conversations = await api.listConversations(membership.familyCircleId);
      if (currentGeneration !== generation.current) return;
      const conversation = pendingActivation
        ? conversations.find((item) => item.id === pendingActivation.conversationId && item.status === "active")
        : conversations.find((item) => item.status === "active");
      if (pendingActivation && (!conversation || conversation.familyCircleId !== membership.familyCircleId || !conversation.participantIdentityIds.includes(verified.actor.identityId))) {
        throw new Error("PeacePad could not verify the newly accepted family conversation.");
      }
      if (!conversation) {
        setRuntimeState({ status: "conversation-empty", api, membership, verified });
        return;
      }
      setRuntimeState({
        status: "ready",
        api,
        verified,
        runtime: {
          actorIdentityId: verified.actor.identityId,
          identityVersion: verified.actor.version,
          sessionId: verified.actor.sessionId,
          familyCircleId: membership.familyCircleId,
          participantGrantId: membership.participantGrantId,
          participantGrantVersion: membership.version,
          conversationId: conversation.id,
          region: verified.region
        }
      });
      if (pendingActivation) {
        const activation = activationInFlight.current;
        if (!activation || activation.familyCircleId !== membership.familyCircleId || activation.conversationId !== conversation.id) {
          throw new Error("PeacePad could not match the accepted family activation request.");
        }
        activationInFlight.current = undefined;
        setPendingActivation(undefined);
        activation.resolve();
      }
    }).catch((error) => {
      if (currentGeneration !== generation.current) return;
      if (pendingActivation && activationInFlight.current) {
        const activation = activationInFlight.current;
        activationInFlight.current = undefined;
        setPendingActivation(undefined);
        activation.reject(error instanceof Error ? error : new Error("PeacePad could not verify the accepted family access."));
        return;
      }
      setRuntimeState({ status: "error", message: error instanceof Error ? error.message : "PeacePad staging is unavailable." });
    });
  }, [auth.authIntent, auth.getAccessToken, auth.session, auth.status, environment, fetcher, pendingActivation, reloadVersion, selectedFamilyCircleId, supabase]);

  if (auth.status === "loading") return <GateMessage busy title={t("runtime.restoringSession")} body={t("runtime.checkingDevice")} />;
  if (auth.status === "error") return <GateMessage title={t("runtime.sessionUnavailable")} body={auth.error ?? t("runtime.restoreError")} />;
  if (supabase.environment === "production" && auth.authIntent === "password-recovery") return <PublicOnboardingAuth />;
  if (auth.status === "signed-out") {
    if (supabase.environment === "production") return <PublicOnboardingAuth />;
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.signInKeyboard}>
        <ScrollView
          contentContainerStyle={styles.signInContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          testID="staging-sign-in-scroll"
        >
          <Brand />
          <AccessibleHeading style={styles.title}>{t("runtime.signInTitle")}</AccessibleHeading>
          <Text accessibilityRole="text" testID="staging-region-label" style={styles.regionLabel}>
            {t(supabase.region === "ca" ? "runtime.regionCanada" : "runtime.regionUnitedStates")}
          </Text>
          <Text style={styles.body}>{t("runtime.signInBody")}</Text>
          <TextInput
            accessibilityLabel={t("runtime.email")}
            autoCapitalize="none"
            autoComplete="username"
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() => passwordInput.current?.focus()}
            placeholder={t("runtime.emailPlaceholder")}
            returnKeyType="next"
            style={styles.input}
            textContentType="username"
            value={email}
          />
          <TextInput
            accessibilityLabel={t("runtime.password")}
            autoComplete="current-password"
            onChangeText={setPassword}
            onSubmitEditing={submitSignIn}
            placeholder={t("runtime.passwordPlaceholder")}
            ref={passwordInput}
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            submitBehavior="submit"
            textContentType="password"
            value={password}
          />
          <LabButton disabled={signInBusy || !email.trim() || !password} label={signInBusy ? t("runtime.signingIn") : t("runtime.signIn")} onPress={submitSignIn} />
          {auth.error ? <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
  if (runtimeState.status === "loading") return <GateMessage busy title={t("runtime.opening")} body={t("runtime.loadingAuthorized")} />;
  if (runtimeState.status === "membership-empty") return <FamilySetup accountDeletion={{ deleteAccount: () => deleteVerifiedAccount(runtimeState.api, runtimeState.verified.actor, runtimeState.verified.region), deleting: deleteBusy, error: deleteError }} api={runtimeState.api} initialInvitationCode={incomingInvitationCode} onInvitationCodeConsumed={() => setIncomingInvitationCode(undefined)} onReload={() => setReloadVersion((value) => value + 1)} onSignOut={signOutSafely} production={supabase.environment === "production"} verified={runtimeState.verified} />;
  if (runtimeState.status === "membership-selection") return <FamilySelection accountDeletion={{ deleteAccount: () => deleteVerifiedAccount(runtimeState.api, runtimeState.verified.actor, runtimeState.verified.region), deleting: deleteBusy, error: deleteError }} memberships={runtimeState.memberships} onSelect={(familyCircleId) => setSelectedFamilyCircleId(familyCircleId)} onSignOut={signOutSafely} />;
  if (runtimeState.status === "conversation-empty") return <ConversationSetup accountDeletion={{ deleteAccount: () => deleteVerifiedAccount(runtimeState.api, runtimeState.verified.actor, runtimeState.verified.region), deleting: deleteBusy, error: deleteError }} api={runtimeState.api} membership={runtimeState.membership} onReload={() => setReloadVersion((value) => value + 1)} onSignOut={signOutSafely} verified={runtimeState.verified} />;
  if (runtimeState.status === "error") return <GateMessage title={t("runtime.unavailable")} body={runtimeState.message} />;
  const accountActions = {
    signOut: signOutSafely,
    deleting: deleteBusy,
    error: deleteError,
    deleteAccount: () => deleteVerifiedAccount(runtimeState.api, {
      identityId: runtimeState.runtime.actorIdentityId,
      sessionId: runtimeState.runtime.sessionId,
      displayName: null,
      version: runtimeState.runtime.identityVersion
    }, runtimeState.runtime.region),
    displayName: runtimeState.verified.actor.displayName ?? "",
    updatingProfile: profileBusy,
    profileError,
    updateProfile: async (displayName: string) => {
      setProfileBusy(true);
      setProfileError(undefined);
      try {
        await runtimeState.api.updateProfile(displayName, runtimeWriteContext(runtimeState.verified, runtimeState.runtime.identityVersion));
        setReloadVersion((value) => value + 1);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : t("profile.error");
        setProfileError(message);
        throw cause;
      } finally {
        setProfileBusy(false);
      }
    },
    leaveFamily: () => leaveVerifiedFamily(runtimeState.api, runtimeState.runtime),
    leavingFamily: leaveFamilyBusy,
    leaveFamilyError,
    notificationStatus,
    enableNotifications: async () => {
      setNotificationStatus("busy");
      try {
        setNotificationStatus(await enableDeviceNotifications(runtimeState.api, runtimeState.runtime));
      } catch {
        setNotificationStatus("unavailable");
      }
    },
    disableNotifications: async () => {
      setNotificationStatus("busy");
      try {
        setNotificationStatus(await disableDeviceNotifications(runtimeState.api, runtimeState.runtime));
      } catch {
        setNotificationStatus("unavailable");
      }
    },
    exporting: exportBusy,
    exportError,
    exportAccount: async () => {
      setExportBusy(true);
      setExportError(undefined);
      try {
        return await runtimeState.api.prepareAccountExport(runtimeWriteContext(runtimeState.verified, runtimeState.runtime.identityVersion));
      } catch (cause) {
        setExportError(cause instanceof Error ? cause.message : t("account.exportError"));
        throw cause;
      } finally {
        setExportBusy(false);
      }
    }
  };
  return (
    <PendingStagingInvitationProvider code={incomingInvitationCode} onConsumed={() => setIncomingInvitationCode(undefined)}>
      <StagingAccountActionsProvider value={accountActions}>
        <CoordinationStateProvider api={runtimeState.api} onInvitationAccepted={async (result) => {
          assertAcceptedInvitation(result, runtimeState.runtime.actorIdentityId, runtimeState.runtime.region);
          if (activationInFlight.current) throw new Error("PeacePad is already verifying family access.");
          await new Promise<void>((resolve, reject) => {
            activationInFlight.current = {
              familyCircleId: result.grant.familyCircleId,
              conversationId: result.conversation.id,
              resolve,
              reject
            };
            setPendingActivation({ familyCircleId: result.grant.familyCircleId, conversationId: result.conversation.id });
            setSelectedFamilyCircleId(result.grant.familyCircleId);
          });
          setIncomingInvitationCode(undefined);
        }} runtime={runtimeState.runtime}>
          <AudioCallStateProvider api={runtimeState.api} mediaRuntime={audioMediaRuntime} runtime={runtimeState.runtime}>
            <RecordsStateProvider api={runtimeState.api} runtime={runtimeState.runtime}>
              {children}
            </RecordsStateProvider>
          </AudioCallStateProvider>
        </CoordinationStateProvider>
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

function assertAcceptedInvitation(result: AcceptedInvitation, identityId: string, region: "ca" | "us") {
  if (
    !UUID_PATTERN.test(result.grant.id)
    || result.grant.identityId !== identityId
    || result.grant.region !== region
    || !UUID_PATTERN.test(result.grant.familyCircleId)
    || !UUID_PATTERN.test(result.conversation.id)
    || result.conversation.region !== region
    || result.conversation.familyCircleId !== result.grant.familyCircleId
    || result.conversation.status !== "active"
    || !result.conversation.participantIdentityIds.includes(identityId)
    || !result.conversation.participantIdentityIds.includes(result.grant.grantedBy)
  ) throw new Error("PeacePad could not verify the accepted family access.");
}

function FamilySelection({ accountDeletion, memberships, onSelect, onSignOut }: {
  accountDeletion: { deleteAccount: () => Promise<void>; deleting: boolean; error?: string };
  memberships: readonly Membership[];
  onSelect: (familyCircleId: string) => void;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useOptionalLocalization();
  return (
    <View style={styles.page}>
      <Brand />
      <AccessibleHeading style={styles.title}>{t("runtime.chooseFamily")}</AccessibleHeading>
      <Text style={styles.body}>{t("runtime.chooseFamilyBody")}</Text>
      {memberships.map((membership) => (
        <LabButton
          key={membership.familyCircleId}
          label={t("runtime.familyOption", { family: membership.familyName, role: membership.role })}
          onPress={() => onSelect(membership.familyCircleId)}
          variant="secondary"
        />
      ))}
      <LabButton label={t("account.signOut")} onPress={() => void onSignOut()} variant="secondary" />
      <AccountDeletionControls value={accountDeletion} />
    </View>
  );
}

function FamilySetup({ accountDeletion, api, initialInvitationCode, onInvitationCodeConsumed, onReload, onSignOut, production, verified }: {
  accountDeletion: { deleteAccount: () => Promise<void>; deleting: boolean; error?: string };
  api: PeacePadCoordinationApi;
  initialInvitationCode?: string;
  onInvitationCodeConsumed: () => void;
  onReload: () => void;
  onSignOut: () => Promise<void>;
  production: boolean;
  verified: VerifiedSessionContext;
}) {
  const { t } = useOptionalLocalization();
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
      setError(cause instanceof Error ? cause.message : t("runtime.requestError"));
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.page}>
      <Brand />
      <AccessibleHeading style={styles.title}>{t("runtime.createJoin")}</AccessibleHeading>
      <Text style={styles.body}>{t("runtime.createJoinBody")}</Text>
      {production ? null : <>
        <Text style={styles.sectionTitle}>{t("runtime.createFamilyTitle")}</Text>
        <TextInput accessibilityLabel={t("runtime.familyName")} maxLength={120} onChangeText={setFamilyName} placeholder={t("runtime.familyName")} style={styles.input} value={familyName} />
      </>}
      <LabButton disabled={busy || (!production && !familyName.trim())} label={t(production ? "production.startPrivate" : "runtime.createFamily")} onPress={() => void run(async () => {
        await api.createFamily(production ? "Private PeacePad" : familyName, runtimeWriteContext(verified));
        onReload();
      })} />
      <Text style={styles.sectionTitle}>{t(production ? "production.connectInvitation" : "runtime.enterInvite")}</Text>
      <TextInput accessibilityLabel={t("invite.code")} autoCapitalize="characters" maxLength={6} onChangeText={(value) => {
        setInvitationCode(value.replace(/[^a-z0-9]/gi, "").toUpperCase());
        setPreview(undefined);
      }} placeholder={t("runtime.codePlaceholder")} style={styles.input} value={invitationCode} />
      {preview ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{preview.familyDisplayName}</Text>
          <Text style={styles.body}>{t("runtime.invitedAs", { name: preview.inviterDisplayName, role: preview.invitedRole })}</Text>
          <LabButton disabled={busy} label={t("invite.accept")} onPress={() => void run(async () => {
            const result = await api.acceptInvitation(preview.invitationId, runtimeWriteContext(verified, preview.version));
            assertAcceptedInvitation(result, verified.actor.identityId, verified.region);
            onReload();
          })} />
          <LabButton disabled={busy} label={t("runtime.declineInvite")} onPress={() => void run(async () => {
            await api.declineInvitation(preview.invitationId, runtimeWriteContext(verified, preview.version));
            setPreview(undefined);
            setInvitationCode("");
          })} variant="secondary" />
        </View>
      ) : <LabButton disabled={busy || invitationCode.length !== 6} label={t("invite.review")} onPress={() => void run(async () => {
        setPreview(await api.resolveInvitation(invitationCode));
        onInvitationCodeConsumed();
      })} variant="secondary" />}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <LabButton disabled={busy} label={t("account.signOut")} onPress={() => void onSignOut()} variant="secondary" />
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
  const { t } = useOptionalLocalization();
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
        permissions: ["messages", "calendar", "shared-records", "calls"]
      }, runtimeWriteContext(verified));
      setCreatedInvitation(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("runtime.requestError"));
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.page}>
      <Brand />
      <AccessibleHeading style={styles.title}>{t("invite.createTitle")}</AccessibleHeading>
      <Text style={styles.body}>{t("runtime.connectionReady", { family: membership.familyName })}</Text>
      {createdInvitation ? <View style={styles.codeCard}><Text accessibilityLabel={t("invite.code")} selectable style={styles.code}>{createdInvitation.code}</Text><Text style={styles.body}>{t("runtime.inviteExpiry")}</Text></View> : null}
      {createdInvitation ? <LabButton disabled={busy} label={t("invite.cancel")} onPress={() => void (async () => {
        setBusy(true);
        setError(undefined);
        try {
          await api.revokeInvitation(createdInvitation.invitation.id, runtimeWriteContext(verified, createdInvitation.invitation.version));
          setCreatedInvitation(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : t("runtime.requestError"));
        } finally { setBusy(false); }
      })()} variant="secondary" /> : <LabButton disabled={busy} label={t("invite.create")} onPress={() => void createInvitation()} />}
      <LabButton disabled={busy} label={t("runtime.checkConnection")} onPress={onReload} variant="secondary" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <LabButton disabled={busy} label={t("account.signOut")} onPress={() => void onSignOut()} variant="secondary" />
      <AccountDeletionControls value={accountDeletion} />
    </View>
  );
}

function AccountDeletionControls({ value }: {
  value: { deleteAccount: () => Promise<void>; deleting: boolean; error?: string };
}) {
  const { t } = useOptionalLocalization();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <LabButton label={t("account.delete")} onPress={() => setConfirming(true)} variant="secondary" />;
  }
  return (
    <View accessibilityRole="alert" accessibilityViewIsModal style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{t("account.deleteTitle")}</Text>
      <Text style={styles.body}>{t("account.deleteWarning")}</Text>
      <LabButton disabled={value.deleting} label={value.deleting ? t("account.deleting") : t("account.deletePermanently")} onPress={() => void value.deleteAccount().catch(() => undefined)} />
      <LabButton disabled={value.deleting} label={t("account.cancel")} onPress={() => setConfirming(false)} variant="secondary" />
      {value.error ? <Text accessibilityRole="alert" style={styles.error}>{value.error}</Text> : null}
    </View>
  );
}

function Brand() {
  const { t } = useOptionalLocalization();
  return <View style={styles.brand}><Image accessibilityLabel={t("runtime.logo")} source={require("../foundation/peacepad-conch.png")} style={styles.logo} /><Text style={styles.brandName}>PeacePad</Text></View>;
}

function GateMessage({ busy = false, body, onSignOut, title }: { busy?: boolean; body: string; onSignOut?: () => Promise<void>; title: string }) {
  const { t } = useOptionalLocalization();
  return <View style={styles.page}><Brand />{busy ? <ActivityIndicator color={colors.brand} /> : null}<AccessibleHeading style={styles.title}>{title}</AccessibleHeading><Text accessibilityLiveRegion={busy ? "polite" : "none"} style={styles.body}>{body}</Text>{onSignOut ? <LabButton label={t("account.signOut")} onPress={() => void onSignOut()} variant="secondary" /> : null}</View>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  signInKeyboard: { backgroundColor: colors.background, flex: 1 },
  signInContent: { flexGrow: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  brand: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  logo: { height: 52, width: 52 },
  brandName: { color: colors.text, fontSize: 24, fontWeight: "800" },
  title: { color: colors.text, fontSize: 32, fontWeight: "700" },
  regionLabel: { color: colors.brand, fontSize: 16, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 16, padding: spacing.md },
  error: { color: colors.dangerText, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  codeCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  code: { color: colors.brand, fontSize: 34, fontWeight: "800", letterSpacing: 8 }
});
