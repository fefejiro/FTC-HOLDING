# Operating policy

## Autonomous PR lane

Allowed only when the issue is labeled `continuous-improvement` and `agent-ready`:

- typo and broken-link fixes;
- deterministic formatting or lint cleanup with no behavior change;
- missing tests for already-defined behavior;
- documentation synchronized to verified code or commands;
- accessibility metadata and test-selector repairs;
- removal of proven dead generated artifacts when recoverable in Git.

The agent may create a branch, commit, push, and open a pull request. It may not merge the pull request.

## Discovery-only lane

Create an evidence-backed issue but do not edit application code for dependency upgrades, flaky CI with unclear cause, architecture consolidation, repository archival, performance changes, native metadata/capabilities, feature flags, user-visible behavior, or production configuration.

## Owner-only lane

Do not mutate secrets, keys, certificates, signing, Apple/Google portals, billing, pricing, entitlements, privacy policy, terms, compliance claims, production databases, migrations, destructive cleanup, deployment, domains, DNS, or cloud-build triggers.

## Required issue evidence

Include the affected app/path, observed state, desired state, risk class, acceptance criteria, verification command, and explicit files or systems that must not be touched.

## Required pull request evidence

Include Summary, Files changed, Testing performed, Risks, Follow-up, and the issue number. State skipped tests plainly.
