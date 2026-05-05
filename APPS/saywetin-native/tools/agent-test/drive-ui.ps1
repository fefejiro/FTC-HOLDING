# SayWetin UI self-driver: launches the app, taps the orb, captures screenshots
# at each phase so the agent can verify state visuals without founder feedback.
#
# Usage:  pwsh ./tools/agent-test/drive-ui.ps1 -Serial 2B260DLH2000C8
#
# Output: tools/agent-test/_runs/<timestamp>/{idle,listening,matching}.png
#         tools/agent-test/_runs/<timestamp>/logcat.txt

param(
  [string]$Serial = "",
  [string]$AppId = "com.saywetin.app",
  [int]$ListenSeconds = 8
)

$ErrorActionPreference = "Stop"
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) { throw "adb not found at $adb" }

function Adb { param([Parameter(ValueFromRemainingArguments)]$args)
  if ($Serial) { & $adb -s $Serial @args } else { & $adb @args }
}

$root = Split-Path -Parent $PSCommandPath
$runDir = Join-Path $root "_runs\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
Write-Host "Run dir: $runDir"

function Capture {
  param([string]$Name)
  $local = Join-Path $runDir "$Name.png"
  Adb exec-out screencap -p > $local
  Write-Host "  captured $Name.png"
}

# Reset and launch
Adb logcat -c | Out-Null
Adb shell am force-stop $AppId | Out-Null
Adb shell monkey -p $AppId -c android.intent.category.LAUNCHER 1 | Out-Null
Start-Sleep -Seconds 4

# Idle
Capture "01-idle"

# Find orb center via adb screen size
$size = (Adb shell wm size) -replace '.*: ','' -replace 'x',','
$w, $h = $size.Split(',') | ForEach-Object { [int]$_ }
$tapX = [int]($w / 2)
$tapY = [int]($h * 0.45)  # orb is roughly mid-upper

Write-Host "Tapping orb at ($tapX, $tapY)..."
Adb shell input tap $tapX $tapY | Out-Null
Start-Sleep -Milliseconds 800
Capture "02-listening"

# Mid capture
Start-Sleep -Seconds ([Math]::Floor($ListenSeconds / 2))
Capture "03-listening-mid"

# After capture window
Start-Sleep -Seconds ([Math]::Ceiling($ListenSeconds / 2) + 1)
Capture "04-matching-or-result"

Start-Sleep -Seconds 3
Capture "05-final"

Adb logcat -d -s ReactNativeJS:V > (Join-Path $runDir "logcat-js.txt")
Adb logcat -d | Out-File (Join-Path $runDir "logcat-full.txt") -Encoding utf8

Write-Host ""
Write-Host "Screenshots + logs in: $runDir"
Get-ChildItem $runDir | Format-Table Name, Length -AutoSize
