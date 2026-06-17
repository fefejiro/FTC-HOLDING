$ErrorActionPreference = "Stop"

if (-not $env:ANION_BASE_URL) {
  $env:ANION_BASE_URL = "https://anion.unalabs.cloud"
}

if (-not $env:ANION_PHASE1_AUTH_MODE) {
  $env:ANION_PHASE1_AUTH_MODE = "manual"
}

if (-not $env:ANION_EVIDENCE_HEADED) {
  $env:ANION_EVIDENCE_HEADED = "1"
}

node ./scripts/phase1-call-evidence.mjs
