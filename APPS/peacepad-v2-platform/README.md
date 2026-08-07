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
  verify-local-postgres-restoration.ps1
docs/
  ADR-001-dual-region-aws-foundation.md
  AWS_STAGING_PREREQUISITES.md
  POSTGRES_RESTORATION_RUNBOOK.md
```

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
