# PostgreSQL restoration runbook

## Current proof boundary

`scripts/verify-local-postgres-restoration.ps1` performs a local, loopback-only
drill using fictional records. It creates temporary source and target databases,
loads the committed fictional fixture, makes a custom-format dump, restores it,
verifies record and migration-checksum counts, writes evidence to D:, and drops
both temporary databases. It never contacts AWS or production.

## Local command

```powershell
./scripts/verify-local-postgres-restoration.ps1
```

Expected terminal marker:

```text
PEACEPAD_V2_POSTGRES_RESTORATION_PASS
```

The JSON evidence records the PostgreSQL version, dump SHA-256, restored counts,
regions, timestamp, and fictional-data classification. Database names and
credentials are not written to the evidence file.

## Managed Supabase application-schema drill

The protected `PeacePad V2 Supabase Restoration Drill` workflow on `main` runs
the target feature commit's `scripts/verify-managed-logical-restoration.sh`.
It must be dispatched one region at a time with the exact reviewed feature SHA,
the approved regional project ref, and the literal confirmation
`RESTORE FICTIONAL STAGING`. The matching protected GitHub environment requires
the configured reviewer before credentials become available.

The drill:

1. verifies the exact project, region, target SHA, and all 19 managed migration
   versions;
2. reads the managed `peacepad_v2` application schema inside a read-only source
   transaction;
3. creates a data-only custom-format dump without owners or privileges;
4. applies the committed migrations to an isolated ephemeral PostgreSQL 17
   target and restores the application data there;
5. compares every application table by inventory, row count, and deterministic
   content fingerprint, then checks the aggregate source/restore fingerprint;
6. records recovery duration and non-secret aggregate evidence; and
7. destroys the dump before evidence upload.

Canada run `31430532674` and U.S. run `31430697958` passed at feature commit
`1dc3bf9376634872eb1308512de9078683da09ec` under trusted main control
`86961431f702076d3f2b6c328659d00abede9a5e`. Canada restored 20 application
tables and 143 fictional rows in 22 seconds. The U.S. restored 20 application
tables and 82 fictional rows in 19 seconds. Both source and restored aggregate
fingerprints matched, both dumps were destroyed, and production was not
contacted. The first run `31430347988` failed before database access because
the script was not executable; PR #191 corrected the control to invoke it with
Bash before either successful evidence run.

## Remaining provider recovery boundary

This logical drill is not a Supabase project snapshot or PITR restore. It does
not recover Supabase Auth identities or credentials, Storage objects, Realtime
state, Edge configuration, secrets, or project-level settings, and it does not
establish a recovery point objective. Before release, document and verify the
provider-level Auth/platform backup or PITR path available to the selected
plan, keep Canada and U.S. recovery evidence isolated, and obtain the required
Records, Privacy, Security, and Release sign-offs. Never copy family data
between regions for a drill.
