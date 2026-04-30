# FTC Project Ledger

A human-readable, cross-project delivery ledger for FTC/Una Labs. Use this template to track project status, commits, blockers, QA, human follow-up, and next actions for every major project.

---

## Garden Cleaners
- **Current status:** HOLD (custom SMTP sender display name still shows Una Labs unless accepted)
- **Last known commits:** 2f0c8e42, 316731c7, 114dce1a, a5956d09, 00bb262e
- **Blockers:**
  - Custom SMTP sender display name still shows Una Labs unless accepted
- **Tests/QA:** Credentialed QA passed, admin login/dashboard verified, sender branding not yet verified
- **Human follow-up notes:** Awaiting SMTP credentials, final client walkthrough if required
- **Next action:** Configure/test SMTP, verify sender display name, update handoff docs
- **Estimated remaining effort:** ~0.5d (SMTP + final client walkthrough)

## SayWetin
- **Current status:** HOLD (API endpoints returning 404, Android/API env/device QA pending)
- **Last known commits:** 45239cbc2960a6391c5871ad84e6e65503844423
- **Blockers:**
  - API endpoints returning 404
  - Android/API env/device QA pending
- **Tests/QA:** Lyric timing UX patch verified, full E2E pending
- **Human follow-up notes:** Owner must resolve API/env issues
- **Next action:** Unblock API/env, run full E2E QA
- **Estimated remaining effort:** 1-2d (API/env unblock + E2E)

## Dispatch/OG
- **Current status:** HOLD (DATABASE_URL/runtime env and token-flow production verification)
- **Last known commits:** (see repo)
- **Blockers:**
  - DATABASE_URL/runtime env and token-flow production verification
- **Tests/QA:** Partial QA, access issues remain
- **Human follow-up notes:** Owner must review access audit results
- **Next action:** Resolve env/token issues, complete QA
- **Estimated remaining effort:** 1d (access unblock + QA)

## FTC/Auth/Skills
- **Current status:** GO (foundation skill committed)
- **Last known commits:** 90670cd3, b03e69c4
- **Blockers:** None
- **Tests/QA:** Skill and helpers committed, typecheck/build passed
- **Human follow-up notes:** None
- **Next action:** None
- **Estimated remaining effort:** 0d
