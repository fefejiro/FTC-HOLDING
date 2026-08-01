import React, { useMemo, useState } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskNavigation, type PrimaryTaskScreen } from "./components/TaskNavigation";
import { FoundationScreen } from "./foundation/FoundationScreen";
import {
  ComposeScreen,
  BinderScreen,
  EvidenceDetailScreen,
  LabScreen,
  LogsScreen,
  OnboardingScreen,
  TimelineScreen,
  VaultScreen,
  ExportScreen
} from "./screens";
import {
  CalendarScreen,
  CoordinationHomeScreen,
  InvitationScreen,
  MessagesScreen,
  MoreScreen,
  RecordsHomeScreen
} from "./coordination/CoordinationScreens";
import { CoordinationStateProvider } from "./coordination/CoordinationState";
import { LabStateProvider, useLabState } from "./state/LabState";
import { colors, spacing } from "./theme";

export type AppScreen = LabScreen | "foundation";

type RootStackParamList = Record<AppScreen, undefined>;

const Stack = createNativeStackNavigator<RootStackParamList>();

declare const process: {
  env?: Record<string, string | undefined>;
};

export function resolveLabStartScreen(value?: string): AppScreen {
  const supportedScreens = new Set<AppScreen>([
    "foundation",
    "home",
    "messages",
    "calendar",
    "invite",
    "records",
    "more",
    "onboarding",
    "binder",
    "compose",
    "logs",
    "vault",
    "evidence-detail",
    "timeline",
    "export"
  ]);

  if (value && supportedScreens.has(value as AppScreen)) return value as AppScreen;
  return "foundation";
}

const screenTitles: Record<AppScreen, string> = {
  foundation: "PeacePad",
  home: "PeacePad",
  messages: "Messages",
  calendar: "Calendar",
  invite: "Invitation",
  records: "Records",
  more: "More",
  onboarding: "Goal Setup",
  binder: "Create a binder",
  compose: "Check your message",
  logs: "Calls and parenting time",
  vault: "Add record details",
  "evidence-detail": "Record details",
  timeline: "Timeline",
  export: "Export Preview"
};

type SharedScreenProps = {
  draft: string;
  setDraft: (draft: string) => void;
};

export function PeacePadLabApp({ startScreen }: { startScreen?: string }) {
  const [draft, setDraft] = useState("I need the pickup time confirmed because the last change was confusing.");
  const { selectedGoal, selectGoal } = useLabState();

  const sharedProps = useMemo(
    () => ({
      draft,
      selectedGoal,
      setDraft,
      setSelectedGoal: selectGoal
    }),
    [draft, selectedGoal, selectGoal]
  );

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator
        initialRouteName={resolveLabStartScreen(startScreen ?? process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_SCREEN)}
        screenOptions={{
          contentStyle: styles.screen,
          headerBackTitle: "Back",
          headerShadowVisible: false,
          headerStyle: styles.header,
          headerTintColor: colors.brand,
          headerTitleStyle: styles.headerTitle
        }}
      >
        {(Object.keys(screenTitles) as AppScreen[]).map((routeName) => (
          <Stack.Screen key={routeName} name={routeName} options={{ title: screenTitles[routeName] }}>
            {() => <LabRoute activeScreen={routeName} {...sharedProps} />}
          </Stack.Screen>
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <CoordinationStateProvider>
      <LabStateProvider>
        <PeacePadLabApp />
      </LabStateProvider>
    </CoordinationStateProvider>
  );
}

function LabRoute({
  activeScreen,
  draft,
  selectedGoal,
  setDraft,
  setSelectedGoal
}: SharedScreenProps & {
  activeScreen: AppScreen;
  selectedGoal: ReturnType<typeof useLabState>["selectedGoal"];
  setSelectedGoal: ReturnType<typeof useLabState>["selectGoal"];
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setScreen = (screen: LabScreen) => navigation.navigate(screen);
  const primaryScreen: PrimaryTaskScreen =
    activeScreen === "messages" || activeScreen === "calendar" || activeScreen === "records" || activeScreen === "more"
      ? activeScreen
      : activeScreen === "home" || activeScreen === "invite"
        ? "home"
        : "records";

  const screenProps = {
    draft,
    selectedGoal,
    setDraft,
    setScreen,
    setSelectedGoal
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.container}>
          {activeScreen === "foundation" ? <FoundationScreen onOpenLab={() => setScreen("home")} /> : null}
          {activeScreen === "home" ? <CoordinationHomeScreen setScreen={setScreen} /> : null}
          {activeScreen === "messages" ? <MessagesScreen /> : null}
          {activeScreen === "calendar" ? <CalendarScreen /> : null}
          {activeScreen === "invite" ? <InvitationScreen /> : null}
          {activeScreen === "records" ? <RecordsHomeScreen setScreen={setScreen} /> : null}
          {activeScreen === "more" ? <MoreScreen setScreen={setScreen} /> : null}
          {activeScreen === "onboarding" ? <OnboardingScreen {...screenProps} /> : null}
          {activeScreen === "binder" ? <BinderScreen {...screenProps} /> : null}
          {activeScreen === "compose" ? <ComposeScreen {...screenProps} /> : null}
          {activeScreen === "logs" ? <LogsScreen {...screenProps} /> : null}
          {activeScreen === "vault" ? <VaultScreen {...screenProps} /> : null}
          {activeScreen === "evidence-detail" ? <EvidenceDetailScreen {...screenProps} /> : null}
          {activeScreen === "timeline" ? <TimelineScreen {...screenProps} /> : null}
          {activeScreen === "export" ? <ExportScreen {...screenProps} /> : null}
        </ScrollView>
        {activeScreen !== "foundation" ? <TaskNavigation active={primaryScreen} onSelect={setScreen} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background
  },
  header: {
    backgroundColor: colors.background
  },
  headerTitle: {
    color: colors.text,
    fontFamily: undefined,
    fontSize: 17,
    fontWeight: "800"
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  shell: {
    flex: 1
  },
  container: {
    padding: spacing.lg,
    gap: spacing.lg
  }
});
