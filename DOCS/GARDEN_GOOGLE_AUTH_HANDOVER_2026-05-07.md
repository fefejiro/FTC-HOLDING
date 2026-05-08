# Garden Cleaners Google Auth Handover - 2026-05-07

## Status

GO for commit and deploy validation.

The Garden Cleaners portal has been moved to Google OAuth as the only visible login path. The previous magic-link, OTP, and password login UI has been removed from the Garden portal component.

## What changed

- Garden portal login now uses Supabase Google OAuth.
- The portal redirects back to `/garden-cleaners/portal` after Google sign-in.
- Garden admin allowlist is now:
  - `uby400@gmail.com`
  - `mike.fejiro@gmail.com`
- Staff access still resolves for `@gardencleaners.ca` addresses.
- Other authenticated users resolve as client users.
- A loading fallback was added so the portal does not sit indefinitely on loading state.
- Stripe API version usage in the ftc-site checkout/activation routes was aligned with the installed Stripe SDK type definitions so the site build can pass.

## Removed from Garden portal UI

- Magic link login
- OTP login
- Email/password login form
- Secure login link email flow

## Validation completed

- `git diff --check` passed with only CRLF warnings.
- `npm.cmd --workspace=@ftc/auth run build` passed.
- `npm.cmd --workspace=@ftc/ftc-site run build` passed.
- Garden portal content/routing had already been verified live after the prior routing fix.

## Deployment checklist

After commit and push:

1. Deploy the ftc-site output to the Garden Cleaners Cloudflare Pages project.
2. Confirm Supabase Google provider is enabled for the production auth project.
3. Confirm Supabase redirect URLs include:
   - `https://gardencleaners.ca/garden-cleaners/portal`
   - any required preview/local callback URLs used for QA
4. Test Google login with:
   - `uby400@gmail.com`
   - `mike.fejiro@gmail.com`
5. Confirm both users land in the admin dashboard.
6. Confirm no magic-link email is sent from the Garden portal login path.

## Remaining follow-up

Una Labs dashboard admin allowlist is a separate surface from the Garden Cleaners portal. If the Una Labs dashboard still hangs on `Loading your portal...`, audit that app/route separately and restrict Una Labs admins to:

- `mike.fejiro@gmail.com`
- `fejiro.efiuvwere@gmail.com`

Do not mix that follow-up into the Garden portal deploy unless the same code path is proven to own both surfaces.
