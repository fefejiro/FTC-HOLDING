param(
  [string]$DigestTime = "09:00",
  [int]$ApprovalMinutes = 15,
  [string]$ReminderTime = "16:00",
  [switch]$Remove
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$StartPath)
  $candidate = (Resolve-Path $StartPath).Path
  while ($candidate -and -not (Test-Path (Join-Path $candidate "DOCS\\linkedin"))) {
    $parent = Split-Path -Parent $candidate
    if ($parent -eq $candidate) { $candidate = $null; break }
    $candidate = $parent
  }
  if (-not $candidate) { throw "Repo root not found (expected DOCS\\linkedin)." }
  return $candidate
}

$taskDigest = "UnaLabs LinkedIn Digest"
$taskApprove = "UnaLabs LinkedIn Approvals"
$taskReminder = "UnaLabs LinkedIn Reminder"

$RepoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
$ps = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$digestPath = (Join-Path $RepoRoot "scripts\\unalabs-linkedin-digest.ps1")
$approvePath = (Join-Path $RepoRoot "scripts\\unalabs-linkedin-approvals.ps1")
$reminderPath = (Join-Path $RepoRoot "scripts\\unalabs-linkedin-reminder.ps1")

$digestCmd = "`"$ps`" -ExecutionPolicy Bypass -File `"$digestPath`""
$approveCmd = "`"$ps`" -ExecutionPolicy Bypass -File `"$approvePath`""
$reminderCmd = "`"$ps`" -ExecutionPolicy Bypass -File `"$reminderPath`""

if ($Remove) {
  schtasks /Delete /TN "$taskDigest" /F | Out-Null
  schtasks /Delete /TN "$taskApprove" /F | Out-Null
  schtasks /Delete /TN "$taskReminder" /F | Out-Null
  Write-Host "Removed scheduler tasks." -ForegroundColor Cyan
  exit 0
}

schtasks /Create /TN "$taskDigest" /TR "$digestCmd" /SC WEEKLY /D MON,TUE,WED,THU,FR /ST $DigestTime /RL LIMITED /F | Out-Null
schtasks /Create /TN "$taskApprove" /TR "$approveCmd" /SC MINUTE /MO $ApprovalMinutes /RL LIMITED /F | Out-Null
schtasks /Create /TN "$taskReminder" /TR "$reminderCmd" /SC DAILY /ST $ReminderTime /RL LIMITED /F | Out-Null

Write-Host "Scheduled tasks created." -ForegroundColor Cyan
Write-Host "Digest: $taskDigest at $DigestTime (Mon-Fri)" -ForegroundColor Cyan
Write-Host "Approvals: $taskApprove every $ApprovalMinutes minutes" -ForegroundColor Cyan
Write-Host "Reminder: $taskReminder at $ReminderTime" -ForegroundColor Cyan
