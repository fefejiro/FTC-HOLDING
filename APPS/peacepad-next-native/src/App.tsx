import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FoundationScreen } from "./foundation/FoundationScreen";
import { colors, spacing, typography } from "./theme";

type BoundaryState = { failed: boolean };

export class PeacePadErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Native crash reporting is intentionally not connected in this isolated foundation.
  }

  render() {
    if (this.state.failed) {
      return (
        <View accessibilityRole="alert" style={styles.boundary}>
          <Text style={styles.boundaryTitle}>PeacePad could not open this screen.</Text>
          <Text style={styles.boundaryBody}>Close and reopen the app to try again.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function PeacePadFoundationApp() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FoundationScreen />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <PeacePadErrorBoundary>
      <PeacePadFoundationApp />
    </PeacePadErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg },
  boundary: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.background
  },
  boundaryTitle: { ...typography.heading, color: colors.text },
  boundaryBody: { ...typography.body, color: colors.muted }
});
