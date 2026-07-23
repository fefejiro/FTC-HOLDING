import React from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { premiumModules, timelineItems } from "./data/mockPeacePad";
import { ModuleCard } from "./components/ModuleCard";
import { TimelineItemCard } from "./components/TimelineItemCard";
import { colors, spacing, typography } from "./theme";

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PeacePad Next Lab</Text>
          <Text style={styles.title}>Communicate calmly. Keep the record. Protect parenting time.</Text>
          <Text style={styles.body}>
            A mock-data React Native prototype for testing Premium onboarding, parenting logs, evidence organization,
            and source-linked timelines without touching the submitted App Store build.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium modules to test</Text>
          {premiumModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Source-linked timeline concept</Text>
          {timelineItems.map((item) => (
            <TimelineItemCard key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.guardrail}>
          <Text style={styles.guardrailTitle}>Lab guardrail</Text>
          <Text style={styles.guardrailText}>
            This prototype uses synthetic records only. It does not provide legal advice, write to production, or replace
            PeacePad iOS 1.0 while Apple review is active.
          </Text>
        </View>
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
  },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.md
  },
  eyebrow: {
    color: colors.brandSoft,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    ...typography.title,
    color: colors.white
  },
  body: {
    ...typography.body,
    color: colors.brandSoft
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text
  },
  guardrail: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    backgroundColor: colors.surface
  },
  guardrailTitle: {
    ...typography.subheading,
    color: colors.text
  },
  guardrailText: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.sm
  }
});

