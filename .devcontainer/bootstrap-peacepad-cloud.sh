#!/usr/bin/env bash
set -euo pipefail

# Codespaces is a development/test surface. Keep store submission, deployment,
# signing material, and production secrets outside this bootstrap path.
readonly APP_DIR="APPS/peacepad-next-native"

echo "FTC-HOLDING Cloud Dev: preparing the PeacePad Native workspace"
node --version
npm --version

if [[ ! -f "$APP_DIR/package-lock.json" ]]; then
  echo "Missing $APP_DIR/package-lock.json; refusing an unpinned install." >&2
  exit 1
fi

npm --prefix "$APP_DIR" ci --ignore-scripts
npm --prefix "$APP_DIR" run guardrails
npm --prefix "$APP_DIR" run secret-scan

cat <<'EOF'

PeacePad cloud workspace is ready.
Useful commands:
  npm --prefix APPS/peacepad-next-native run typecheck
  npm --prefix APPS/peacepad-next-native test -- --runInBand
  npm --prefix APPS/peacepad-next-native start

This environment does not hold production secrets, device tooling, signing
credentials, store submission access, or production deployment commands.
EOF
