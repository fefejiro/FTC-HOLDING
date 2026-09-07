param(
  [string]$RequiredRailwayProject = "una-jobagent",
  [string]$PublicBaseUrl = "https://jobagent.unalabs.cloud",
  [double]$MinimumSystemDriveFreeGb = 10,
  [switch]$AllowDirtyWorktree
)

$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot

function Add-Check {
  param([string]$Name, [bool]$Passed, [string]$Detail)
  $script:checks.Add([pscustomobject]@{
    name = $Name
    passed = $Passed
    detail = $Detail
  })
}

function Invoke-TextCommand {
  param([string]$Command)
  $output = & cmd.exe /d /s /c $Command 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed: $($output -join ' ')"
  }
  return ($output -join "`n").Trim()
}

function Get-HttpStatus {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -MaximumRedirection 3 -TimeoutSec 20 -UseBasicParsing
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    return 0
  }
}

$checks = [System.Collections.Generic.List[object]]::new()
$systemDriveName = $env:SystemDrive.TrimEnd(':')
$systemDrive = Get-PSDrive -Name $systemDriveName
$freeGb = [math]::Round($systemDrive.Free / 1GB, 2)
Add-Check "system_drive_headroom" ($freeGb -ge $MinimumSystemDriveFreeGb) "$($env:SystemDrive) has $freeGb GB free; requires $MinimumSystemDriveFreeGb GB"

$head = Invoke-TextCommand "git -C `"$appRoot`" rev-parse HEAD"
$branch = Invoke-TextCommand "git -C `"$appRoot`" branch --show-current"
$dirty = Invoke-TextCommand "git -C `"$appRoot`" status --porcelain"
Add-Check "git_revision" ([bool]$head) "$branch at $head"
Add-Check "git_worktree" ($AllowDirtyWorktree -or -not $dirty) $(if ($dirty) { "worktree has uncommitted changes" } else { "worktree is clean" })

$railwayAvailable = [bool](Get-Command railway -ErrorAction SilentlyContinue)
Add-Check "railway_cli" $railwayAvailable $(if ($railwayAvailable) { "Railway CLI is available" } else { "Railway CLI is not available" })

if ($railwayAvailable) {
  try {
    $identity = Invoke-TextCommand "railway whoami"
    Add-Check "railway_identity" ([bool]$identity) $identity
    $projects = Invoke-TextCommand "railway list"
    $hasRequiredProject = $projects -match "(?m)^\s*$([regex]::Escape($RequiredRailwayProject))\s*$"
    Add-Check "railway_project" $hasRequiredProject $(if ($hasRequiredProject) { "exact project '$RequiredRailwayProject' is visible" } else { "exact project '$RequiredRailwayProject' is not visible; deployment must stop" })
  } catch {
    Add-Check "railway_identity" $false $_.Exception.Message
    Add-Check "railway_project" $false "project visibility could not be verified"
  }
}

foreach ($route in @("/edgez", "/healthz", "/readyz", "/api/v1/release")) {
  $status = Get-HttpStatus "$($PublicBaseUrl.TrimEnd('/'))$route"
  $expected = if ($route -eq "/edgez") { 200 } else { 200 }
  Add-Check "hosted$route" ($status -eq $expected) "HTTP $status"
}

$failed = @($checks | Where-Object { -not $_.passed })
$result = [pscustomobject]@{
  ready = $failed.Count -eq 0
  checked_at = [DateTimeOffset]::Now.ToString("o")
  branch = $branch
  commit_sha = $head
  required_railway_project = $RequiredRailwayProject
  public_base_url = $PublicBaseUrl
  checks = $checks
}

$result | ConvertTo-Json -Depth 5
if ($failed.Count -gt 0) { exit 1 }
