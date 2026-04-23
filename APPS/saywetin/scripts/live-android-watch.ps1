param(
	[string]$PackageName = "com.saywetin.app",
	[switch]$Launch,
	[switch]$Clear,
	[string[]]$Patterns = @(
		"AndroidRuntime",
		"FATAL EXCEPTION",
		"NameNotFoundException",
		"AppLocalesMetadataHolderService",
		"Capacitor",
		"com.saywetin.app"
	)
)

function Resolve-AdbPath {
	$candidates = @(
		"$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
		"$env:ANDROID_HOME\platform-tools\adb.exe",
		"$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
	)

	foreach ($candidate in $candidates) {
		if ($candidate -and (Test-Path $candidate)) {
			return $candidate
		}
	}

	throw "ADB not found. Install Android platform-tools or set ANDROID_HOME/ANDROID_SDK_ROOT."
}

$adb = Resolve-AdbPath

if ($Clear) {
	& $adb logcat -c
}

if ($Launch) {
	& $adb shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1 | Out-Null
}

Write-Output "Watching Android logs for $PackageName"
Write-Output "Filters: $($Patterns -join ', ')"
Write-Output "Press Ctrl+C to stop"

$escaped = $Patterns | ForEach-Object { [regex]::Escape($_) }
$regex = ($escaped -join "|")

& $adb logcat -v time | Select-String -Pattern $regex

