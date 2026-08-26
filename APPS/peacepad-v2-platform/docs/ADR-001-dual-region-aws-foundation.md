# ADR-001: Isolated dual-region AWS foundation

- Status: Proposed; implementation skeleton only
- Date: 2026-08-06
- Owners required before deployment: Product, Platform, Security, Privacy,
  Records, and Finance

## Context

The current canonical portfolio map assigns live PeacePad V1 to Cloudflare,
Railway, and Supabase. PeacePad Native V2 has stricter Canadian/U.S. residency,
evidence-integrity, recovery, and institutional-assurance requirements. Its
current server rail is fictional and cannot establish PostgreSQL persistence.

## Decision

Create a new, isolated platform root for V2. Model equivalent regional data
planes in `ca-central-1` and `us-east-2` using Terraform. Each region owns its
own encryption key, network, PostgreSQL instance, private versioned object
bucket, job queues, and logs. Family content is not replicated between regions.

Cloudflare remains the prospective public DNS/edge owner. This ADR does not
change the live V1 runtime, the canonical stack map, or any public route.

## Safety controls

- No committed AWS credentials or account IDs.
- Provider configuration requires an explicit allowed AWS account ID.
- Environment roots have no automatic apply workflow.
- State backend configuration is supplied at initialization time; local state
  and plan artifacts are ignored.
- Storage is private, versioned, encrypted with a regional KMS key, and guarded
  from accidental destruction.
- PostgreSQL is private, encrypted, deletion-protected by environment policy,
  and configured for point-in-time recovery.
- Canadian and U.S. roots use different regions, CIDRs, names, and state keys.

## Consequences

This increases operational cost and complexity compared with the current lean
shared Supabase/Railway model. It cannot be adopted merely by merging code.
Account topology, cost forecasts, incident ownership, backup restoration, and
privacy/security approval are deployment prerequisites.

## Explicit non-decisions

- No production AWS account or vendor has been activated.
- No API compute runtime has been selected or deployed.
- No production identity or V1 migration has been enabled.
- No cross-region family-content replication is permitted.
- No claim of production, PostgreSQL, restoration, or residency proof is made.
