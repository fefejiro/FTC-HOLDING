import React, { useMemo, useState } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenTabs } from "./components/ScreenTabs";
import {
  ComposeScreen,
  BinderScreen,
  EvidenceDetailScreen,
  HomeScreen,
  LabScreen,
  LogsScreen,
  OnboardingScreen,
  TimelineScreen,
  VaultScreen,
  ExportScreen
} from "./screens";
import { LabStateProvider, useLabState } from "./state/LabState";
import { colors, spacing } from "./theme";

type RootStackParamList = Record<LabScreen, undefined>;

const Stack = createNativeStackNavigator<RootStackParamList>();

declare const process: {
  env?: Record<string, string | undefined>;
};

export function resolveLabStartScreen(value?: string): LabScreen {
  return value === "evidence-detail" ? "evidence-detail" : "home";
}

const screenTitles: Record<LabScreen, string> = {
  home: "PeacePad Premium",
  onboarding: "Goal Setup",
  binder: "Case Binder",
  compose: "Calm Compose",
  logs: "Parenting Logs",
  vault: "Evidence Vault",
  "evidence-detail": "Evidence Detail",
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
        {(Object.keys(screenTitles) as LabScreen[]).map((routeName) => (
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
    <LabStateProvider>
      <PeacePadLabApp />
    </LabStateProvider>
  );
}

function LabRoute({
  activeScreen,
  draft,
  selectedGoal,
  setDraft,
  setSelectedGoal
}: SharedScreenProps & {
  activeScreen: LabScreen;
  selectedGoal: ReturnType<typeof useLabState>["selectedGoal"];
  setSelectedGoal: ReturnType<typeof useLabState>["selectGoal"];
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setScreen = (screen: LabScreen) => navigation.navigate(screen);

  const screenProps = {
    draft,
    selectedGoal,
    setDraft,
    setScreen,
    setSelectedGoal
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenTabs active={activeScreen} onSelect={setScreen} />
        {activeScreen === "home" ? <HomeScreen {...screenProps} /> : null}
        {activeScreen === "onboarding" ? <OnboardingScreen {...screenProps} /> : null}
        {activeScreen === "binder" ? <BinderScreen {...screenProps} /> : null}
        {activeScreen === "compose" ? <ComposeScreen {...screenProps} /> : null}
        {activeScreen === "logs" ? <LogsScreen {...screenProps} /> : null}
        {activeScreen === "vault" ? <VaultScreen {...screenProps} /> : null}
        {activeScreen === "evidence-detail" ? <EvidenceDetailScreen {...screenProps} /> : null}
        {activeScreen === "timeline" ? <TimelineScreen {...screenProps} /> : null}
        {activeScreen === "export" ? <ExportScreen {...screenProps} /> : null}
      </ScrollView>
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
  container: {
    padding: spacing.lg,
    gap: spacing.lg
  }
});
