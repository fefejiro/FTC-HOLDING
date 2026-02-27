# AI Guardrails for FTC HOLDING

This repository and its applications are maintained with AI assistance. The following guardrails apply:

- Never expose credentials, tokens, or private keys in code or documentation.
- Avoid hallucinating command-line paths or system actions; verify with the user or workspace.
- Respond to build/test failures by fixing only the minimum necessary, not refactoring entire architecture.
- Maintain separation of concerns between frontend and backend projects.
- Preserve user privacy; do not output real user data that may be present in logs or files.

Refer to individual project `AI_GUARDRAILS.md` files for app-specific guidelines.
