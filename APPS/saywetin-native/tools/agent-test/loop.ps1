# Unattended SayWetin backend smoke loop.
#
# Runs smoke-api.mjs on an interval. Writes a single rolling log + a
# per-run JSON result so you can come back and read what happened.
#
# Usage:
#   pwsh ./tools/agent-test/loop.ps1
#   pwsh ./tools/agent-test/loop.ps1 -IntervalSeconds 600 -MaxRuns 0
#   pwsh ./tools/agent-test/loop.ps1 -Audio "C:\path\to\sample.m4a"
#
# Stop: Ctrl-C in the terminal. Results land in tools/agent-test/_runs/.

param(
  [int]$IntervalSeconds = 300,    # 5 min default
  [int]$MaxRuns = 0,              # 0 = forever
  [string]$Audio = "",
  [string]$ApiBase = ""           # falls back to env / built-in default
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSCommandPath
$runsDir = Join-Path $root "_runs"
New-Item -ItemType Directory -Force -Path $runsDir | Out-Null
$log = Join-Path $runsDir "loop.log"

if ($ApiBase) { $env:API_BASE_URL = $ApiBase }

function Write-Line {
  param([string]$Line)
  $stamp = (Get-Date).ToString('s')
  $row = "[$stamp] $Line"
  Add-Content -Path $log -Value $row
  Write-Host $row
}

Write-Line "loop start interval=${IntervalSeconds}s maxRuns=$MaxRuns api=$($env:API_BASE_URL)"

$run = 0
$consecFails = 0
while ($true) {
  $run++
  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  $out = Join-Path $runsDir "smoke-$ts.txt"

  $args = @('tools/agent-test/smoke-api.mjs')
  if ($Audio -and (Test-Path $Audio)) { $args += @('--audio', $Audio) }

  & node @args *> $out
  $code = $LASTEXITCODE

  if ($code -eq 0) {
    $consecFails = 0
    Write-Line "run #$run PASS -> $out"
  } else {
    $consecFails++
    $tail = (Get-Content $out -Tail 8) -join ' | '
    Write-Line "run #$run FAIL exit=$code consec=$consecFails tail: $tail"
  }

  if ($MaxRuns -gt 0 -and $run -ge $MaxRuns) {
    Write-Line "loop end (reached MaxRuns=$MaxRuns)"
    break
  }

  Start-Sleep -Seconds $IntervalSeconds
}
