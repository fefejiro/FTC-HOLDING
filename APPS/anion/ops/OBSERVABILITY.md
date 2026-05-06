# Anion Observability — Log Query Patterns & Incident Triage

## Overview

Every critical API route emits a single structured JSON log line per request.
All lines share these guaranteed fields:

| Field       | Type   | Always present | Description                                   |
|-------------|--------|---------------|-----------------------------------------------|
| `timestamp` | string | ✓             | ISO-8601 UTC                                   |
| `level`     | string | ✓             | `info` \| `warn` \| `error`                   |
| `route`     | string | ✓             | API path, e.g. `/api/billing/checkout`         |
| `requestId` | string | ✓             | UUID — propagated from `x-request-id` header or generated at ingress |
| `userId`    | string | —             | Authenticated user's `profileId` (never email/token) |
| `code`      | string | —             | Application error code                        |
| `latencyMs` | number | —             | Wall-clock ms from request start to log emit  |

Covered routes:
- `/api/billing/checkout`
- `/api/billing/portal`
- `/api/webhooks/stripe`
- `/api/daily/room`

Error responses from all four routes include a `requestId` field so clients
can report it to support.

---

## Correlation ID Propagation

The `requestId` is read from the inbound `x-request-id` HTTP header when
present (allowing upstream proxies/API gateways to inject it), or generated
as a UUID v4 at request entry if the header is absent.

Clients wishing to trace a specific request should:
1. Set `x-request-id: <your-uuid>` on the outbound request.
2. If an error occurs, include the `requestId` field from the JSON response
   body in any support ticket.

---

## Log Query Patterns

All examples assume logs are ingested as NDJSON and queryable with `jq` or
a compatible log platform (Grafana Loki, Datadog, Cloudflare Log Push).

### Find all events for a specific request

```bash
# jq (local log file or piped stream)
jq 'select(.requestId == "YOUR-UUID-HERE")' < anion.log
```

### Find all errors in the last hour

```bash
jq 'select(.level == "error")' < anion.log
```

### Find slow requests (> 2 000 ms)

```bash
jq 'select(.latencyMs > 2000)' < anion.log
```

### Find all billing checkout failures

```bash
jq 'select(.route == "/api/billing/checkout" and .level != "info")' < anion.log
```

### Find all Stripe webhook handler errors

```bash
jq 'select(.route == "/api/webhooks/stripe" and .level == "error")' < anion.log
```

### Summarise error codes by route

```bash
jq -r '[.route, .level, (.code // "ok")] | @tsv' < anion.log \
  | sort | uniq -c | sort -rn
```

---

## Incident Triage Workflow

1. **Get the `requestId`.**
   - From a client-reported error response body (`{ "requestId": "..." }`).
   - From an alert that fires on `level == "error"`.

2. **Pull all log lines for that ID.**
   ```bash
   jq 'select(.requestId == "<id>")' < anion.log
   ```
   This shows the full lifecycle: auth, DB calls, third-party API calls, and
   the final outcome.

3. **Check the `code` field** to identify the failure category:
   | Code                              | Meaning                                      |
   |-----------------------------------|----------------------------------------------|
   | `UNAUTHENTICATED`                 | No valid session; user was not logged in     |
   | `FORBIDDEN`                       | Session valid but role does not allow access |
   | `PARENT_NOT_FOUND`                | Profile row missing in `parents` table       |
   | `NO_STRIPE_CUSTOMER`              | Parent has no Stripe customer record         |
   | `STRIPE_ERROR`                    | Stripe API call failed (see `message`)       |
   | `INVALID_SIGNATURE`               | Stripe webhook signature mismatch            |
   | `WEBHOOK_NOT_CONFIGURED`          | `STRIPE_WEBHOOK_SECRET` env var missing      |
   | `HANDLER_ERROR`                   | Unhandled exception inside webhook handler   |
   | `BOOKING_NOT_FOUND`               | `bookingId` not in `bookings` table          |
   | `BOOKING_NOT_ACCEPTED`            | Booking exists but status is not `accepted`  |
   | `DAILY_NOT_CONFIGURED`            | `DAILY_DOMAIN` env var missing               |
   | `DAILY_API_ERROR`                 | Daily.co API call failed (see `message`)     |

4. **Check `latencyMs`** for timeout candidates (> 5 000 ms warrants investigation).

5. **Cross-reference with external systems** using the same `requestId`:
   - Stripe Dashboard → search by customer or event ID found in log `message`.
   - Supabase logs → filter by timestamp window from the log line.
   - Daily.co Dashboard → match room name (`anion-<bookingId>`).

6. **Escalate** if `level == "error"` persists across multiple `requestId`s with
   the same `code` — this indicates a systemic issue rather than a one-off.

---

## Adding Observability to New Routes

1. Import the logger and request-id helpers:
   ```typescript
   import { logger } from '@/app/lib/logger';
   import { getOrCreateRequestId } from '@/app/lib/request-id';
   ```

2. At the top of the handler, capture the ID and start time:
   ```typescript
   const requestId = getOrCreateRequestId(req);
   const route = '/api/your/route';
   const start = Date.now();
   ```

3. Call `logger.info / warn / error` at every return point with
   `{ route, requestId, latencyMs: Date.now() - start }` and any relevant
   optional fields (`userId`, `code`).

4. Include `requestId` in error response JSON bodies.

5. **Never log secrets, tokens, or PII** (emails, names, payment details).
   Use `profileId` as the user identifier; never log `email` or `authUserId` raw.
