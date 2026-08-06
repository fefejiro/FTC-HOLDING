param(
  [string]$ProjectRoot = "",
  [Parameter(Mandatory=$true)]
  [string]$WorktreeRoot,
  [string]$StateRoot = "",
  [ValidateRange(1, 8)]
  [int]$MaxRunsPerDay = 2,
  [ValidateRange(10, 120)]
  [int]$MaxMinutes = 45,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $StateRoot) { $StateRoot = $ProjectRoot }

$projectPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$worktreePath = (Resolve-Path -LiteralPath $WorktreeRoot).Path
$statePath = (Resolve-Path -LiteralPath $StateRoot).Path
$runtimeDir = Join-Path $statePath ".local\continuous-agent"
$logDir = Join-Path $runtimeDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logDir "continuous-agent-$stamp.log"
$ledgerPath = Join-Path $runtimeDir "runs.jsonl"
$lockPath = Join-Path $runtimeDir "continuous-agent.lock"
$lockStream = $null

function Write-RunLog([string]$Message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  $line | Tee-Object -FilePath $logPath -Append
}

function Add-LedgerEvent([string]$Status, [string]$Detail, [int]$ExitCode) {
  [ordered]@{
    timestamp = (Get-Date).ToString("o")
    date = (Get-Date).ToString("yyyy-MM-dd")
    status = $Status
    detail = $Detail
    exitCode = $ExitCode
    worktree = $worktreePath
    branch = (& git -C $worktreePath branch --show-current 2>$null)
    dryRun = [bool]$DryRun
  } | ConvertTo-Json -Compress | Add-Content -LiteralPath $ledgerPath -Encoding UTF8
}

try {
  try {
    $lockStream = [System.IO.File]::Open(
      $lockPath,
      [System.IO.FileMode]::OpenOrCreate,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
  } catch {
    Write-RunLog "Skipped: another continuous product-agent run owns the lock."
    exit 0
  }

  Write-RunLog "JobAgent continuous product run starting."
  Write-RunLog "ProjectRoot=$projectPath"
  Write-RunLog "WorktreeRoot=$worktreePath"
  Write-RunLog "StateRoot=$statePath"
  Write-RunLog "Authority=product engineering only; live email, applications, deployment, secrets, billing, and account changes prohibited"

  $branch = (& git -C $worktreePath branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $branch -notlike "agent/job-agent-continuous*") {
    throw "Refusing to run outside an agent/job-agent-continuous* branch. Current branch: '$branch'."
  }

  $dirty = @(& git -C $worktreePath status --porcelain)
  if ($LASTEXITCODE -ne 0) { throw "Unable to inspect the continuous-agent worktree." }
  if ($dirty.Count -gt 0) {
    Write-RunLog "Blocked: the dedicated worktree is dirty. Preserve and review these changes before retrying:"
    $dirty | Tee-Object -FilePath $logPath -Append
    Add-LedgerEvent "blocked_dirty_worktree" "Dedicated worktree contains uncommitted changes." 20
    exit 20
  }

  $repoRoot = Split-Path -Parent (Split-Path -Parent $projectPath)
  $agentPath = Join-Path $repoRoot ".github\agents\jobagent-continuous-operator.agent.md"
  $backlogPath = Join-Path $projectPath "ops\CONTINUOUS_AGENT_BACKLOG.md"
  if (-not (Test-Path -LiteralPath $agentPath)) { throw "Missing agent policy: $agentPath" }
  if (-not (Test-Path -LiteralPath $backlogPath)) { throw "Missing continuous backlog: $backlogPath" }

  $pendingItems = @(Select-String -LiteralPath $backlogPath -Pattern '^- \[ \] ')
  if ($pendingItems.Count -eq 0) {
    Write-RunLog "Complete: no unchecked engineering backlog items remain."
    Add-LedgerEvent "no_work" "No unchecked backlog items remain." 0
    exit 0
  }

  $today = (Get-Date).ToString("yyyy-MM-dd")
  $todayRuns = 0
  if (Test-Path -LiteralPath $ledgerPath) {
    $todayRuns = @(Get-Content -LiteralPath $ledgerPath | Where-Object {
      $_ -match ('\"date\":\"' + [regex]::Escape($today) + '\"') -and
      $_ -match '\"status\":\"started\"'
    }).Count
  }
  if ($todayRuns -ge $MaxRunsPerDay) {
    Write-RunLog "Skipped: daily run cap of $MaxRunsPerDay reached."
    Add-LedgerEvent "daily_cap" "Daily run cap reached." 0
    exit 0
  }

  $codex = Get-Command codex -ErrorAction Stop
  $loginStatus = (& cmd.exe /d /s /c "`"$($codex.Source)`" login status 2>&1" | Out-String).Trim()
  $loginExitCode = $LASTEXITCODE
  if ($loginExitCode -ne 0 -or $loginStatus -notmatch "Logged in") {
    Write-RunLog "Blocked: Codex CLI is not authenticated. $loginStatus"
    Add-LedgerEvent "blocked_auth" "Codex CLI authentication is required." 21
    exit 21
  }

  Write-RunLog "Codex=$($codex.Source)"
  Write-RunLog "Branch=$branch"
  Write-RunLog "PendingItems=$($pendingItems.Count); MaxRunsPerDay=$MaxRunsPerDay; MaxMinutes=$MaxMinutes"

  if ($DryRun) {
    Write-RunLog "DRY RUN PASS: all unattended-run safety gates passed; Codex was not invoked."
    Add-LedgerEvent "dry_run_pass" "All safety gates passed; no model invocation." 0
    exit 0
  }

  Add-LedgerEvent "started" "Codex product-engineering run started." 0
  $promptPath = Join-Path $runtimeDir "prompt-$stamp.txt"
  $jsonPath = Join-Path $logDir "continuous-agent-$stamp.jsonl"
  $errorPath = Join-Path $logDir "continuous-agent-$stamp.stderr.log"
  $resultPath = Join-Path $logDir "continuous-agent-$stamp.result.md"
  @"
Read .github/agents/jobagent-continuous-operator.agent.md and APPS/job-reply-agent/ops/CONTINUOUS_AGENT_BACKLOG.md before acting.

This is an unattended, product-engineering-only run. Select exactly one highest-priority unchecked item in the Safe Autonomous Queue. Inspect the current implementation before editing. Implement the smallest coherent change, add or update focused tests, run relevant verification, update only that backlog item's checkbox and evidence note, and commit only your intentional changes with a descriptive JobAgent commit message.

Hard boundaries: do not send or draft live email; do not browse or submit job applications; do not operate authenticated browsers; do not deploy; do not modify production, DNS, OAuth, secrets, tokens, billing, legal terms, user data, scheduler registrations, or candidate operational state. Do not weaken identity, proof, CAPTCHA, tenant isolation, approval, or privacy controls. Do not push. Do not touch files outside APPS/job-reply-agent except the JobAgent agent policy when the selected item explicitly requires it. Stop safely if the item requires credentials, live services, user input, or an external action. Keep the worktree clean by committing successful work; on failure, preserve evidence and explain the blocker in the final response.
"@ | Set-Content -LiteralPath $promptPath -Encoding UTF8

  $arguments = @(
    "exec", "--sandbox", "workspace-write", "--ask-for-approval", "never",
    "-C", ('"' + $worktreePath + '"'),
    "--output-last-message", ('"' + $resultPath + '"'),
    "--json", "-"
  )
  $process = Start-Process -FilePath $codex.Source -ArgumentList $arguments `
    -RedirectStandardInput $promptPath -RedirectStandardOutput $jsonPath `
    -RedirectStandardError $errorPath -WindowStyle Hidden -PassThru

  if (-not $process.WaitForExit($MaxMinutes * 60 * 1000)) {
    try { $process.Kill($true) } catch { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    Write-RunLog "Timed out after $MaxMinutes minutes; process terminated."
    Add-LedgerEvent "timed_out" "Codex process exceeded the runtime limit." 22
    exit 22
  }

  if ($process.ExitCode -ne 0) {
    Write-RunLog "Codex exited with code $($process.ExitCode). See $errorPath and $jsonPath."
    Add-LedgerEvent "failed" "Codex exited with code $($process.ExitCode)." $process.ExitCode
    exit $process.ExitCode
  }

  $after = @(& git -C $worktreePath status --porcelain)
  if ($after.Count -gt 0) {
    Write-RunLog "Codex completed but left the worktree dirty; manual review required."
    $after | Tee-Object -FilePath $logPath -Append
    Add-LedgerEvent "needs_review" "Successful process left uncommitted changes." 23
    exit 23
  }

  $head = (& git -C $worktreePath log -1 --oneline).Trim()
  Write-RunLog "PASS: unattended engineering run completed with clean worktree. HEAD=$head"
  Add-LedgerEvent "completed" $head 0
  exit 0
} catch {
  Write-RunLog "FAILED: $($_.Exception.Message)"
  Add-LedgerEvent "failed_preflight" $_.Exception.Message 24
  exit 24
} finally {
  if ($lockStream) { $lockStream.Dispose() }
}
