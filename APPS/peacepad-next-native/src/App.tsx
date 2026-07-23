import React, { useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet } from "react-native";
import { ScreenTabs } from "./components/ScreenTabs";
import {
  ComposeScreen,
  HomeScreen,
  LabScreen,
  LogsScreen,
  OnboardingScreen,
  TimelineScreen,
  VaultScreen
} from "./screens";
import { colors, spacing } from "./theme";

export default function App() {
  const [screen, setScreen] = useState<LabScreen>("home");
  const [selectedGoal, setSelectedGoal] = useState("calm-next-message");
  const [draft, setDraft] = useState("I need the pickup time confirmed because the last change was confusing.");

  const screenProps = {
    draft,
    selectedGoal,
    setDraft,
    setScreen,
    setSelectedGoal
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenTabs active={screen} onSelect={setScreen} />
        {screen === "home" ? <HomeScreen {...screenProps} /> : null}
        {screen === "onboarding" ? <OnboardingScreen {...screenProps} /> : null}
        {screen === "compose" ? <ComposeScreen {...screenProps} /> : null}
        {screen === "logs" ? <LogsScreen {...screenProps} /> : null}
        {screen === "vault" ? <VaultScreen {...screenProps} /> : null}
        {screen === "timeline" ? <TimelineScreen {...screenProps} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: spacing.lg,
    gap: spacing.lg
  }
});
