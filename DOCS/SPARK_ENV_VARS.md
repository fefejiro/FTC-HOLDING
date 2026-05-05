# Spark AI Chat — Environment Variables

This document lists all environment variables introduced for the Spark AI chat feature in the `una-stripe-api` Cloudflare Worker.

## Required for Spark to function

| Variable | Description | Default |
|---|---|---|
| `SPARK_ENABLED` | Set to `'1'` to enable Spark. Any other value (or missing) disables Spark entirely. This is the kill switch. | `''` (disabled) |
| `OPENAI_API_KEY` | Already required for other AI features. Used by Spark to call `gpt-4o-mini`. | — |
| `STRIPE_SECRET_KEY` | Already required. Used to create and verify Spark pass checkout sessions. | — |

## Tuning and guardrails

| Variable | Description | Default |
|---|---|---|
| `SPARK_PREVIEW_TURNS` | Number of free turns before a Spark pass is required. Set to `'0'` to disable the preview entirely. | `'3'` |
| `SPARK_MAX_TURNS` | Maximum turns allowed per paid session. | `'20'` |
| `SPARK_MAX_TOKENS_PER_TURN` | Maximum tokens sent to OpenAI per turn (caps token burn). Max accepted value is `2000`. | `'300'` |
| `SPARK_RATE_LIMIT_WINDOW_MS` | Rolling window in milliseconds for the per-IP rate limiter. | `'60000'` (1 minute) |
| `SPARK_RATE_LIMIT_MAX` | Maximum number of requests allowed per IP within the rate limit window. | `'20'` |

## Billing

| Variable | Description | Default |
|---|---|---|
| `SPARK_PASS_PRICE_CAD` | One-time Spark pass price in Canadian dollars, used when `STRIPE_PRICE_SPARK_PASS` is not set. | `'5'` |
| `STRIPE_PRICE_SPARK_PASS` | Optional Stripe Price ID for the Spark pass product. If provided, the existing Stripe price is used instead of a dynamic `price_data` amount. | — |

## Frontend

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_STRIPE_API_URL` | URL of the deployed `una-stripe-api` Cloudflare Worker. Already used throughout the site. |

---

## Endpoints added

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/spark/chat` | Send a message to Spark. Enforces kill switch, IP rate limit, turn cap, token cap, and pass validation. |
| `POST` | `/api/spark/create-pass` | Create a Stripe checkout session for a Spark pass. Returns `{ url }`. |
| `GET` | `/api/spark/verify-pass?session_id=cs_xxx` | Verify that a Stripe checkout session is a paid Spark pass. Used by the success page. |

---

## Fallback behavior

| Condition | Behavior |
|---|---|
| `SPARK_ENABLED` is not `'1'` | All Spark endpoints return `503 Service Unavailable` with `{ error: "Spark is currently unavailable." }` |
| IP rate limit exceeded | `429 Too Many Requests` |
| Preview turns exhausted, no pass | `402 Payment Required` with `{ requires_pass: true }` |
| Invalid or expired pass | `402 Payment Required` with `{ requires_pass: true }` |
| Turn count exceeds `SPARK_MAX_TURNS` | `429` with `{ session_limit_reached: true }` |
| `OPENAI_API_KEY` missing | `500 Internal Server Error` |
| `STRIPE_SECRET_KEY` missing | `500 Internal Server Error` |

---

## Rate limit note

The per-IP rate limiter is in-memory per Cloudflare Worker instance. Multiple worker instances do not share state. This is sufficient for abuse prevention at MVP scale. If harder limits are needed, migrate the store to Cloudflare KV (no code changes required beyond the store implementation).

---

## Spark pass lifecycle

1. User sends messages. First `SPARK_PREVIEW_TURNS` turns are free.
2. After preview exhausted, the frontend shows a billing gate.
3. User enters email → `POST /api/spark/create-pass` → redirects to Stripe.
4. Stripe redirects to `/spark/success?session_id=cs_xxx`.
5. Success page calls `GET /api/spark/verify-pass` to confirm payment.
6. On success, the Stripe session ID is stored in `localStorage` as the pass.
7. Subsequent chat requests include `pass_session_id`; the worker verifies it against Stripe on each request.
8. Pass is valid for 90 days from Stripe session creation.
