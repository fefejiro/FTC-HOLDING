#!/usr/bin/env bash
set -euo pipefail

required() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "$name is required." >&2
    exit 1
  fi
}

for name in PEACEPAD_REGION PEACEPAD_PROJECT_REF DATABASE_URL TARGET_COMMIT_SHA EVIDENCE_DIRECTORY; do
  required "$name"
done

declare -A projects=(
  [ca]="rohvkyuxbnqzglaromms"
  [us]="spmpndalcvwmygznihec"
)

if [[ -z "${projects[$PEACEPAD_REGION]+x}" || "${projects[$PEACEPAD_REGION]}" != "$PEACEPAD_PROJECT_REF" ]]; then
  echo "The requested project is not an approved PeacePad fictional-staging target." >&2
  exit 1
fi
if [[ ! "$TARGET_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "TARGET_COMMIT_SHA must be a full lowercase Git commit SHA." >&2
  exit 1
fi
if [[ "$DATABASE_URL" != postgresql://* && "$DATABASE_URL" != postgres://* ]]; then
  echo "DATABASE_URL must use PostgreSQL." >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migration_root="$root/supabase/migrations"
dump_directory="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/peacepad-v2-managed-restore-${PEACEPAD_REGION}-$$"
dump_path="$dump_directory/managed.dump"
local_database_url="postgresql:"
local_database_url+="//postgres:peacepad_restore@127.0.0.1:5432/peacepad_restore"
started_epoch="$(date +%s)"

mkdir -p "$dump_directory" "$EVIDENCE_DIRECTORY"
chmod 700 "$dump_directory" "$EVIDENCE_DIRECTORY"

cleanup() {
  rm -f -- "$dump_path"
  rmdir "$dump_directory" 2>/dev/null || true
}
trap cleanup EXIT

pg17() {
  docker run --rm --network host -i \
    -e DATABASE_URL -e LOCAL_DATABASE_URL="$local_database_url" \
    -v "$dump_directory:/work" postgres:17 "$@"
}

source_psql() {
  pg17 psql --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align --dbname="$DATABASE_URL" "$@"
}

local_psql() {
  pg17 psql --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align --dbname="$local_database_url" "$@"
}

mapfile -t expected_migrations < <(
  find "$migration_root" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' \
    | sed -E 's/^([0-9]+)_.*/\1/' | sort
)
if [[ "${#expected_migrations[@]}" -ne 19 ]]; then
  echo "Expected exactly 19 reviewed migrations." >&2
  exit 1
fi

mapfile -t deployed_migrations < <(
  source_psql --command="begin read only; select version from supabase_migrations.schema_migrations order by version; commit;" \
    | grep -E '^[0-9]+$'
)
if [[ "$(printf '%s\n' "${expected_migrations[@]}")" != "$(printf '%s\n' "${deployed_migrations[@]}")" ]]; then
  echo "Managed migration history does not match the reviewed migration set." >&2
  exit 1
fi

mapfile -t source_tables < <(
  source_psql --command="begin read only; select table_name from information_schema.tables where table_schema='peacepad_v2' and table_type='BASE TABLE' order by table_name; commit;" \
    | grep -E '^[a-z0-9_]+$'
)
if [[ "${#source_tables[@]}" -lt 1 ]]; then
  echo "The managed PeacePad schema contains no restorable tables." >&2
  exit 1
fi

pg17 sh -ceu 'pg_dump --dbname="$DATABASE_URL" --format=custom --data-only --schema=peacepad_v2 --no-owner --no-privileges --file=/work/managed.dump'
if [[ ! -s "$dump_path" ]]; then
  echo "The managed logical dump was not created." >&2
  exit 1
fi
dump_sha256="$(sha256sum "$dump_path" | awk '{print $1}')"

local_psql <<'SQL'
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema realtime;
create table realtime.messages (extension text not null);
alter table realtime.messages enable row level security;
grant usage on schema auth, realtime to anon, authenticated;
grant select, insert on realtime.messages to anon, authenticated;
create function realtime.topic() returns text language sql stable as $$
  select current_setting('realtime.topic', true)
$$;
SQL

for migration in "$migration_root"/*.sql; do
  docker run --rm --network host \
    -e LOCAL_DATABASE_URL="$local_database_url" \
    -v "$root:/workspace:ro" postgres:17 \
    sh -ceu 'psql --no-psqlrc --set=ON_ERROR_STOP=1 --dbname="$LOCAL_DATABASE_URL" --file="$1"' sh \
    "/workspace/supabase/migrations/$(basename "$migration")"
done

pg17 sh -ceu 'pg_restore --dbname="$LOCAL_DATABASE_URL" --data-only --disable-triggers --no-owner --no-privileges --single-transaction --exit-on-error /work/managed.dump'

mapfile -t restored_tables < <(
  local_psql --command="select table_name from information_schema.tables where table_schema='peacepad_v2' and table_type='BASE TABLE' order by table_name;" \
    | grep -E '^[a-z0-9_]+$'
)
if [[ "$(printf '%s\n' "${source_tables[@]}")" != "$(printf '%s\n' "${restored_tables[@]}")" ]]; then
  echo "Restored PeacePad table inventory does not match the managed source." >&2
  exit 1
fi

fingerprint_table() {
  local target="$1"
  local table="$2"
  local query
  query="select count(*)::text || ':' || encode(extensions.digest(coalesce(string_agg(row_hash,'' order by row_hash),''),'sha256'),'hex') from (select md5(row_to_json(row_value)::text) as row_hash from peacepad_v2.\"$table\" row_value) rows;"
  if [[ "$target" == "source" ]]; then
    source_psql --command="begin read only; $query commit;" | grep -E '^[0-9]+:[a-f0-9]{64}$'
  else
    local_psql --command="$query" | grep -E '^[0-9]+:[a-f0-9]{64}$'
  fi
}

source_fingerprint_input=""
restored_fingerprint_input=""
total_rows=0
non_empty_tables=0
for table in "${source_tables[@]}"; do
  source_value="$(fingerprint_table source "$table")"
  restored_value="$(fingerprint_table restored "$table")"
  if [[ "$source_value" != "$restored_value" ]]; then
    echo "Restored data fingerprint mismatch." >&2
    exit 1
  fi
  row_count="${source_value%%:*}"
  total_rows=$((total_rows + row_count))
  if (( row_count > 0 )); then non_empty_tables=$((non_empty_tables + 1)); fi
  source_fingerprint_input+="$table:$source_value\n"
  restored_fingerprint_input+="$table:$restored_value\n"
done

source_fingerprint="$(printf '%b' "$source_fingerprint_input" | sha256sum | awk '{print $1}')"
restored_fingerprint="$(printf '%b' "$restored_fingerprint_input" | sha256sum | awk '{print $1}')"
if [[ "$source_fingerprint" != "$restored_fingerprint" ]]; then
  echo "Aggregate restore fingerprint mismatch." >&2
  exit 1
fi

completed_epoch="$(date +%s)"
evidence_path="$EVIDENCE_DIRECTORY/managed-logical-restoration-${PEACEPAD_REGION}.json"
export MIGRATION_COUNT="${#expected_migrations[@]}"
export TABLE_COUNT="${#source_tables[@]}"
export TOTAL_ROWS="$total_rows"
export NON_EMPTY_TABLES="$non_empty_tables"
export DUMP_SHA256="$dump_sha256"
export SOURCE_FINGERPRINT="$source_fingerprint"
export RESTORED_FINGERPRINT="$restored_fingerprint"
export RECOVERY_TIME_SECONDS="$((completed_epoch - started_epoch))"

rm -f -- "$dump_path"
if [[ -e "$dump_path" ]]; then
  echo "The managed dump was not destroyed." >&2
  exit 1
fi

node - "$evidence_path" <<'NODE'
const fs = require("node:fs");
const [evidencePath] = process.argv.slice(2);
const evidence = {
  result: "MANAGED_LOGICAL_RESTORATION_VERIFIED",
  evidenceBoundary: "managed-source application-schema logical restoration",
  timestampUtc: new Date().toISOString(),
  region: process.env.PEACEPAD_REGION,
  projectRef: process.env.PEACEPAD_PROJECT_REF,
  targetCommitSha: process.env.TARGET_COMMIT_SHA,
  dataClassification: "fictional-only",
  sourceReadOnly: true,
  restoreTarget: "ephemeral-local-postgresql-17",
  migrationCount: Number(process.env.MIGRATION_COUNT),
  tableCount: Number(process.env.TABLE_COUNT),
  totalRows: Number(process.env.TOTAL_ROWS),
  nonEmptyTables: Number(process.env.NON_EMPTY_TABLES),
  dumpSha256: process.env.DUMP_SHA256,
  sourceFingerprintSha256: process.env.SOURCE_FINGERPRINT,
  restoredFingerprintSha256: process.env.RESTORED_FINGERPRINT,
  recoveryTimeSeconds: Number(process.env.RECOVERY_TIME_SECONDS),
  dumpRetained: false,
  productionContacted: false,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE

echo "MANAGED_LOGICAL_RESTORATION_VERIFIED region=$PEACEPAD_REGION evidence=$evidence_path"
