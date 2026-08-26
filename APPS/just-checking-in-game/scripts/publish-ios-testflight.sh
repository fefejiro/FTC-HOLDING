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
CERTIFICATE_PATH=""
KEYCHAIN_PATH=""
KEYCHAIN_PASSWORD=""
PROVISIONING_PROFILE_PATH=""
PROVISIONING_PROFILE_PLIST=""

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_PATH}") 2>&1

fail() { echo "[JCI][FAIL] $*" >&2; exit 1; }
need_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"; }

cleanup_api_key() {
  if [[ -n "${API_KEY_PATH}" && -f "${API_KEY_PATH}" ]]; then
    rm -f "${API_KEY_PATH}"
  fi
}
cleanup_signing_material() {
  if [[ -n "${CERTIFICATE_PATH}" && -f "${CERTIFICATE_PATH}" ]]; then
    rm -f "${CERTIFICATE_PATH}"
  fi
  if [[ -n "${KEYCHAIN_PATH}" && -f "${KEYCHAIN_PATH}" ]]; then
    security delete-keychain "${KEYCHAIN_PATH}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${PROVISIONING_PROFILE_PATH}" && -f "${PROVISIONING_PROFILE_PATH}" ]]; then
    rm -f "${PROVISIONING_PROFILE_PATH}"
  fi
  if [[ -n "${PROVISIONING_PROFILE_PLIST}" && -f "${PROVISIONING_PROFILE_PLIST}" ]]; then
    rm -f "${PROVISIONING_PROFILE_PLIST}"
  fi
}
trap 'cleanup_api_key; cleanup_signing_material' EXIT

echo "[JCI] iOS 1.1.0/build 3 publish run ${RUN_ID}"
[[ "$(uname -s)" == "Darwin" ]] || fail "This wrapper must run on macOS with Xcode."
[[ -d "${UNITY_PROJECT}" ]] || fail "Unity project missing: ${UNITY_PROJECT}"
[[ -x "${UNITY_PATH}" ]] || fail "Unity ${UNITY_VERSION_EXPECTED} missing: ${UNITY_PATH}"
need_cmd xcodebuild
need_cmd xcrun
need_cmd node

XCODE_AUTH_ARGS=()
HAS_API_KEY_AUTH=false
if [[ -n "${JCI_APPLE_API_KEY_ID:-}" || -n "${JCI_APPLE_API_ISSUER_ID:-}" || -n "${JCI_APPLE_API_PRIVATE_KEY:-}" ]]; then
  for name in JCI_APPLE_API_KEY_ID JCI_APPLE_API_ISSUER_ID JCI_APPLE_API_PRIVATE_KEY; do
    [[ -n "${!name:-}" ]] || fail "All three App Store Connect API key values are required when API-key signing is enabled: JCI_APPLE_API_KEY_ID, JCI_APPLE_API_ISSUER_ID, JCI_APPLE_API_PRIVATE_KEY"
  done
  HAS_API_KEY_AUTH=true
  API_KEY_PATH="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/AuthKey_${JCI_APPLE_API_KEY_ID}.p8"
  umask 077
  printf '%s\n' "${JCI_APPLE_API_PRIVATE_KEY}" > "${API_KEY_PATH}"
  XCODE_AUTH_ARGS=(
    -authenticationKeyPath "${API_KEY_PATH}"
    -authenticationKeyID "${JCI_APPLE_API_KEY_ID}"
    -authenticationKeyIssuerID "${JCI_APPLE_API_ISSUER_ID}"
  )
  echo "[JCI] App Store Connect API-key authentication configured (secret value withheld)"
else
  for name in JCI_APPLE_TEAM_ID APPLE_ID APPLE_APP_SPECIFIC_PASSWORD; do
    [[ -n "${!name:-}" ]] || fail "Missing required environment variable: ${name}"
  done
fi
[[ -n "${JCI_APPLE_TEAM_ID:-}" ]] || fail "Missing required environment variable: JCI_APPLE_TEAM_ID"
[[ -n "${JCI_SIGNING_CERTIFICATE_BASE64:-}" ]] || fail "Missing required environment variable: JCI_SIGNING_CERTIFICATE_BASE64"
[[ -n "${JCI_SIGNING_CERTIFICATE_PASSWORD:-}" ]] || fail "Missing required environment variable: JCI_SIGNING_CERTIFICATE_PASSWORD"
[[ -n "${JCI_SIGNING_KEYCHAIN_PASSWORD:-}" ]] || fail "Missing required environment variable: JCI_SIGNING_KEYCHAIN_PASSWORD"

grep -q 'bundleVersion: 1.1.0' "${UNITY_PROJECT}/ProjectSettings/ProjectSettings.asset" || fail "ProjectSettings is not version 1.1.0"
grep -q 'iPhone: 3' "${UNITY_PROJECT}/ProjectSettings/ProjectSettings.asset" || fail "ProjectSettings is not iOS build 3"
grep -q 'iPhone: com.ftcholding.justcheckingin' "${UNITY_PROJECT}/ProjectSettings/ProjectSettings.asset" || fail "Bundle ID mismatch"

UNITY_VERSION="$("${UNITY_PATH}" -version 2>/dev/null | head -n 1 || true)"
echo "[JCI] Unity: ${UNITY_VERSION}"
[[ "${UNITY_VERSION}" == *"${UNITY_VERSION_EXPECTED}"* ]] || fail "Unity version mismatch; expected ${UNITY_VERSION_EXPECTED}"

echo "[JCI] Importing the existing team distribution certificate"
CERTIFICATE_PATH="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/jci-distribution.p12"
if ! printf '%s' "${JCI_SIGNING_CERTIFICATE_BASE64}" | base64 --decode > "${CERTIFICATE_PATH}" 2>/dev/null; then
  printf '%s' "${JCI_SIGNING_CERTIFICATE_BASE64}" | base64 -D > "${CERTIFICATE_PATH}"
fi
KEYCHAIN_PATH="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/jci-signing.keychain-db"
KEYCHAIN_PASSWORD="${JCI_SIGNING_KEYCHAIN_PASSWORD}"
security create-keychain -p "${KEYCHAIN_PASSWORD}" "${KEYCHAIN_PATH}"
security set-keychain-settings -lut 21600 "${KEYCHAIN_PATH}"
security unlock-keychain -p "${KEYCHAIN_PASSWORD}" "${KEYCHAIN_PATH}"
security import "${CERTIFICATE_PATH}" -P "${JCI_SIGNING_CERTIFICATE_PASSWORD}" -A -t cert -f pkcs12 -k "${KEYCHAIN_PATH}"
security set-key-partition-list -S apple-tool:,apple: -s -k "${KEYCHAIN_PASSWORD}" "${KEYCHAIN_PATH}"
security list-keychains -d user -s "${KEYCHAIN_PATH}"
security default-keychain -s "${KEYCHAIN_PATH}"
security find-identity -v -p codesigning "${KEYCHAIN_PATH}" | grep -Eq 'Apple Distribution|iPhone Distribution' || fail "Existing distribution certificate was not imported"

echo "[JCI] Downloading the existing active JCI App Store provisioning profile"
PROVISIONING_PROFILE_PATH="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/jci-appstore.mobileprovision"
export JCI_PROVISIONING_PROFILE_PATH="${PROVISIONING_PROFILE_PATH}"
node "${ROOT_DIR}/scripts/download-existing-app-store-profile.mjs"
[[ -s "${PROVISIONING_PROFILE_PATH}" ]] || fail "Existing JCI App Store provisioning profile was not downloaded"
PROFILE_INSTALL_DIR="${HOME}/Library/MobileDevice/Provisioning Profiles"
mkdir -p "${PROFILE_INSTALL_DIR}"
PROVISIONING_PROFILE_PLIST="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/jci-appstore-profile.plist"
security cms -D -i "${PROVISIONING_PROFILE_PATH}" > "${PROVISIONING_PROFILE_PLIST}"
PROFILE_UUID="$(/usr/libexec/PlistBuddy -c 'Print :UUID' "${PROVISIONING_PROFILE_PLIST}")"
PROFILE_NAME="$(/usr/libexec/PlistBuddy -c 'Print :Name' "${PROVISIONING_PROFILE_PLIST}")"
PROFILE_APP_ID="$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "${PROVISIONING_PROFILE_PLIST}")"
[[ "${PROFILE_APP_ID}" == "${JCI_APPLE_TEAM_ID}.com.ftcholding.justcheckingin" ]] || fail "Downloaded profile does not match the JCI bundle ID"
[[ "${PROFILE_NAME}" == "Just Checking In App Store 2026 Release" ]] || fail "Downloaded profile name is not the approved existing JCI release profile"
cp "${PROVISIONING_PROFILE_PATH}" "${PROFILE_INSTALL_DIR}/${PROFILE_UUID}.mobileprovision"
echo "[JCI] Existing JCI App Store profile installed: ${PROFILE_NAME}"

XCODE_PROJECT="${IOS_EXPORT}/Unity-iPhone.xcodeproj"
if [[ "${JCI_SKIP_UNITY_EXPORT:-false}" == "true" ]]; then
  echo "[JCI] Stage 1/4: Unity iOS export (reusing verified GameCI export)"
  [[ -d "${XCODE_PROJECT}" ]] || fail "Verified GameCI export missing: ${XCODE_PROJECT}"
else
  echo "[JCI] Stage 1/4: Unity iOS export"
  rm -rf "${IOS_EXPORT}"
  mkdir -p "${IOS_EXPORT}"
  "${UNITY_PATH}" -batchmode -quit -projectPath "${UNITY_PROJECT}" -buildTarget iOS -executeMethod Jci.Editor.BuildScript.ExportiOS -logFile "${LOG_DIR}/unity-ios-${RUN_ID}.log"
  [[ -d "${XCODE_PROJECT}" ]] || fail "Unity export did not produce ${XCODE_PROJECT}"
fi
rm -rf "${ARCHIVE_PATH}" "${EXPORT_DIR}"

echo "[JCI] Stage 2/4: archive"
xcodebuild -project "${XCODE_PROJECT}" -scheme Unity-iPhone -configuration Release \
  -destination generic/platform=iOS -archivePath "${ARCHIVE_PATH}" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
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
<key>signingStyle</key><string>manual</string>
<key>teamID</key><string>${JCI_APPLE_TEAM_ID}</string>
<key>provisioningProfiles</key><dict>
<key>com.ftcholding.justcheckingin</key><string>${PROFILE_NAME}</string>
</dict>
<key>stripSwiftSymbols</key><true/>
<key>compileBitcode</key><false/>
</dict></plist>
PLIST

echo "[JCI] Stage 3/4: export and validate IPA"
xcodebuild -exportArchive -archivePath "${ARCHIVE_PATH}" -exportPath "${EXPORT_DIR}" \
  -exportOptionsPlist "${EXPORT_OPTIONS}"
[[ -f "${IPA_PATH}" ]] || { IPA_PATH="$(find "${EXPORT_DIR}" -maxdepth 1 -name '*.ipa' -print -quit)"; [[ -n "${IPA_PATH}" ]] || fail "IPA was not exported"; }
if [[ "${HAS_API_KEY_AUTH}" == true ]]; then
  xcrun iTMSTransporter -m validate -assetFile "${IPA_PATH}" \
    -apiKey "${JCI_APPLE_API_KEY_ID}" -apiIssuer "${JCI_APPLE_API_ISSUER_ID}"
elif ! xcrun altool --validate-app -f "${IPA_PATH}" -t ios -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"; then
  echo "[JCI] altool validation unavailable; using iTMSTransporter validation"
  xcrun iTMSTransporter -m validate -assetFile "${IPA_PATH}" -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"
fi

echo "[JCI] Stage 4/4: upload to App Store Connect"
if [[ "${HAS_API_KEY_AUTH}" == true ]]; then
  xcrun iTMSTransporter -m upload -assetFile "${IPA_PATH}" \
    -apiKey "${JCI_APPLE_API_KEY_ID}" -apiIssuer "${JCI_APPLE_API_ISSUER_ID}"
elif ! xcrun altool --upload-app -f "${IPA_PATH}" -t ios -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"; then
  echo "[JCI] altool upload unavailable; using iTMSTransporter upload"
  xcrun iTMSTransporter -m upload -assetFile "${IPA_PATH}" -u "${APPLE_ID}" -p "${APPLE_APP_SPECIFIC_PASSWORD}"
fi

echo "[JCI] Upload completed. This is not public availability. Confirm build 3 in App Store Connect, submit review with automatic release, then verify the public listing after approval."
echo "[JCI] IPA=${IPA_PATH}"
echo "[JCI] LOG=${LOG_PATH}"
