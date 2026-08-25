#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_PROJECT="${ROOT_DIR}/unity"
UNITY_PATH="${UNITY_PATH:-/Applications/Unity/Hub/Editor/6000.4.5f1/Unity.app/Contents/MacOS/Unity}"
UNITY_VERSION_EXPECTED="6000.4.5f1"
IOS_EXPORT="${UNITY_PROJECT}/Builds/iOS/JustCheckingIn"
ARCHIVE_PATH="${UNITY_PROJECT}/Builds/iOS/JustCheckingIn.xcarchive"
EXPORT_DIR="${UNITY_PROJECT}/Builds/iOS/AppStoreExport"
IPA_PATH="${EXPORT_DIR}/Just Checking In.ipa"
LOG_DIR="${ROOT_DIR}/scripts/_ops-reports"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_PATH="${LOG_DIR}/publish-ios-${RUN_ID}.log"
API_KEY_PATH=""

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_PATH}") 2>&1

fail() { echo "[JCI][FAIL] $*" >&2; exit 1; }
need_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"; }

cleanup_api_key() {
  if [[ -n "${API_KEY_PATH}" && -f "${API_KEY_PATH}" ]]; then
    rm -f "${API_KEY_PATH}"
  fi
}
trap cleanup_api_key EXIT

echo "[JCI] iOS 1.1.0/build 3 publish run ${RUN_ID}"
[[ "$(uname -s)" == "Darwin" ]] || fail "This wrapper must run on macOS with Xcode."
[[ -d "${UNITY_PROJECT}" ]] || fail "Unity project missing: ${UNITY_PROJECT}"
[[ -x "${UNITY_PATH}" ]] || fail "Unity ${UNITY_VERSION_EXPECTED} missing: ${UNITY_PATH}"
need_cmd xcodebuild
need_cmd xcrun

for name in JCI_APPLE_TEAM_ID APPLE_ID APPLE_APP_SPECIFIC_PASSWORD; do
  [[ -n "${!name:-}" ]] || fail "Missing required environment variable: ${name}"
done

XCODE_AUTH_ARGS=()
if [[ -n "${JCI_APPLE_API_KEY_ID:-}" || -n "${JCI_APPLE_API_ISSUER_ID:-}" || -n "${JCI_APPLE_API_PRIVATE_KEY:-}" ]]; then
  for name in JCI_APPLE_API_KEY_ID JCI_APPLE_API_ISSUER_ID JCI_APPLE_API_PRIVATE_KEY; do
    [[ -n "${!name:-}" ]] || fail "All three App Store Connect API key values are required when API-key signing is enabled: JCI_APPLE_API_KEY_ID, JCI_APPLE_API_ISSUER_ID, JCI_APPLE_API_PRIVATE_KEY"
  done
  API_KEY_PATH="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/AuthKey_${JCI_APPLE_API_KEY_ID}.p8"
  umask 077
  printf '%s\n' "${JCI_APPLE_API_PRIVATE_KEY}" > "${API_KEY_PATH}"
  XCODE_AUTH_ARGS=(
    -authenticationKeyPath "${API_KEY_PATH}"
    -authenticationKeyID "${JCI_APPLE_API_KEY_ID}"
    -authenticationKeyIssuerID "${JCI_APPLE_API_ISSUER_ID}"
  )
  echo "[JCI] App Store Connect API-key authentication configured (secret value withheld)"
fi

grep -q 'bundleVersion: 1.1.0' "${UNITY_PROJECT}/ProjectSettings/ProjectSettings.asset" || fail "ProjectSettings is not version 1.1.0"
grep -q 'iPhone: 3' "${UNITY_PROJECT}/ProjectSettings/ProjectSettings.asset" || fail "ProjectSettings is not iOS build 3"
grep -q 'iPhone: com.ftcholding.justcheckingin' "${UNITY_PROJECT}/ProjectSettings/ProjectSettings.asset" || fail "Bundle ID mismatch"

UNITY_VERSION="$("${UNITY_PATH}" -version 2>/dev/null | head -n 1 || true)"
echo "[JCI] Unity: ${UNITY_VERSION}"
[[ "${UNITY_VERSION}" == *"${UNITY_VERSION_EXPECTED}"* ]] || fail "Unity version mismatch; expected ${UNITY_VERSION_EXPECTED}"

echo "[JCI] Stage 1/4: Unity iOS export"
rm -rf "${IOS_EXPORT}" "${ARCHIVE_PATH}" "${EXPORT_DIR}"
mkdir -p "${IOS_EXPORT}"
"${UNITY_PATH}" -batchmode -quit -projectPath "${UNITY_PROJECT}" -buildTarget iOS -executeMethod Jci.Editor.BuildScript.ExportiOS -logFile "${LOG_DIR}/unity-ios-${RUN_ID}.log"
XCODE_PROJECT="${IOS_EXPORT}/Unity-iPhone.xcodeproj"
[[ -d "${XCODE_PROJECT}" ]] || fail "Unity export did not produce ${XCODE_PROJECT}"

echo "[JCI] Stage 2/4: archive"
xcodebuild -project "${XCODE_PROJECT}" -scheme Unity-iPhone -configuration Release \
  -destination generic/platform=iOS -archivePath "${ARCHIVE_PATH}" \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM="${JCI_APPLE_TEAM_ID}" \
  "${XCODE_AUTH_ARGS[@]}" \
  -allowProvisioningUpdates archive

[[ -d "${ARCHIVE_PATH}" ]] || fail "Archive was not created"

EXPORT_OPTIONS="${EXPORT_DIR}/ExportOptions.plist"
mkdir -p "${EXPORT_DIR}"
cat > "${EXPORT_OPTIONS}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>destination</key><string>export</string>
<key>method</key><string>app-store-connect</string>
<key>signingStyle</key><string>automatic</string>
<key>teamID</key><string>${JCI_APPLE_TEAM_ID}</string>
<key>stripSwiftSymbols</key><true/>
<key>compileBitcode</key><false/>
</dict></plist>
PLIST

echo "[JCI] Stage 3/4: export and validate IPA"
xcodebuild -exportArchive -archivePath "${ARCHIVE_PATH}" -exportPath "${EXPORT_DIR}" \
  -exportOptionsPlist "${EXPORT_OPTIONS}" "${XCODE_AUTH_ARGS[@]}" -allowProvisioningUpdates
[[ -f "${IPA_PATH}" ]] || { IPA_PATH="$(find "${EXPORT_DIR}" -maxdepth 1 -name '*.ipa' -print -quit)"; [[ -n "${IPA_PATH}" ]] || fail "IPA was not exported"; }
if ! xcrun altool --validate-app -f "${IPA_PATH}" -t ios -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"; then
  echo "[JCI] altool validation unavailable; using iTMSTransporter validation"
  xcrun iTMSTransporter -m validate -assetFile "${IPA_PATH}" -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"
fi

echo "[JCI] Stage 4/4: upload to App Store Connect"
if ! xcrun altool --upload-app -f "${IPA_PATH}" -t ios -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"; then
  echo "[JCI] altool upload unavailable; using iTMSTransporter upload"
  xcrun iTMSTransporter -m upload -assetFile "${IPA_PATH}" -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"
fi

echo "[JCI] Upload completed. This is not public availability. Confirm build 3 in App Store Connect, submit review with automatic release, then verify the public listing after approval."
echo "[JCI] IPA=${IPA_PATH}"
echo "[JCI] LOG=${LOG_PATH}"
