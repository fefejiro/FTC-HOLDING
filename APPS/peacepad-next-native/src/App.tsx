import React, { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { NavigationContainer, useNavigation, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TaskNavigation, type PrimaryTaskScreen } from "./components/TaskNavigation";
import {
  CalendarScreen,
  CoordinationHomeScreen,
  ActivitySuggestionsScreen,
  InvitationScreen,
  MessagesScreen,
  MoreScreen,
  RecordsHomeScreen,
  ParentingTasksScreen,
  type CoordinationScreen
} from "./coordination/CoordinationScreens";
import { CoordinationStateProvider, useCoordinationState } from "./coordination/CoordinationState";
import { environmentConfig, resolveSupabaseRuntimeDirectory, type PeacePadSupabaseConfig } from "./config/environment";
import { StagingRegionGate } from "./config/StagingRegionGate";
import { FoundationScreen } from "./foundation/FoundationScreen";
import { LocalizationProvider } from "./localization/LocalizationProvider";
import { RecordsStateProvider } from "./records/RecordsState";
import { PeacePadStagingRuntime, usePendingStagingInvitation } from "./runtime/PeacePadStagingRuntime";
import { createPeacePadSupabaseClient, SupabaseSessionProvider } from "./session/SupabaseSessionProvider";
import { colors, spacing } from "./theme";
import { AudioCallScreen } from "./calls/AudioCallScreen";
import { AudioCallStateProvider } from "./calls/AudioCallState";
import * as Notifications from "expo-notifications";
import { isIncomingCallNotificationResponse } from "./notifications/NotificationNavigation";
import { ParentCoreHubScreen } from "./parentCore/ParentCoreScreens";
import { ParentCoreStateProvider } from "./parentCore/ParentCoreState";

export type AppScreen = "foundation" | CoordinationScreen;
type RootStackParamList = Record<AppScreen, { activityTitle?: string; code?: string } | undefined>;
const Stack = createNativeStackNavigator<RootStackParamList>();

export const peacePadLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ["peacepadnextlab://"],
  config: { screens: { invite: "invite/:code" } }
};

declare const process: { env?: Record<string, string | undefined> };

export function resolveStartScreen(value?: string): AppScreen {
  const supported = new Set<AppScreen>(["foundation", "home", "messages", "calendar", "activities", "tasks", "invite", "records", "calls", "family", "more"]);
  return value && supported.has(value as AppScreen) ? value as AppScreen : "foundation";
}

export function PeacePadCoordinationApp({ startScreen, wrapLocalization = true, wrapRecordsProvider = true, wrapAudioCallProvider = true, wrapParentCoreProvider = true }: { startScreen?: string; wrapLocalization?: boolean; wrapRecordsProvider?: boolean; wrapAudioCallProvider?: boolean; wrapParentCoreProvider?: boolean }) {
  const content = (
    <NavigationContainer linking={startScreen ? undefined : peacePadLinking}>
      <StatusBar barStyle="dark-content" />
      <NotificationNavigationBridge />
      <Stack.Navigator initialRouteName={resolveStartScreen(startScreen ?? process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_SCREEN)} screenOptions={{ headerShown: false }}>
        {(["foundation", "home", "messages", "calendar", "activities", "tasks", "invite", "records", "calls", "family", "more"] as const).map((name) => (
          <Stack.Screen key={name} name={name}>
            {({ route }) => <CoordinationRoute activeScreen={name} activityTitle={route.params?.activityTitle} invitationCode={route.params?.code} />}
          </Stack.Screen>
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
  const localized = wrapLocalization ? <LocalizationProvider>{content}</LocalizationProvider> : content;
  const withParentCore = wrapParentCoreProvider ? <ParentCoreStateProvider>{localized}</ParentCoreStateProvider> : localized;
  const withRecords = wrapRecordsProvider ? <RecordsStateProvider>{withParentCore}</RecordsStateProvider> : withParentCore;
  return wrapAudioCallProvider ? <AudioCallStateProvider>{withRecords}</AudioCallStateProvider> : withRecords;
}

type BoundaryState = { failed: boolean };

export class PeacePadErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Crash reporting is deliberately disconnected in the isolated client.
  }

  render() {
    if (this.state.failed) {
      return environmentConfig.environment !== "lab"
        ? <View style={styles.unavailable}><Text style={styles.unavailableTitle}>PeacePad is unavailable</Text><Text style={styles.unavailableBody}>The secure service configuration could not be verified.</Text></View>
        : <FoundationScreen />;
    }
    return this.props.children;
  }
}

export default function App() {
  if (environmentConfig.environment !== "lab") {
    return <PeacePadErrorBoundary><PeacePadStagingApp /></PeacePadErrorBoundary>;
  }
  return (
    <PeacePadErrorBoundary>
      <SafeAreaProvider>
        <CoordinationStateProvider>
          <PeacePadCoordinationApp />
        </CoordinationStateProvider>
      </SafeAreaProvider>
    </PeacePadErrorBoundary>
  );
}

function PendingInvitationNavigation() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const invitation = usePendingStagingInvitation();
  useEffect(() => {
    const code = invitation.claim();
    if (!code) return;
    navigation.navigate("invite", { code });
  }, [invitation.claim, invitation.code, navigation]);
  return null;
}

function PeacePadStagingApp() {
  const directory = useMemo(() => resolveSupabaseRuntimeDirectory(), []);
  const production = directory.length === 1 && directory[0].environment === "production";
  return (
    <LocalizationProvider production={production}>
      <SafeAreaProvider>
        <PeacePadStagingRegionRouter directory={directory} />
      </SafeAreaProvider>
    </LocalizationProvider>
  );
}

export function PeacePadStagingRegionRouter({ directory }: { directory: readonly PeacePadSupabaseConfig[] }) {
  const [staging, setStaging] = useState<PeacePadSupabaseConfig | undefined>(() => directory.length === 1 ? directory[0] : undefined);
  if (!staging) return <StagingRegionGate configs={directory} onSelect={setStaging} />;
  return <SelectedPeacePadStagingApp staging={staging} />;
}

function SelectedPeacePadStagingApp({ staging }: { staging: PeacePadSupabaseConfig }) {
  const client = useMemo(() => createPeacePadSupabaseClient(staging), [staging]);
  const selectedEnvironment = useMemo(() => ({ ...environmentConfig, apiBaseUrl: staging.apiBaseUrl }), [staging]);
  return (
    <SupabaseSessionProvider client={client}>
      <PeacePadStagingRuntime environment={selectedEnvironment} supabase={staging}>
        <PeacePadCoordinationApp startScreen="home" wrapLocalization={false} wrapRecordsProvider={false} wrapAudioCallProvider={false} wrapParentCoreProvider={false} />
      </PeacePadStagingRuntime>
    </SupabaseSessionProvider>
  );
}

function CoordinationRoute({ activeScreen, activityTitle, invitationCode }: { activeScreen: AppScreen; activityTitle?: string; invitationCode?: string }) {
  const { connected } = useCoordinationState();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const pendingScrollReset = useRef(false);
  const setScreen = (screen: CoordinationScreen) => navigation.navigate(screen);
  const resetScroll = useCallback(() => {
    pendingScrollReset.current = true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ animated: false, y: 0 });
    });
  }, []);
  const settleScrollReset = useCallback(() => {
    if (!pendingScrollReset.current) return;
    pendingScrollReset.current = false;
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, []);
  const primary: PrimaryTaskScreen = activeScreen === "activities" || activeScreen === "tasks" || activeScreen === "invite" || activeScreen === "foundation" || activeScreen === "calls" || activeScreen === "family" || (!connected && activeScreen === "messages") ? "home" : activeScreen;
  return (
    <SafeAreaView style={styles.safe}>
      <PendingInvitationNavigation />
      <View style={styles.shell}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onContentSizeChange={settleScrollReset}>
          {activeScreen === "foundation" ? <FoundationScreen onOpenLab={() => setScreen("home")} onPhaseChange={resetScroll} /> : null}
          {activeScreen === "home" ? <CoordinationHomeScreen setScreen={setScreen} /> : null}
          {activeScreen === "messages" ? connected ? <MessagesScreen /> : <ConnectionRequiredScreen setScreen={setScreen} /> : null}
          {activeScreen === "calendar" ? <CalendarScreen initialEventTitle={activityTitle} /> : null}
          {activeScreen === "activities" ? <ActivitySuggestionsScreen onPlanActivity={(title) => navigation.navigate("calendar", { activityTitle: title })} /> : null}
          {activeScreen === "tasks" ? <ParentingTasksScreen /> : null}
          {activeScreen === "invite" ? <InvitationScreen initialCode={invitationCode} /> : null}
          {activeScreen === "records" ? <RecordsHomeScreen setScreen={setScreen} /> : null}
          {activeScreen === "calls" ? connected ? <AudioCallScreen /> : <ConnectionRequiredScreen setScreen={setScreen} /> : null}
          {activeScreen === "family" ? <ParentCoreHubScreen /> : null}
          {activeScreen === "more" ? <MoreScreen setScreen={setScreen} /> : null}
        </ScrollView>
        {activeScreen !== "foundation" ? <TaskNavigation active={primary} available={connected ? undefined : ["home", "calendar", "records", "more"]} onSelect={setScreen} /> : null}
      </View>
    </SafeAreaView>
  );
}

/**
 * Routes a tapped incoming-call notification into the authenticated calls
 * screen. The calls runtime remains the authority for authorization and
 * current-call state; this bridge never starts media by itself.
 */
function NotificationNavigationBridge() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleResponse = useCallback((response: Notifications.NotificationResponse | null | undefined) => {
    if (isIncomingCallNotificationResponse(response)) navigation.navigate("calls");
  }, [navigation]);

  useEffect(() => {
    let mounted = true;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (mounted) handleResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (mounted) handleResponse(response);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [handleResponse]);
  return null;
}

function ConnectionRequiredScreen({ setScreen }: { setScreen: (screen: CoordinationScreen) => void }) {
  return <View style={styles.connectionRequired}>
    <Text accessibilityRole="header" style={styles.connectionRequiredTitle}>Connect another parent first</Text>
    <Text style={styles.connectionRequiredBody}>Your private calendar and records are ready. Messages and calls become available after the other parent accepts an invitation.</Text>
    <Text accessibilityRole="button" onPress={() => setScreen("invite")} style={styles.connectionRequiredLink}>Invite another parent</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  shell: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg },
  unavailable: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.xl },
  unavailableTitle: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing.sm },
  unavailableBody: { color: colors.muted, fontSize: 16 },
  connectionRequired: { backgroundColor: "#FFE4D6", borderColor: "#F2A791", borderRadius: 28, borderWidth: 1, flex: 1, gap: spacing.md, justifyContent: "center", margin: spacing.lg, padding: spacing.xl },
  connectionRequiredTitle: { color: colors.text, fontSize: 24, fontWeight: "800" },
  connectionRequiredBody: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  connectionRequiredLink: { color: colors.coral, fontSize: 16, fontWeight: "900" }
});
