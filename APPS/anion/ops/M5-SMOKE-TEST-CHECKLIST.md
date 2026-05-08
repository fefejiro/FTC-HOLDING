# M5 Smoke Test Checklist (Starter)

Run this before release candidates. This is a manual baseline and does not replace automated coverage.

Date: __________
Executor: __________
Environment: local / preview / production

## 1. App Health
1. Start app and open home page.
Expected: Page renders without runtime crash.
Pass/Fail: __________

2. Call `GET /api/health`.
Expected: `200` and JSON with `ok: true`.
Pass/Fail: __________

3. Call `GET /api/status`.
Expected: `200` and JSON includes `placeholders` map for M2-M5.
Pass/Fail: __________

## 2. Auth Baseline
1. Initiate magic-link sign-in flow.
Expected: Redirect to callback and session established.
Pass/Fail: __________

2. Access role dashboard with active session.
Expected: Correct role-based route is shown.
Pass/Fail: __________

## 3. Booking and Classroom Seams
1. Call `POST /api/daily/room` with malformed body.
Expected: `400` with validation errors array.
Pass/Fail: __________

2. Call `POST /api/daily/room` with valid-shaped placeholder payload.
Expected: `501` and `placeholder: true`.
Pass/Fail: __________

## 4. Billing Seams
1. Call `POST /api/billing/checkout` with malformed body.
Expected: `400` with validation errors.
Pass/Fail: __________

2. Call `POST /api/billing/checkout` with valid-shaped placeholder payload.
Expected: `501` and typed placeholder response.
Pass/Fail: __________

3. Call `POST /api/billing/portal` with malformed body.
Expected: `400` with validation errors.
Pass/Fail: __________

4. Call `POST /api/webhooks/stripe` with missing event fields.
Expected: `400` malformed payload response.
Pass/Fail: __________

## 5. Build Gate
1. Run typecheck.
Expected: No TypeScript errors.
Pass/Fail: __________

2. Run production build.
Expected: Build completes successfully.
Pass/Fail: __________

## 6. Performance Baseline Gate
1. Run `npm run perf:baseline`.
Expected: k6 run completes with non-destructive checks for `/api/health`, `/pricing`, and unauthenticated `/api/billing/checkout`.
Pass/Fail: __________

2. Save evidence in `ops/docs/perf-results/` using `ops/docs/perf-results/REPORT-TEMPLATE.md`.
Expected: p50/p95/throughput interpretation captured with pass/watch/fail band.
Pass/Fail: __________

Notes:
