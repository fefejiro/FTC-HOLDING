$ErrorActionPreference = "Stop"

$expectedProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverPath = Join-Path $expectedProjectRoot "Server"
$port = 3000

function Get-ListeningPid {
  try {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $conn) { return $null }
    return [int]$conn.OwningProcess
  } catch {
    return $null
  }
}

function Test-PortListening {
  return ($null -ne (Get-ListeningPid))
}

function Try-GetHealth {
  try {
    return Invoke-RestMethod -Method Get -Uri "http://localhost:$port/health" -TimeoutSec 2
  } catch {
    return $null
  }
}

function Show-LauncherError($message) {
  try {
    Add-Type -AssemblyName PresentationFramework | Out-Null
    [System.Windows.MessageBox]::Show($message, "ATEAM Launcher", "OK", "Error") | Out-Null
  } catch {
    Write-Host $message
  }
}

function Start-AteamServer {
  # Keep launch "push-button clean": start server in a hidden window.
  Start-Process -WindowStyle Hidden -WorkingDirectory $expectedProjectRoot -FilePath "npm.cmd" -ArgumentList "run", "start:server"
}

if (Test-PortListening) {
  $health = Try-GetHealth
  if ($null -eq $health -or -not $health.ok) {
    Show-LauncherError "Port $port is already in use, but it does not look like ATEAM (GET /health failed). Close the other app or change ATEAM PORT."
    exit 1
  }

  $runningRoot = [string]$health.projectRoot
  if (-not $runningRoot) {
    Show-LauncherError "ATEAM is responding on port $port, but /health did not include projectRoot. Refusing to restart."
    exit 1
  }

  $resolvedRunningRoot = (Resolve-Path $runningRoot).Path
  if ($resolvedRunningRoot -ne $expectedProjectRoot) {
    $pid = Get-ListeningPid
    if ($null -eq $pid) {
      Show-LauncherError "ATEAM mismatch detected, but could not resolve the listening PID on port $port."
      exit 1
    }
    Stop-Process -Id $pid -Force
    Start-Sleep -Milliseconds 350
    Start-AteamServer
  }
} else {
  Start-AteamServer
}

$deadline = [DateTime]::UtcNow.AddSeconds(18)
while ([DateTime]::UtcNow -lt $deadline) {
  $health = Try-GetHealth
  if ($null -ne $health -and $health.ok) {
    $runningRoot = [string]$health.projectRoot
    if ($runningRoot) {
      $resolvedRunningRoot = (Resolve-Path $runningRoot).Path
      if ($resolvedRunningRoot -eq $expectedProjectRoot) { break }
    }
  }
  Start-Sleep -Milliseconds 350
}

$finalHealth = Try-GetHealth
if ($null -eq $finalHealth -or -not $finalHealth.ok) {
  Show-LauncherError "ATEAM did not become healthy on http://localhost:$port/health within the timeout."
  exit 1
}

$finalRoot = (Resolve-Path ([string]$finalHealth.projectRoot)).Path
if ($finalRoot -ne $expectedProjectRoot) {
  Show-LauncherError "ATEAM is running, but projectRoot mismatch remains. Expected:`n$expectedProjectRoot`nGot:`n$finalRoot"
  exit 1
}

$ts = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$uri = "http://localhost:$port/office?ts=$ts"
Start-Process $uri
