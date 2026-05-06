# Garden Cleaners Production Env Checklist (2026-05-06)

## Scope
This checklist covers only Garden Cleaners quote and notification production wiring for the ftc-site deployment.

## Required Variables

1. RESEND_API_KEY
- Purpose: enable admin email notifications from quote submissions.
- Format: resend API key string.

2. GARDEN_CLEANERS_ADMIN_EMAIL
- Purpose: destination for quote notification email.
- Format: a valid mailbox (single address).
- Recommended: operations-owned mailbox, not personal fallback.

3. GARDEN_CLEANERS_QUOTE_WEBHOOK_URL
- Purpose: secondary routing for quote payload delivery.
- Format: HTTPS endpoint that accepts JSON POST.

## Optional / Existing Variables To Confirm

1. NEXT_PUBLIC_SITE_URL
- Used by admin user flows for redirect targets.
- For Garden branded host, confirm expected value is configured for production behavior.

2. Supabase variables used by server and client
- Confirm existing production values are unchanged and valid.

## Copy/Paste Validation Steps (Post Deploy)

1. Trigger live quote submit
- Open: https://gardencleaners.ca/garden-cleaners/quote
- Submit a valid form payload.

2. Verify API response and persistence
- Expect: success message from quote form.
- Confirm new row in garden_cleaners_quotes (Supabase).

3. Verify admin email notification
- Confirm mail received at GARDEN_CLEANERS_ADMIN_EMAIL.

4. Verify webhook delivery
- Confirm receiving endpoint logs one garden_cleaners_quote payload.

5. Verify analytics events for portal and quote flow
- Expected event family:
  - garden_portal_entry_click
  - garden_portal_cta_click
  - garden_portal_region_quote_click
  - garden_portal_sticky_click
  - garden_quote_submit_attempt
  - garden_quote_submit_success
  - garden_quote_submit_error

## Rollback Trigger Conditions

Rollback or hotfix immediately if any of the following occur:

1. Quote form success without DB insert.
2. Quote form returns repeated 5xx.
3. Notification path fails for both email and webhook.
4. Portal CTA analytics events disappear from production HTML.

## Deployment Note
Cloudflare Pages deploy is triggered from pushes to main for this repository flow. Keep this env checklist attached to the deployment PR/commit notes for operator traceability.
