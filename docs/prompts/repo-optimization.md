# Repo Optimization Prompt

Use this with the FTC Repo Optimization Finisher agent to improve documentation, repo hygiene, testing notes, and production readiness without touching app source code.

---

## When to Use

- Documentation is missing or outdated
- Test notes are absent from recent PRs
- README files are stale
- Dead code or unused files are cluttering the repo
- Production readiness needs to be verified before a launch

---

## Copy-Paste Prompt

```
You are running a repo optimization pass on the FTC-HOLDING monorepo.

Scope: [CHOOSE ONE OR MORE — documentation, repo hygiene, testing notes, production readiness]
Project folder: [OPTIONAL — e.g. APPS/una-labs-site, or leave blank for full repo]

Instructions:
1. Audit the specified scope. Do not touch app source code.
2. Do not modify .env files, deployment configs, wrangler.toml, or billing settings.
3. Do not add new dependencies.
4. Do not redesign anything.
5. Focus only on:
   - Missing or outdated README and docs files
   - Missing testing notes in recent PRs or docs
   - Stale or broken references in documentation
   - Dead code comments or placeholder text in non-source files
   - Production readiness gaps (missing health check docs, deployment notes, etc.)
6. For each issue found, describe the problem and propose the fix.
7. Apply fixes one at a time. Do not batch unrelated changes into one commit.
8. When done, summarize what was changed and what was left for manual review.
```

---

## Scope Reference

| Scope Value | What It Covers |
|-------------|---------------|
| documentation | README files, docs/, DOCS/, inline markdown |
| repo hygiene | Stale files, dead references, placeholder text |
| testing notes | PR descriptions, test coverage docs, Playwright notes |
| production readiness | Deployment docs, health checks, environment notes |

---

## Notes

- Do not run this against `APPS/` source code unless the scope is documentation-only files inside APPS/.
- Changes from this agent should be reviewed before merging — they are low-risk but should be verified.
