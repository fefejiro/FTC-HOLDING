# PeacePad V2 Platform

This is the isolated platform foundation for PeacePad Native V2. It is not the
live PeacePad V1 runtime and it is not deployable by default.

## Current boundary

- Infrastructure is plan/test-only.
- No AWS account IDs, credentials, remote state locations, or production
  secrets are committed.
- The Canadian and U.S. stacks are separate roots with no content replication.
- The mobile staging bundle remains `ca.peacepad.nextnative.lab`.
- The production bundle `ca.peacepad.family` and live Capacitor app remain
  untouched.

## Layout

```text
infra/terraform/
  modules/regional-data-plane/
  environments/staging/ca-central-1/
  environments/staging/us-east-2/
scripts/
  validate-infra.ps1
  validate-prerequisites.ps1
  validate-supabase-edge-function.ps1
  deploy-supabase-free-staging.ps1
  verify-local-postgres-restoration.ps1
docs/
  ADR-001-dual-region-aws-foundation.md
  ADR-002-zero-cost-supabase-staging.md
  AWS_STAGING_PREREQUISITES.md
  POSTGRES_RESTORATION_RUNBOOK.md
  SUPABASE_FREE_STAGING_RUNBOOK.md
```

## Zero-cost staging path

Until a paid production platform is funded, ADR-002 defines a provider-neutral
Supabase Free staging bridge. It preserves `/api/v2`, regional isolation, and
the PostgreSQL contract while keeping database credentials out of the app.

Validate its safe example configuration with:

```powershell
./scripts/validate-supabase-free-staging.ps1
./scripts/validate-supabase-edge-function.ps1
```

This is fictional staging only. It is not production deployment evidence.

## Local verification

Install Terraform and run:

```powershell
./scripts/validate-infra.ps1
```

The script scans source for credential patterns, formats, initializes without a
backend, validates both regional roots, and runs mock-provider plan tests. It
never calls `terraform apply`.

The local restoration drill uses temporary fictional databases and writes its
generated evidence under `D:\FTC-HOLDING-cache`; it does not deploy anything.

## Deployment stop conditions

Do not deploy until all of these are approved and configured outside source
control:

1. Canadian and U.S. AWS account topology.
2. GitHub OIDC trust and protected staging environments.
3. Versioned encrypted S3 state buckets with native S3 lockfiles.
4. Cost budgets and named on-call owners.
5. Privacy/security review of data residency and subprocessors.
6. A real PostgreSQL API package with migration, authorization, restart, and
   restoration tests.
