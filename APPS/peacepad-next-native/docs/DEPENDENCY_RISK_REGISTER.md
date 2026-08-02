# PeacePad Native Dependency Risk Register

Last reviewed: 2026-08-02

## Scope

This register evaluates the isolated `@ftc/peacepad-next-native` installation,
not the FTC monorepo's combined dependency tree. The app remains on Expo SDK 54
and is not approved for production release.

## Current evidence

```text
Expo dependency compatibility: passed (`npx expo install --check`)
Installed Expo version: 54.0.36
Standalone production audit: 11 advisories
Critical: 0
High: 1
Moderate: 10
Low: 0
```

The high advisory is inherited through `@expo/metro-config -> postcss`. The
moderate set is inherited through Expo CLI/configuration packages, including
`@expo/config-plugins -> xcode -> uuid`. These packages are part of the native
build/configuration toolchain; they are not PeacePad business-domain code.

The monorepo-root audit reports 25 advisories, including two critical findings,
because it includes unrelated portfolio dependencies. That count must not be
used as the PeacePad native release baseline.

## Remediation decision

- `npm audit fix --force` proposes Expo 57 and is a breaking SDK migration.
- A non-forced dry run updates compatible transitive packages but still leaves
  the same 11 isolated advisories.
- Expo reports the current SDK 54 dependency set as compatible.
- No override is added for Expo-owned transitive packages because that could
  create an unsupported native build graph.

Decision: retain SDK 54 for this draft lab, keep the advisories visible, and
open a separate Expo upgrade gate with Simulator and real-device regression
testing before any production-native release decision.

## Required release gate

Before v2 production release:

1. Re-run the audit from a clean standalone install.
2. Review the supported Expo upgrade path and native-module compatibility.
3. Upgrade in an isolated branch, never through `--force` on the release branch.
4. Pass typecheck, guardrails, unit/contract tests, Expo Doctor, iOS/Android
   builds, Simulator, and real-device regression testing.
5. Record any accepted residual risk with an owner and review date.
