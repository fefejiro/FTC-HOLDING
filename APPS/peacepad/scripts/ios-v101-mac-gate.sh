#!/usr/bin/env bash

set -euo pipefail

# CocoaPods requires a UTF-8 locale, while non-interactive Mac sessions may
# leave LANG and LC_ALL unset and fall back to ASCII-8BIT.
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

EXPECTED_VERSION="1.0.1"
EXPECTED_BUILD="2"
EXPECTED_BUNDLE_ID="ca.peacepad.family"
EXPECTED_DEVELOPMENT_TEAM="G6UNC88GQ5"
EXPECTED_PROVISIONING_PROFILE="PeacePad App Store 2026"
ARCHIVE_REQUESTED="false"

usage() {
  cat <<'EOF'
Usage: bash scripts/ios-v101-mac-gate.sh [--archive]

Runs the exact PeacePad 1.0.1 (2) Mac release-candidate gate. By default it
builds an unsigned Release simulator target. --archive additionally creates a
signed Xcode archive for privacy-report inspection. This script never exports,
uploads, submits, or changes App Store Connect.
EOF
}

for argument in "$@"; do
  case "$argument" in
    --archive)
      ARCHIVE_REQUESTED="true"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unsupported argument: $argument" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "BLOCKED: this release gate must run on macOS." >&2
  exit 1
fi

for command_name in git node npm xcodebuild; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "BLOCKED: required command is unavailable: $command_name" >&2
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(git -C "$APP_ROOT" rev-parse --show-toplevel)"
COMMIT_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD)"
COMMIT_SHORT="$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
BRANCH_NAME="$(git -C "$REPO_ROOT" branch --show-current)"
EVIDENCE_DIR="$REPO_ROOT/.local/peacepad-ios-v101/$COMMIT_SHORT"
DERIVED_DATA_PATH="$EVIDENCE_DIR/DerivedData"
ARCHIVE_PATH="$EVIDENCE_DIR/PeacePad-${EXPECTED_VERSION}-${EXPECTED_BUILD}.xcarchive"
BUILD_SETTINGS_PATH="$EVIDENCE_DIR/release-build-settings.txt"

mkdir -p "$EVIDENCE_DIR"

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  echo "BLOCKED: the worktree is not clean. Preserve or commit changes before running the gate." >&2
  git -C "$REPO_ROOT" status --short >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$NODE_MAJOR" != "22" ]]; then
  echo "BLOCKED: Node.js 22 is required; found $(node --version)." >&2
  exit 1
fi

cat >"$EVIDENCE_DIR/context.txt" <<EOF
generated_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
commit=$COMMIT_SHA
branch=$BRANCH_NAME
node=$(node --version)
npm=$(npm --version)
xcode=$(xcodebuild -version | tr '\n' ' ')
locale=$LANG
expected_version=$EXPECTED_VERSION
expected_build=$EXPECTED_BUILD
expected_bundle_id=$EXPECTED_BUNDLE_ID
expected_development_team=$EXPECTED_DEVELOPMENT_TEAM
expected_provisioning_profile=$EXPECTED_PROVISIONING_PROFILE
archive_requested=$ARCHIVE_REQUESTED
production_upload_authorized=false
EOF

run_logged() {
  local label="$1"
  shift
  echo
  echo "==> $label"
  "$@" 2>&1 | tee "$EVIDENCE_DIR/$label.log"
}

cd "$APP_ROOT"

run_logged "01-npm-ci" npm ci --workspaces=false
run_logged "02-metadata" npm run verify:app-store-metadata
run_logged "03-candidate-identity" npm run verify:ios-release-candidate
run_logged "04-dependency-audit" npm run verify:dependency-audit
run_logged "05-secret-scan" npm run guard:openai-secrets:all
run_logged "06-typecheck" npm run check
run_logged "07-tests" npm test -- --coverage
run_logged "08-production-build" npm run build
CAPACITOR_BIN="$APP_ROOT/node_modules/.bin/cap"
if [[ ! -x "$CAPACITOR_BIN" ]]; then
  echo "BLOCKED: the local Capacitor CLI is unavailable after npm ci." >&2
  exit 1
fi

run_logged "09-capacitor-sync" "$CAPACITOR_BIN" sync ios

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  echo "BLOCKED: Capacitor sync or a verification step changed tracked release source." >&2
  git -C "$REPO_ROOT" status --short | tee "$EVIDENCE_DIR/generated-drift.txt" >&2
  exit 1
fi

echo
echo "==> 10-release-build-settings"
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -showBuildSettings \
  2>&1 | tee "$BUILD_SETTINGS_PATH"

assert_build_setting() {
  local setting_name="$1"
  local expected_value="$2"
  local actual_value
  actual_value="$(awk -F ' = ' -v key="$setting_name" '$1 ~ "^[[:space:]]*" key "$" { value=$2 } END { print value }' "$BUILD_SETTINGS_PATH")"
  if [[ "$actual_value" != "$expected_value" ]]; then
    echo "BLOCKED: $setting_name expected '$expected_value' but found '$actual_value'." >&2
    exit 1
  fi
  echo "PASS: $setting_name=$actual_value"
}

assert_build_setting "PRODUCT_BUNDLE_IDENTIFIER" "$EXPECTED_BUNDLE_ID"
assert_build_setting "MARKETING_VERSION" "$EXPECTED_VERSION"
assert_build_setting "CURRENT_PROJECT_VERSION" "$EXPECTED_BUILD"
assert_build_setting "DEVELOPMENT_TEAM" "$EXPECTED_DEVELOPMENT_TEAM"
assert_build_setting "CODE_SIGN_IDENTITY" "Apple Distribution"
assert_build_setting "PROVISIONING_PROFILE_SPECIFIER" "$EXPECTED_PROVISIONING_PROFILE"

run_logged "11-release-simulator-build" xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "generic/platform=iOS Simulator" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  CODE_SIGNING_ALLOWED=NO \
  build

if [[ "$ARCHIVE_REQUESTED" == "true" ]]; then
  run_logged "12-device-archive" xcodebuild \
    -workspace ios/App/App.xcworkspace \
    -scheme App \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    archive

  ARCHIVE_INFO_PLIST="$ARCHIVE_PATH/Products/Applications/App.app/Info.plist"
  if [[ ! -f "$ARCHIVE_INFO_PLIST" ]]; then
    echo "BLOCKED: the expected archived app Info.plist was not found." >&2
    exit 1
  fi

  ARCHIVED_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$ARCHIVE_INFO_PLIST")"
  ARCHIVED_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$ARCHIVE_INFO_PLIST")"
  ARCHIVED_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$ARCHIVE_INFO_PLIST")"
  ARCHIVED_TEAM="$(/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:Team' "$ARCHIVE_PATH/Info.plist")"

  if [[ "$ARCHIVED_VERSION" != "$EXPECTED_VERSION" || "$ARCHIVED_BUILD" != "$EXPECTED_BUILD" || "$ARCHIVED_BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" || "$ARCHIVED_TEAM" != "$EXPECTED_DEVELOPMENT_TEAM" ]]; then
    echo "BLOCKED: archived identity does not match the approved candidate." >&2
    exit 1
  fi

  cat >"$EVIDENCE_DIR/archive-identity.txt" <<EOF
version=$ARCHIVED_VERSION
build=$ARCHIVED_BUILD
bundle_id=$ARCHIVED_BUNDLE_ID
development_team=$ARCHIVED_TEAM
archive_path=$ARCHIVE_PATH
upload_performed=false
EOF

  echo
  echo "PASS: signed archive identity is ${ARCHIVED_VERSION} (${ARCHIVED_BUILD}), ${ARCHIVED_BUNDLE_ID}, team ${ARCHIVED_TEAM}."
  echo "MANUAL EVIDENCE GATE: open this archive in Xcode Organizer, control-click it,"
  echo "choose Generate Privacy Report, and retain the report beside:"
  echo "  $EVIDENCE_DIR"
else
  echo
  echo "Archive not requested. Re-run with --archive only when the signing account is available."
fi

cat >"$EVIDENCE_DIR/result.txt" <<EOF
result=PASS
commit=$COMMIT_SHA
version=$EXPECTED_VERSION
build=$EXPECTED_BUILD
bundle_id=$EXPECTED_BUNDLE_ID
simulator_release_build=PASS
archive_requested=$ARCHIVE_REQUESTED
upload_performed=false
EOF

echo
echo "PASS: PeacePad iOS 1.0.1 (2) Mac candidate gate completed."
echo "Evidence: $EVIDENCE_DIR"
echo "No binary was exported, uploaded, or submitted."
