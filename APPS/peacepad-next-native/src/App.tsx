import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { NavigationContainer, useNavigation, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
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
import { FoundationScreen } from "./foundation/FoundationScreen";
import { RecordsStateProvider } from "./records/RecordsState";
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

export function PeacePadCoordinationApp({ startScreen }: { startScreen?: string }) {
  return (
    <RecordsStateProvider>
    <NavigationContainer linking={startScreen ? undefined : peacePadLinking}>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator initialRouteName={resolveStartScreen(startScreen ?? process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_SCREEN)} screenOptions={{ headerShown: false }}>
        {(["foundation", "home", "messages", "calendar", "invite", "records", "more"] as const).map((name) => (
          <Stack.Screen key={name} name={name}>
            {({ route }) => <CoordinationRoute activeScreen={name} invitationCode={route.params?.code} />}
          </Stack.Screen>
        ))}
      </Stack.Navigator>
    </NavigationContainer>
    </RecordsStateProvider>
  );
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
      return <FoundationScreen />;
    }
    return this.props.children;
  }
}

export default function App() {
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

function CoordinationRoute({ activeScreen, invitationCode }: { activeScreen: AppScreen; invitationCode?: string }) {
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
          {activeScreen === "records" ? <RecordsHomeScreen setScreen={setScreen} /> : null}
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
  content: { flexGrow: 1, padding: spacing.lg }
});
