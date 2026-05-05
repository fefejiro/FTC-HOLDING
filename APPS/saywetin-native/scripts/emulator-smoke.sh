#!/usr/bin/env bash
# Smoke check: verify app launches and has no fatal crashes on the emulator.
# Called from the android-emulator-runner script: block in CI.
set -euo pipefail

echo "--- Smoke check: waiting up to 20s for app process ---"
for i in $(seq 1 20); do
  if adb shell pidof com.saywetin.app >/dev/null 2>&1; then
    echo "App process alive (check $i/20)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "App process not found after 20s — dumping logcat"
    adb logcat -d | tail -n 200
    exit 1
  fi
  sleep 1
done

echo "--- Smoke check: scanning logcat for fatal crashes ---"
if adb logcat -d | grep -Eq "FATAL EXCEPTION|Process: com\.saywetin\.app.*has died"; then
  echo "Fatal crash detected in logcat — dumping last 300 lines"
  adb logcat -d | tail -n 300
  exit 1
fi

echo "--- Smoke check passed ---"
