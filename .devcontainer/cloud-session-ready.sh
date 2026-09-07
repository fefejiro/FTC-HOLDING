#!/usr/bin/env bash
set -euo pipefail

echo "FTC-HOLDING Cloud Dev is open on $(git branch --show-current) at $(git rev-parse --short HEAD)."
echo "PeacePad Native: APPS/peacepad-next-native"
echo "Run typecheck or tests before changing source; use local D:-backed tooling for physical-device validation."
