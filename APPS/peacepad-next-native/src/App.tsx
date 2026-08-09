import React, { Component, useMemo, type ErrorInfo, type ReactNode } from "react";
import { NavigationContainer, useNavigation, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TaskNavigation, type PrimaryTaskScreen } from "./components/TaskNavigation";
import {
  CalendarScreen,
  CoordinationHomeScreen,
  InvitationScreen,
  MessagesScreen,
  MoreScreen,
  RecordsHomeScreen,
  type CoordinationScreen
} from "./coordination/CoordinationScreens";
import { CoordinationStateProvider } from "./coordination/CoordinationState";
import { environmentConfig, resolveSupabaseStagingConfig } from "./config/environment";
import { FoundationScreen } from "./foundation/FoundationScreen";
import { RecordsStateProvider } from "./records/RecordsState";
import { PeacePadStagingRuntime } from "./runtime/PeacePadStagingRuntime";
import { createPeacePadSupabaseClient, SupabaseSessionProvider } from "./session/SupabaseSessionProvider";
import { colors, spacing } from "./theme";

export type AppScreen = "foundation" | CoordinationScreen;
type RootStackParamList = Record<AppScreen, { code?: string } | undefined>;
const Stack = createNativeStackNavigator<RootStackParamList>();

export const peacePadLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ["peacepadnextlab://"],
  config: { screens: { invite: "invite/:code" } }
};

declare const process: { env?: Record<string, string | undefined> };

export function resolveStartScreen(value?: string): AppScreen {
  const supported = new Set<AppScreen>(["foundation", "home", "messages", "calendar", "invite", "records", "more"]);
  return value && supported.has(value as AppScreen) ? value as AppScreen : "foundation";
}

export function PeacePadCoordinationApp({ recordsConnected = true, startScreen }: { recordsConnected?: boolean; startScreen?: string }) {
  const content = (
    <NavigationContainer linking={startScreen ? undefined : peacePadLinking}>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator initialRouteName={resolveStartScreen(startScreen ?? process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_SCREEN)} screenOptions={{ headerShown: false }}>
        {(["foundation", "home", "messages", "calendar", "invite", "records", "more"] as const).map((name) => (
          <Stack.Screen key={name} name={name}>
            {({ route }) => <CoordinationRoute activeScreen={name} invitationCode={route.params?.code} recordsConnected={recordsConnected} />}
          </Stack.Screen>
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
  return recordsConnected ? <RecordsStateProvider>{content}</RecordsStateProvider> : content;
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
      return environmentConfig.environment === "staging"
        ? <View style={styles.unavailable}><Text style={styles.unavailableTitle}>PeacePad is unavailable</Text><Text style={styles.unavailableBody}>The staging configuration could not be verified.</Text></View>
        : <FoundationScreen />;
    }
    return this.props.children;
  }
}

export default function App() {
  if (environmentConfig.environment === "staging") {
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

function PeacePadStagingApp() {
  const staging = useMemo(() => resolveSupabaseStagingConfig(), []);
  const client = useMemo(() => createPeacePadSupabaseClient(staging), [staging]);
  return (
    <SafeAreaProvider>
      <SupabaseSessionProvider client={client}>
        <PeacePadStagingRuntime environment={environmentConfig} supabase={staging}>
          <PeacePadCoordinationApp recordsConnected={false} startScreen="home" />
        </PeacePadStagingRuntime>
      </SupabaseSessionProvider>
    </SafeAreaProvider>
  );
}

function CoordinationRoute({ activeScreen, invitationCode, recordsConnected }: { activeScreen: AppScreen; invitationCode?: string; recordsConnected: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setScreen = (screen: CoordinationScreen) => navigation.navigate(screen);
  const primary: PrimaryTaskScreen = activeScreen === "invite" || activeScreen === "foundation" ? "home" : activeScreen;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {activeScreen === "foundation" ? <FoundationScreen onOpenLab={() => setScreen("home")} /> : null}
          {activeScreen === "home" ? <CoordinationHomeScreen setScreen={setScreen} /> : null}
          {activeScreen === "messages" ? <MessagesScreen /> : null}
          {activeScreen === "calendar" ? <CalendarScreen /> : null}
          {activeScreen === "invite" ? <InvitationScreen initialCode={invitationCode} /> : null}
          {activeScreen === "records" ? recordsConnected
            ? <RecordsHomeScreen setScreen={setScreen} />
            : <View style={styles.unavailable}><Text style={styles.unavailableTitle}>Records are not connected yet</Text><Text style={styles.unavailableBody}>Your signed-in family space is protected. Records will open only after they use the same verified regional account.</Text></View>
            : null}
          {activeScreen === "more" ? <MoreScreen setScreen={setScreen} /> : null}
        </ScrollView>
        {activeScreen !== "foundation" ? <TaskNavigation active={primary} onSelect={setScreen} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  shell: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg },
  unavailable: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.xl },
  unavailableTitle: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing.sm },
  unavailableBody: { color: colors.muted, fontSize: 16 }
});
