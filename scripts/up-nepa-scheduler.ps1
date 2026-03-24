[CmdletBinding()]
param(
  [int]$EveryMinutes = 15,
  [switch]$Remove
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$StartPath)

  $candidate = (Resolve-Path $StartPath).Path
  while ($candidate -and -not (Test-Path (Join-Path $candidate "scripts\up-nepa.ps1"))) {
    $parent = Split-Path -Parent $candidate
    if ($parent -eq $candidate) {
      $candidate = $null
      break
    }
    $candidate = $parent
  }

  if (-not $candidate) {
    throw "Repo root not found (expected scripts\up-nepa.ps1)."
  }

  return $candidate
}

function Get-TaskSafePath {
  param([string]$Path)

  $resolved = (Resolve-Path $Path).Path
  $quoted = '"' + $resolved + '"'
  $short = cmd /c "for %I in ($quoted) do @echo %~sI"
  $short = ($short | Out-String).Trim()

  if (-not [string]::IsNullOrWhiteSpace($short) -and -not $short.Contains(" ")) {
    return $short
  }

  return '"' + $resolved + '"'
}

$taskName = "OpenClaw Up Nepa"
$repoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
$ps = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$scriptPath = Join-Path $repoRoot "scripts\up-nepa.ps1"
$taskScriptPath = Get-TaskSafePath -Path $scriptPath
$taskCmd = "$ps -ExecutionPolicy Bypass -File $taskScriptPath"

if ($Remove) {
  schtasks /Delete /TN "$taskName" /F | Out-Null
  Write-Host "Removed scheduled task '$taskName'." -ForegroundColor Cyan
  exit 0
}

schtasks /Create /TN "$taskName" /TR "$taskCmd" /SC MINUTE /MO $EveryMinutes /RL LIMITED /F | Out-Null
Write-Host "Scheduled task created: $taskName (every $EveryMinutes minutes)." -ForegroundColor Cyan
