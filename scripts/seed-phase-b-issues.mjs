#!/usr/bin/env node
/**
 * seed-phase-b-issues.mjs
 *
 * One-shot: creates the Phase B agent-ready backlog (B1-B10) as GitHub issues.
 * Idempotent — skips any issue whose exact title already exists.
 *
 * Usage:
 *   node scripts/seed-phase-b-issues.mjs        # creates issues
 *   DRY_RUN=1 node scripts/seed-phase-b-issues.mjs  # preview only
 */
import { execSync } from 'node:child_process';

const DRY = process.env.DRY_RUN === '1';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function ghAuthed() {
  try { execSync('gh auth status', { stdio: 'ignore' }); return true; } catch { return false; }
}

const ISSUES = [
  {
    title: '[Agent-Ready] B1: Extract @ftc/backend-template package',
    labels: ['agent-ready', 'phase-b', 'pkg:backend-template'],
    body: `## Goal
Extract the canonical Express+TS+Drizzle+Neon backend pattern from APPS/peacepad/server into a reusable workspace package.

## Acceptance criteria
- [ ] PACKAGES/backend-template/ exists with package.json, tsconfig.json, src/index.ts
- [ ] Exports: createApp(config), error middleware, request logger, health route, auth helpers
- [ ] Drizzle + Neon connection helper with connection pooling
- [ ] README with 60-second quickstart for a new app
- [ ] At least one app (PeacePad or new sample) imports it without behavioral change

## Files to touch
- PACKAGES/backend-template/** (new)
- APPS/peacepad/server/** (refactor only — must remain functional)

## Verification
\`\`\`
npm --workspace=PACKAGES/backend-template run build && npm --workspace=@ftc/peacepad run build:api
\`\`\`

## Don't touch
- Production env vars, Railway deploy config
- PeacePad behavior — refactor only`,
  },
  {
    title: '[Agent-Ready] B2: Extract @ftc/ui-kit package',
    labels: ['agent-ready', 'phase-b', 'pkg:ui-kit'],
    body: `## Goal
Extract shared UI primitives (Button, Card, Input, Toast, Modal, premium tokens) used across FTC apps into one package.

## Acceptance criteria
- [ ] PACKAGES/ui-kit/ with React + Tailwind components
- [ ] Tailwind preset exported (colors, spacing, fonts)
- [ ] Storybook OR a /preview route in one host app
- [ ] Replace ad-hoc copies in at least one app (FTC site or Una Labs)
- [ ] Zero visual regression in adopted app

## Files to touch
- PACKAGES/ui-kit/** (new)
- APPS/ftc-site/** OR APPS/una-labs-site/** (adopt)

## Verification
\`\`\`
npm --workspace=PACKAGES/ui-kit run build
\`\`\`

## Don't touch
- Per-app branding overrides; expose via theme tokens`,
  },
  {
    title: '[Agent-Ready] B3: Extract @ftc/ai package (OpenAI + ElevenLabs)',
    labels: ['agent-ready', 'phase-b', 'pkg:ai'],
    body: `## Goal
Wrap OpenAI + ElevenLabs behind one package so any app can swap providers via config.

## Acceptance criteria
- [ ] PACKAGES/ai/ with chat(), tts(), stt() interfaces
- [ ] Provider abstraction (OpenAI now; pluggable later)
- [ ] Streaming support for chat
- [ ] Cost meter helper (tokens in/out)
- [ ] Used by at least one app (SayWetin or Una Labs ATEAM)

## Verification
\`\`\`
npm --workspace=PACKAGES/ai run build && npm --workspace=PACKAGES/ai test
\`\`\`

## Don't touch
- Existing direct OpenAI calls — port app-by-app, behavior-preserving`,
  },
  {
    title: '[Agent-Ready] B4: Extract @ftc/telegram-bot-template (grammY on CF Workers)',
    labels: ['agent-ready', 'phase-b', 'pkg:telegram-bot-template'],
    body: `## Goal
Reusable grammY bot template targeting Cloudflare Workers, with admin commands, rate-limit middleware, and storage abstraction.

## Acceptance criteria
- [ ] PACKAGES/telegram-bot-template/ with bot factory + handlers
- [ ] Sample bot deploys to CF Workers via wrangler
- [ ] Includes /start, /help, /admin commands
- [ ] Rate-limit middleware (per-user, configurable)
- [ ] README with 5-minute deploy guide

## Verification
\`\`\`
npm --workspace=PACKAGES/telegram-bot-template run build
\`\`\`

## Don't touch
- Existing bot deployments`,
  },
  {
    title: '[Agent-Ready] B5: Extract @ftc/stats-ledger package + admin UI',
    labels: ['agent-ready', 'phase-b', 'pkg:stats-ledger'],
    body: `## Goal
Generic event ledger (append-only) with admin UI for stats, used by OG Trades, Bushy, and others.

## Acceptance criteria
- [ ] PACKAGES/stats-ledger/ with record(event), query(filter), aggregate()
- [ ] Postgres-backed (Neon) with idempotency keys
- [ ] Premium admin UI: filter, chart (sparkline), export CSV
- [ ] Mounted in at least one host app (OG Trades stats bot)

## Verification
\`\`\`
npm --workspace=PACKAGES/stats-ledger run build && npm --workspace=PACKAGES/stats-ledger test
\`\`\`

## Don't touch
- Production schemas without migration plan`,
  },
  {
    title: '[Agent-Ready] B6: Ship Bushy premium-complete (rev-share, ships first)',
    labels: ['agent-ready', 'phase-b', 'app:bushy'],
    body: `## Goal
Premium-complete Bushy launch — landing, intake, quote, payment, ops dashboard. Plan once, build once.

## Acceptance criteria
- [ ] Public site live (Cloudflare Pages, custom domain)
- [ ] Quote flow with bundled household services (nanny + cleaning + add-ons)
- [ ] Output: fixed quote + estimated range + base + add-ons
- [ ] Admin override before quote send
- [ ] Stripe checkout
- [ ] Ops dashboard for accepted jobs
- [ ] All copy + design at premium quality (no MVP placeholders)

## Files to touch
- APPS/bushy/** (new or extend existing)

## Verification
\`\`\`
cd APPS/bushy && npm run build && npm test
\`\`\`

## Don't touch
- Other UBY clients (separate issues)`,
  },
  {
    title: '[Agent-Ready] B7: UBY client portal (operator dashboard for all UBY apps)',
    labels: ['agent-ready', 'phase-b', 'app:una-labs'],
    body: `## Goal
One operator portal for Mike to triage all UBY client app activity (Bushy, OG Trades, Anion, Garden Cleaners) without per-app logins.

## Acceptance criteria
- [ ] /uby route in Una Labs site (auth-gated to admin allowlist)
- [ ] Per-app cards: live status, recent leads/jobs, alerts
- [ ] Read-only; deep-links to per-app dashboards
- [ ] Mobile-responsive
- [ ] Auto-refresh every 60s

## Files to touch
- APPS/una-labs-site/app/uby/** (new)

## Verification
\`\`\`
cd APPS/una-labs-site && npx tsc --noEmit && npm run build
\`\`\`

## Don't touch
- Public Una Labs marketing routes`,
  },
  {
    title: '[Agent-Ready] B8: Axiom logging integration via @ftc/logger',
    labels: ['agent-ready', 'phase-b', 'pkg:logger'],
    body: `## Goal
Wire all backend services to Axiom via the existing @ftc/logger package, with structured fields and request correlation.

## Acceptance criteria
- [ ] @ftc/logger exports axiomTransport({ token, dataset })
- [ ] PeacePad backend, FTC site (CF), and at least one CF Worker emit to Axiom
- [ ] Request ID propagated end-to-end
- [ ] Sensitive fields redacted
- [ ] Axiom dashboard: errors-per-service tile

## Files to touch
- PACKAGES/logger/**
- APPS/peacepad/server/**
- workers/**

## Verification
- Trigger an error in staging; confirm it appears in Axiom within 30s

## Don't touch
- Sensitive payloads — must redact email, phone, payment fields`,
  },
  {
    title: '[Agent-Ready] B9: Workflow templates (.github/workflow-templates/) for new apps',
    labels: ['agent-ready', 'phase-b'],
    body: `## Goal
Drop-in templates so a new FTC app gets CI, deploy, and quality gates in 60 seconds.

## Acceptance criteria
- [ ] .github/workflow-templates/ftc-cf-pages.yml (Next.js → Cloudflare Pages)
- [ ] .github/workflow-templates/ftc-railway-api.yml (Express → Railway)
- [ ] .github/workflow-templates/ftc-cf-worker.yml (grammY/Worker → wrangler deploy)
- [ ] .github/workflow-templates/ftc-quality-gates.yml (lint, tsc, audit, doc-drift)
- [ ] README with copy-paste instructions

## Verification
- Manually scaffold a new app and confirm template runs green

## Don't touch
- Existing per-app workflows (those get migrated app-by-app, separate issues)`,
  },
  {
    title: '[Agent-Ready] B10: PeacePad iOS path decision (RN vs Capacitor vs PWA)',
    labels: ['agent-ready', 'phase-b', 'app:peacepad', 'blocked'],
    body: `## Goal
Pick PeacePad iOS path — research + 1-page decision doc — before any code.

## Acceptance criteria
- [ ] APPS/peacepad/docs/ios-path-decision.md exists
- [ ] Compares: pure React Native (per saywetin-rn-migration-plan), Capacitor wrap, PWA-only
- [ ] Each option scored on: time-to-store, audio reliability, code reuse, ongoing cost
- [ ] One recommendation, dated, signed off by @fefejiro
- [ ] Linked to backlog issues for chosen path

## Don't touch
- Any production iOS build — research only`,
  },
];

if (!DRY && !ghAuthed()) {
  console.error('gh CLI not authenticated. Run `gh auth login` first.');
  process.exit(1);
}

let existing = new Set();
if (!DRY) {
  try {
    const out = sh('gh issue list --state all --label agent-ready --limit 500 --json title');
    existing = new Set(JSON.parse(out).map(i => i.title));
  } catch { /* non-fatal */ }
}

let created = 0, skipped = 0;
for (const issue of ISSUES) {
  if (existing.has(issue.title)) {
    console.log(`⏭  ${issue.title} (already exists)`);
    skipped++;
    continue;
  }
  if (DRY) {
    console.log(`+ ${issue.title}  [${issue.labels.join(', ')}]`);
    continue;
  }
  const labelArgs = issue.labels.map(l => `--label ${JSON.stringify(l)}`).join(' ');
  try {
    execSync(`gh issue create --title ${JSON.stringify(issue.title)} --body ${JSON.stringify(issue.body)} ${labelArgs}`, { stdio: ['ignore', 'pipe', 'pipe'] });
    created++;
    console.log(`✔ ${issue.title}`);
  } catch (e) {
    console.error(`✘ ${issue.title} — ${e.message.split('\n')[0]}`);
  }
}
console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
