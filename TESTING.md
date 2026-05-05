# FTC HOLDING — Testing

Last updated: 2026-05-05

This document describes the testing strategy, test commands, and coverage status across the FTC HOLDING monorepo.

---

## Test Types in This Repo

| Type | Location | Runner | Scope |
|------|----------|--------|-------|
| Unit | Per-app `tests/` or `src/` | Vitest | Component logic, utilities, shared packages |
| E2E (Playwright) | `tests/e2e/`, per-app `tests/` | Playwright | Browser-based end-to-end flows |
| Smoke | `tests/smoke/`, per-app scripts | Playwright / Node | Production URL health checks |
| Security | `tests/security/` | Playwright | HTTP security headers |
| Integration | `tests/integration/` | Vitest | API-level integration checks |
| UAT | `tests/uat/` | Playwright | User journey acceptance tests |
| Performance | `tests/performance/` | Playwright | Load-level performance probes |

---

## Running Tests

### Root-level

```bash
# Run all root-level tests (unit, integration)
npx vitest run --config tests/vitest.config.ts

# Run Playwright E2E tests
npx playwright test --config tests/playwright.config.ts

# Secrets audit
npm run audit:secrets

# Portfolio-wide E2E sweep (all live sites)
npm run qa:portfolio:e2e
```

### Per-app

```bash
# ftc-site tests (Playwright)
npm --prefix APPS/ftc-site run test

# PeacePad tests
npm --prefix APPS/peacepad run test

# SayWetin tests
npm --prefix APPS/saywetin run test

# PeacePad production health check
npm run verify:peacepad:prod

# PeacePad deployment ownership check
npm --prefix APPS/peacepad run verify:deployment-ownership

# SayWetin frontend build verification
npm --prefix APPS/saywetin run verify:frontend-build
```

### App-specific smoke tests

```bash
# Dispatch road-alerts smoke test
cd APPS/dispatch && npm run test:e2e:road-alerts

# OG Trades Academy production smoke
npm --prefix APPS/og-trades-academy run smoke:prod
```

---

## Coverage by Project

| Project | Unit | E2E | Smoke | Notes |
|---------|------|-----|-------|-------|
| Una Labs site | Partial | Yes (portfolio E2E) | Yes | 5/5 checks passing |
| ftc-site | Partial | Yes (navigation.spec.ts) | No | Playwright in `APPS/ftc-site/tests/` |
| PeacePad | Yes | Yes | Yes | Most comprehensive coverage |
| SayWetin | Partial | Partial | No | API on HOLD; E2E not run against live |
| Dispatch | No | Yes | Partial | Smoke blocked by env issues |
| OG Trades Academy | No | Yes | No | E2E spec exists; not run against live URL |
| Garden Cleaners | No | Yes | Partial | 4/4 E2E checks passing |
| ATEAM | No | No | No | No CI tests; local-only |
| Anion | No | No | No | Foundation only |
| Gidi Dashers | No | No | No | In progress |

---

## Test Infrastructure

### Root-level Playwright config

`tests/playwright.config.ts` — configures browser projects and base URLs for cross-app E2E.

### Root-level Vitest config

`tests/vitest.config.ts` — covers unit, integration, security, and performance test files.

### Portfolio E2E sites list

`tests/e2e/portfolio-sites.json` — JSON list of all live production URLs checked by `npm run qa:portfolio:e2e`.

---

## What Is and Is Not Tested

### Tested

- PeacePad: auth flows, guest auth smoke, expense prevention, scheduling, Myers-Briggs personality propagation
- ftc-site: navigation routes, redirects, Garden Cleaners portal access
- Una Labs: portfolio health checks across all public pages
- Secrets: `npm run audit:secrets` runs on demand

### Not Yet Tested

- Dispatch: full token-flow E2E (blocked by env/DATABASE_URL)
- SayWetin: live API E2E (blocked by API 404s)
- OG Trades Academy: live domain smoke (blocked by unconfirmed domain + webhook env vars)
- ATEAM: no automated test suite
- Anion, Gidi Dashers, GuardSignal: no tests yet

---

## Adding Tests

1. Unit tests for shared packages go in `PACKAGES/<package>/src/__tests__/`.
2. Unit tests for app-specific logic go in `APPS/<app>/tests/unit/` or alongside source files.
3. E2E tests for a specific app go in `APPS/<app>/tests/` with the app's Playwright config.
4. Cross-app E2E and smoke tests go in the root `tests/` directory.
5. Use Vitest for unit/integration. Use Playwright for browser-based tests.
6. Every new smoke test must have a corresponding entry in `tests/e2e/portfolio-sites.json` if it targets a production URL.

---

## CI

Workflow files are in `.github/workflows/`. Tests run on every push to `main` and on pull requests.
Check the Actions tab in GitHub for current CI status.

---

*For project status and blockers that affect test coverage, see `DOCS/FTC_PROJECT_LEDGER.md`.*
