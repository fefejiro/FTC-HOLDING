---
name: jobagent-release-account-routing
description: Use for UnaScout/JobAgent deployment, billing, Google Play, or App Store Connect work that requires the correct existing owner account or browser profile.
---

# JobAgent Release Account Routing

Use this skill before opening a billing, cloud, Google Play, or App Store
release console for UnaScout. The purpose is to avoid creating duplicate
accounts or publishing through the wrong organization.

## Account Map

| Surface | Required existing account/profile | Verify before acting |
| --- | --- | --- |
| Stripe | `Fejiro.Efiuvwere@gmail.com` | Dashboard identifies Una Labs |
| Railway | `mike.fejiro@gmail.com` | Project is `una-jobagent` in Michael Fejiro's Projects |
| Google Play Console | Chrome profile `Peace Pad` (`peacepad@peacepad.ca`) | Publisher is Fejiro, organization account `9098950441049789979` |
| App Store Connect | Fejiro Efiuvwere Apple profile | Organization is Fejiro Technology Consultancy Inc. |

## Rules

1. Use existing publisher accounts; do not create a new developer or Stripe
   account when the mapped account is available.
2. Confirm the visible organization, app/bundle ID, and public product name
   before irreversible actions. JobAgent's internal identity is `JobAgent`; its
   public brand is `UnaScout`; bundle/application ID is
   `cloud.unalabs.jobagent`.
3. Never save or echo passwords, restricted keys, OAuth tokens, cookies,
   recovery codes, signing certificates, or one-time codes.
4. Pause for the owner at legal terms, export declarations, developer
   agreements, Apple/Google two-factor prompts, or any certification that is
   personal or organization-level.
5. After an owner completes a gate, verify the resulting console state with a
   screenshot or direct status evidence before continuing.
