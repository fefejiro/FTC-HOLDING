#!/bin/bash
# Script to encode keystore to base64 for GitHub Secrets

KEYSTORE_FILE="$HOME/peacepad-release.keystore"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ Error: Keystore not found at $KEYSTORE_FILE"
    echo ""
    echo "Please make sure the keystore exists at:"
    echo "  $KEYSTORE_FILE"
    exit 1
fi

echo "📦 Encoding keystore to base64..."
echo ""

BASE64_OUTPUT=$(base64 -w 0 "$KEYSTORE_FILE")

echo "✅ Done! Copy the base64 string below:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$BASE64_OUTPUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Add this to GitHub Secrets as: KEYSTORE_BASE64"
echo ""
echo "Other secrets you need to add:"
echo "  - KEYSTORE_PASSWORD: Efiuvwere,1234"
echo "  - KEY_ALIAS: peacepad"
echo "  - KEY_PASSWORD: Efiuvwere,1234"
