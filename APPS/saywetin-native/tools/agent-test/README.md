# Agent self-test toolkit

Three layers, smallest blast radius first.

## 1. Backend-only smoke (no device needed)

Verifies `/api/health` + `/api/identify-by-text` against the deployed
Railway service. Ideal for unattended monitoring while the founder is AFK.

One-shot:

```powershell
Set-Location "c:\FTC HOLDING\APPS\saywetin-native"
node tools/agent-test/smoke-api.mjs
```

Loop forever (every 5 min, results in `_runs/`):

```powershell
pwsh tools/agent-test/loop.ps1
# or override
pwsh tools/agent-test/loop.ps1 -IntervalSeconds 600 -ApiBase "https://saywetin-api-production.up.railway.app"
```

Stop with `Ctrl-C`. Inspect results:

```powershell
Get-Content tools/agent-test/_runs/loop.log -Tail 20
Get-ChildItem tools/agent-test/_runs/smoke-*.txt | Sort LastWriteTime -Desc | Select -First 1 | Get-Content
```

> Note: `identify-by-text` will fail until `AI_INTEGRATIONS_OPENAI_API_KEY`
> is set on the Railway service. The loop will keep going so you can spot
> the moment the key starts working.

## 2. UI driver (requires a connected device or emulator)

`drive-ui.ps1` launches the app, taps the orb, and screenshots each
state. Needs `adb` + an attached device or a running emulator.

```powershell
pwsh tools/agent-test/drive-ui.ps1 -Serial 2B260DLH2000C8
```

## 3. Headless Android emulator (future — not yet provisioned)

To run UI driver fully unattended on this machine you need an AVD.
Bootstrap (one-time, ~3 GB download):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" "emulator" "system-images;android-34;google_apis;x86_64"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\avdmanager.bat" create avd -n saywetin_pixel -k "system-images;android-34;google_apis;x86_64" -d pixel
```

Launch headless:

```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd saywetin_pixel -no-window -no-audio -gpu swiftshader_indirect &
& "$env:ANDROID_HOME\platform-tools\adb.exe" wait-for-device
pwsh tools/agent-test/drive-ui.ps1
```

If `cmdline-tools` is missing, install via Android Studio →
SDK Manager → SDK Tools → Android SDK Command-line Tools.
