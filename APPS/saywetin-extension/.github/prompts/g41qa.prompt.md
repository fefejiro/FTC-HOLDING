---
mode: ask
description: "Keyword shortcut. Type /g41qa and your QA task to generate a copy-ready ChatGPT 4.1 Playwright E2E prompt with strict evidence rules."
---

# /g41qa Prompt Builder

Build one copy-ready QA prompt for ChatGPT 4.1 using the user task in this chat.

Rules:
1. Output exactly one fenced text block and nothing else.
2. The block must be immediately usable in ChatGPT 4.1.
3. Do not fabricate routes, selectors, test files, credentials, or results.
4. Require discovery-first checks:
- playwright config exists
- test directory exists
- runnable npm test scripts
- target URLs and account availability
5. Require failure semantics:
- unavailable credentials or env = BLOCKED
- only evidence-backed pass/fail claims
6. Require report format:
- Summary (pass/fail/blocked)
- Coverage
- Findings (P0-P2)
- Regressions
- Stability Notes
- Fix Guidance
- Release Recommendation

Coverage to enforce in generated prompt:
- unauthenticated route behavior
- login success/failure path
- session persistence
- role-based routing
- theme assertions
- canonical redirect checks
- console/network error capture

Now generate the final copy-ready Playwright QA prompt for ChatGPT 4.1 based on the latest user ask in this conversation.
