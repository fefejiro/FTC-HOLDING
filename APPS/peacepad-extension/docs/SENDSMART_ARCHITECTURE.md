# SendSmart Guardian Architecture

This document outlines the architecture of the SendSmart Guardian feature.

## Overview

SendSmart Guardian is a browser extension feature that analyzes user's communications and provides feedback to help them write better messages. It is designed to be a core communication intelligence engine with thin platform adapters.

## Architecture Principles

- **Separation of Concerns**: The architecture separates the core communication reasoning from the platform-specific UI and adaptations.
- **Modularity**: The system is composed of distinct modules with well-defined responsibilities.

## Core Components

The SendSmart Guardian is composed of the following key components:

### 1. Core Engine (`src/localRules.ts`)

This component contains the business logic for analyzing text and applying communication rules. It is platform-agnostic and has no knowledge of the DOM or the specific platform it is running on.

- **Responsibilities**:
  - Defines a set of rules to detect profanity, insults, threats, and other negative patterns in text.
  - Calculates a "risk score" based on the detected patterns.
  - Provides suggestions for improving the message.
- **Key Functions**:
  - `evaluateLocalPreflight(input: AnalyzeMessageRequest): LocalPreflightDecision`: The main function that takes a message and returns an analysis decision.

### 2. Platform Adapters (`src/adapters.ts`)

This component is responsible for integrating the core engine with specific platforms (e.g., WhatsApp, Gmail, Slack). It contains all the DOM manipulation logic and knowledge of the specific platform's UI.

- **Responsibilities**:
  - Detect the current platform.
  - Find the message composer and send buttons.
  - Get and set the text in the composer.
  - Trigger the send action.
- **Key Functions**:
  - `detectSupportedSite(hostname: string): SupportedSite | null`: Detects the current site based on the hostname.
  - `getAdapter(site: SupportedSite): AdapterConfig`: Returns the configuration for a specific site.
  - `resolveActiveComposer(site: SupportedSite): HTMLElement | null`: Finds the active message composer on the page.
  - `replaceComposerText(site: SupportedSite, element: HTMLElement, value: string): Promise<ComposerReplacementResult>`: Replaces the text in the composer.
  - `triggerSend(site: SupportedSite, composer: HTMLElement): TriggerSendResult`: Triggers the send action.

### 3. Content Script (`src/content.ts`)

This is the main entry point of the extension on a web page. It acts as an orchestrator, connecting the Core Engine and the Platform Adapters.

- **Responsibilities**:
  - Detects the current site and initializes the appropriate adapter.
  - Sets up event listeners to monitor user input, clicks, and other events.
  - Decides when to trigger a "preflight" check (message analysis).
  - Communicates with the background script to perform the analysis.
  - Displays a modal window to the user with suggestions if the message is flagged.
  - Handles user interactions with the modal, such as applying a suggestion or sending the original message.
- **Key Functions**:
  - `bootstrap(currentSite: SupportedSite)`: Initializes the content script on the page.
  - `runPreflight(composer: HTMLElement, currentSite: SupportedSite, intent: "background" | "send_gate", source: SendSource): Promise<void>`: Triggers a preflight check.
  - `showPreflightModal(currentSite: SupportedSite, preflight: PreflightResponse, composer: HTMLElement, draftFingerprint: string, originalDraft: string)`: Shows the intervention modal.

### 4. Background Script (`src/background.ts`)

This script runs in the background of the extension and is responsible for managing the extension's state and coordinating long-running tasks. It acts as a bridge between the content script and the core engine.

- **Responsibilities**:
  - Listens for messages from the content script (`PEACEPAD_PREFLIGHT`).
  - Calls the Core Engine's `evaluateLocalPreflight` function to analyze the message.
  - Returns the analysis result to the content script.
  - Handles API requests for more advanced analysis if needed (not covered in this document).

## Data Flow

The following diagram illustrates the data flow between the components:

```mermaid
sequenceDiagram
    participant User
    participant Page (e.g., WhatsApp)
    participant ContentScript (`content.ts`)
    participant BackgroundScript (`background.ts`)
    participant CoreEngine (`localRules.ts`)
    participant PlatformAdapter (`adapters.ts`)

    User->>Page: Types in composer
    Page-->>ContentScript: "input" event
    ContentScript->>PlatformAdapter: getComposerText()
    PlatformAdapter-->>ContentScript: text
    ContentScript->>BackgroundScript: "PEACEPAD_PREFLIGHT" message with text
    BackgroundScript->>CoreEngine: evaluateLocalPreflight(text)
    CoreEngine-->>BackgroundScript: analysisResult
    BackgroundScript-->>ContentScript: analysisResult
    alt message is flagged
        ContentScript->>Page: showPreflightModal()
        User->>Page: Interacts with modal
        Page-->>ContentScript: User action
        alt user applies suggestion
            ContentScript->>PlatformAdapter: replaceComposerText(suggestion)
            PlatformAdapter->>Page: Updates composer
        else user sends original
            ContentScript->>PlatformAdapter: triggerSend()
            PlatformAdapter->>Page: Clicks send button
        end
    else message is safe
        ContentScript->>PlatformAdapter: triggerSend()
        PlatformAdapter->>Page: Clicks send button
    end
```
