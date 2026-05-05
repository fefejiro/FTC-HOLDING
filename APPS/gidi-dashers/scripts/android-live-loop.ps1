param(
  [string]$PackageName = "com.ftcholding.gididashers",
  [int]$MonkeyEvents = 240,
  [int]$ThrottleMs = 80
)

$ErrorActionPreference = "Stop"

$root = "C:\FTC HOLDING\APPS\gidi-dashers"
$outDir = Join-Path $root "test-results"
if (!(Test-Path $outDir)) { New-Item -Path $outDir -ItemType Directory | Out-Null }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$report = Join-Path $outDir "android-live-loop-$stamp.txt"
$screenshot = Join-Path $outDir "android-live-loop-$stamp.png"

function Write-Section([string]$title) {
  Add-Content -Path $report -Value ""
  Add-Content -Path $report -Value "=== $title ==="
}

"Android live loop report: $stamp" | Set-Content -Path $report -Encoding UTF8

Write-Section "ADB devices"
adb devices -l | Out-String | Add-Content -Path $report

Write-Section "Launch app"
adb shell am force-stop $PackageName | Out-Null
adb shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1 | Out-String | Add-Content -Path $report

Write-Section "Top activity"
adb shell dumpsys activity activities | Select-String "ResumedActivity|TranslucentCustomTabActivity|$PackageName/.LauncherActivity" | Out-String | Add-Content -Path $report

Write-Section "Reset gfxinfo"
adb shell dumpsys gfxinfo $PackageName reset | Out-String | Add-Content -Path $report

Write-Section "Clear logcat"
adb logcat -c
"logcat cleared" | Add-Content -Path $report

Write-Section "Monkey stress"
adb shell monkey -p $PackageName --throttle $ThrottleMs $MonkeyEvents | Out-String | Add-Content -Path $report

Write-Section "gfxinfo summary"
adb shell dumpsys gfxinfo $PackageName | Select-String "Total frames rendered|Janky frames|50th percentile|90th percentile|95th percentile|99th percentile" | Out-String | Add-Content -Path $report

Write-Section "Relevant log lines"
$log = adb logcat -d -v brief
$patterns = @(
  $PackageName,
  "chromium",
  "FATAL EXCEPTION",
  "ANR",
  "Render warning",
  "gles2_cmd_decoder",
  "WebGL",
  "Choreographer",
  "Skipped"
)
$hits = $log | Select-String -Pattern ($patterns -join "|")
if ($hits) {
  $hits | Select-Object -First 400 | Out-String | Add-Content -Path $report
} else {
  "No matching warning/error lines found." | Add-Content -Path $report
}

Write-Section "Screenshot"
adb exec-out screencap -p > $screenshot
"screenshot: $screenshot" | Add-Content -Path $report

Write-Output "Report: $report"
Write-Output "Screenshot: $screenshot"
