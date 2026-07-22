# FTC Portfolio Automation System Map

This map separates the system that existed before the July 21, 2026 audit, the
current operating model, and the API-first target. Una Labs is intentionally the
automated social-publishing sandbox. Personal accounts are outside the sandbox.

## Before the audit

```mermaid
flowchart LR
  TS[Windows Task Scheduler]
  JA[Job Agent scheduled run]
  UA[Una Labs scheduled run]
  CH[Shared visible Chrome window]
  USER[Owner using laptop]
  Q{Strict visual gate}
  STOP[Draft or blocked run]
  LI[LinkedIn]
  IG[Instagram]

  TS --> JA --> CH
  TS --> UA --> Q
  Q -->|fallback visual| STOP
  Q -->|perfect visual| CH
  CH --> LI
  CH --> IG
  CH -. steals focus .-> USER
```

Main problems:

- job and social tasks could converge on the same visible browser;
- Windows keyboard/mouse automation could interrupt normal laptop use;
- accepted fallback visuals still stopped the entire social run;
- a stopped run created work but did not create a live learning signal;
- cloud schedules and app builds were not consistently cost-scoped.

## Current system

```mermaid
flowchart TB
  subgraph LAPTOP[Owner laptop - free local compute]
    S[Staggered Windows scheduler]

    subgraph JOB[Job Agent lane]
      JQ[Quiet discovery, scoring and package generation]
      GM[Gmail recruiter API]
      JV[Explicit visible apply/proof session]
      JDB[(Job and proof database)]
    end

    subgraph SOCIAL[Una Labs sandbox lane]
      SRC[Source-backed story discovery]
      COPY[Instagram and LinkedIn copy]
      VIS[Visual generation and evaluation]
      GATE{Sandbox quality gate}
      LOCK[Single visible-browser lock]
      VP[Automatic visible publish]
      LEDGER[(Post, asset and failure proof ledger)]
    end

    subgraph PORTFOLIO[Portfolio control lane]
      HEALTH[Product health and status]
      BACKLOG[Priority backlog audit]
    end
  end

  S --> JQ --> JDB
  S --> GM --> JDB
  JDB --> JV

  S --> SRC --> COPY --> VIS --> GATE
  GATE -->|hard truth, auth or quality failure| LEDGER
  GATE -->|accepted visual, including sandbox fallback score 82+| LOCK
  LOCK --> VP
  VP --> IGL[Instagram Una Labs]
  VP --> LIL[LinkedIn Una Labs]
  IGL --> LEDGER
  LIL --> LEDGER

  S --> HEALTH
  S --> BACKLOG
  LEDGER --> BACKLOG
  JDB --> BACKLOG
  HEALTH --> BACKLOG
```

Current trust rules:

- Una Labs publishes automatically after the sandbox gate; no owner draft
  approval is required.
- Accepted deterministic fallback visuals scoring at least 82 may publish, but
  the fallback is recorded as a warning for later performance comparison.
- Missing or stale sources, placeholder copy, rejected/low-score visuals,
  missing captions, authentication failures, and missing proof still stop the
  run.
- Visible browser access is serialized so two social runs cannot control Chrome
  simultaneously.
- Job scoring and packaging stay in the background. Live job application and
  proof actions remain explicit because LinkedIn does not offer a general
  job-seeker apply API.

## API-first target

```mermaid
flowchart LR
  S[Local scheduler]
  PREP[Draft, visual and quality pipeline]
  ROUTE{Publisher available?}
  API[LinkedIn and Meta APIs]
  BROWSER[Visible-browser fallback window]
  VERIFY[Post ID, profile and asset verification]
  METRICS[(Trust and performance history)]
  TUNE[Threshold and content improvements]

  S --> PREP --> ROUTE
  ROUTE -->|API credentials healthy| API
  ROUTE -->|API unavailable| BROWSER
  API --> VERIFY
  BROWSER --> VERIFY
  VERIFY --> METRICS --> TUNE --> PREP
```

Promotion to a personal account should require an evidence window, for example:

- at least 30 consecutive scheduled runs;
- no duplicate posts;
- no post without its intended caption or media;
- at least 95 percent verified publication success;
- clear failure records for every unsuccessful attempt;
- explicit review of the lowest-performing fallback visuals.

## Cloud boundary

```mermaid
flowchart LR
  WIN[Windows laptop] -->|health, drafts, jobs, backlog| FREE[Free local automation]
  WIN -->|release-ready PeacePad commit only| XC[Xcode Cloud]
  XC -->|one controlled Xcode 26 archive| TF[TestFlight]
```

Xcode Cloud is not a general portfolio scheduler. It is reserved for the
Mac-exclusive PeacePad compile, archive, and TestFlight release path.
