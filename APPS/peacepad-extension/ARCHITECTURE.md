# SendSmart Architecture (Extension)

This repository hosts the current SendSmart Guardian extension demo. The goal is to keep the WhatsApp Web experience stable while preparing for a multi-platform architecture.

## Goal
Preserve the working WhatsApp demo and evolve toward a reusable core engine with thin platform adapters.

## Current State (Extension-First)
- **WhatsApp-first integration** in `src/content.ts` (DOM monitoring, send interception, modal injection).
- **Site adapters** in `src/adapters.ts` (composer selectors, send selectors, insertion methods).
- **Local reasoning fallback** in `src/localRules.ts` (rules, scoring, suggestions, context signals).
- **Preflight mapping** in `src/preflightCompat.ts` (legacy/compat mapping to preflight).
- **Telemetry/trace** in `src/debugTrace.ts`.

## Target Architecture
```
SendSmart Core
    ↓
Universal Web Composer Engine
    ↓
Site Profiles
    ↓
Platform Adapters
```

### SendSmart Core (Reasoning)
Communication intelligence that should be reusable across all platforms:
- risk scoring
- tone and context classification
- suggestion generation
- explanation generation
- event logging semantics (product telemetry)
- dataset/rules (local or model-assisted)

### Universal Web Composer Engine (Browser Mechanics)
Shared browser behavior across messaging platforms:
- detect active composer
- read draft text
- detect send intent
- pause send event
- launch Guardian modal
- apply approved suggestion
- restore cursor
- return focus

### Site Profiles (Configuration)
Per-site configuration with selectors and interaction details.
Current implementation lives in `src/adapters.ts` as `ADAPTERS` (exported as `SITE_PROFILES`).

### Platform Adapters (Thin)
Small wrappers that connect site-specific DOM to the universal engine:
- WhatsApp Web
- Gmail
- Slack
- LinkedIn (future)
- Teams (future)

## Current Module Classification
**Core candidate (reasoning):**
- `src/localRules.ts` (rules, scoring, suggestions, context)
- `src/preflightCompat.ts` (mapping legacy → preflight)
- `src/contentHelpers.ts` (explanations, interpretation lines, labels)

**Adapter/UI:**
- `src/adapters.ts` (site profiles, DOM selectors, insertion methods)
- `src/content.ts` (DOM watchers, send gating, modal, WhatsApp handoff)
- `src/popup.ts`, `src/popup.html`, `src/popup.css` (extension UI)
- `src/storage.ts` (extension settings)
- `src/buildInfo.ts` (build metadata)

**Mixed / cross-cutting:**
- `src/background.ts` (extension runtime + preflight orchestration + local fallback)
- `src/debugTrace.ts` (developer trace + product telemetry foundation)

## Universal Composer Engine Candidates (Existing Functions)
These are the parts that will eventually move into a reusable engine:
- `resolveComposerFromTarget`, `getComposerText`, `replaceComposerText`, `triggerSend` (in `src/adapters.ts`)
- `installPassiveWatcher`, `installSendGate`, `installClickSendGate` (in `src/content.ts`)
- Modal injection + actions (in `src/content.ts`)

## Strategic Product Insight (Future)
The long-term value is not only message rewriting but **conversation → structured business memory**.
Example: chat becomes structured order data, reducing chaos and preventing lost deals.
This aligns with a core engine that can extract structure and intent across platforms.

## Decision Rule
See [CORE_VS_ADAPTER_RULE.md](CORE_VS_ADAPTER_RULE.md) for the checklist before adding features.
