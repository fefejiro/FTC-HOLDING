# Just Checking In Play rejection remediation

Date: 2026-08-26
App: Just Checking In Game (`com.ftcholding.justcheckingin`)
Play app ID: `4974165497912861650`

## Verified rejection findings

Play rejected the submitted draft on 2026-08-26 for two User Data policy issues:

1. **Invalid Privacy policy** — the declared URL `https://unalabs.cloud/privacy/`
   was a generic Una Labs policy and did not identify Just Checking In or the
   listed developer/legal entity.
2. **Invalid Data safety form** — Play detected “Device or other IDs not
   declared” in the submitted version-code-2 bundle.

## Remediation completed

The Play privacy-policy declaration now points to the JCI-specific public page:

`https://just-checking-in-game.pages.dev/`

That page identifies Just Checking In, describes its offline/local-only data
handling, names Fejiro Technology Consultancy Inc., and provides support and
privacy contact details. Play confirmed the URL change was saved and requires
the updated declaration to be sent for review.

## Remediation still required

- Do not appeal or resubmit the rejected version-code-2 artifact.
- Build a new signed Android artifact from the canonical JCI worktree
  (`D:\FTC-GAMES\worktrees\jci-ios-1.1-main2`) using the existing upload key.
- Keep the Data safety answers aligned with the replacement artifact and its
  actual runtime behavior. The canonical app has analytics/ads disabled and no
  runtime identifier or network code; the replacement bundle must be inspected
  for the Unity helper references that triggered Play's scanner.
- Run the Unity tests and artifact checks before replacing the rejected Play
  draft. Record package, signing certificate, version/code, permissions, and
  SHA-256 evidence.
- Send the corrected privacy and Data safety declarations together with the
  replacement release for Google review. Upload/review is not public release.

## Current recommendation

**ANDROID: DO NOT APPROVE** until a canonical replacement bundle passes the
static checks and Play accepts the corrected declarations.
