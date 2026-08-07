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

## Regional staging drill requirements

The local drill does not prove RDS backup restoration. After deployment approval:

1. Take an automated or manual encrypted RDS snapshot in the same region.
2. Restore into a new isolated subnet group and security group with no API access.
3. Use a short-lived verification role and a new secret.
4. Run schema checks, migration-checksum checks, and fictional record hashes.
5. Confirm logs contain no record bodies or credentials.
6. Record start/end timestamps to measure RTO and the recovery point to measure RPO.
7. Destroy the temporary restore only after Records and Security sign the evidence.
8. Repeat independently in Canada and the United States; never copy family data
   between regions for a drill.

RDS restoration is not considered verified until both regional evidence packages
exist and the measured RPO/RTO meet the release targets.
