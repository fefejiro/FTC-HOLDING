#!/bin/bash
# Patch Capacitor plugin build.gradle files to remove their own buildscript AGP declarations.
# This prevents classloader conflicts in Gradle 8.13 where each subproject loading AGP
# separately causes "No matching variant / No variants exist" errors.
# All subprojects inherit AGP from the root build.gradle instead.
#
# Run this after every `npm install` and before building the Android APK.

CAPACITOR_ANDROID="node_modules/@capacitor/android/capacitor/build.gradle"
VOICE_RECORDER="node_modules/capacitor-voice-recorder/android/build.gradle"
FOREGROUND_SERVICE="node_modules/@capawesome-team/capacitor-android-foreground-service/android/build.gradle"

patch_file() {
  local file="$1"
  local name="$2"

  if [ ! -f "$file" ]; then
    echo "SKIP: $name not found at $file"
    return
  fi

  node -e "
const fs = require('fs');
const content = fs.readFileSync('$file', 'utf8');
const lines = content.split('\n');
const result = [];
let inBuildscript = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  if (!inBuildscript && trimmed.startsWith('buildscript') && line.includes('{')) {
    inBuildscript = true;
    braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    if (braceCount <= 0) inBuildscript = false;
    continue;
  }

  if (inBuildscript) {
    braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    if (braceCount <= 0) inBuildscript = false;
    continue;
  }

  result.push(line);
}

fs.writeFileSync('$file', result.join('\n'));
"

  echo "PATCHED: $name - removed buildscript block"
}

patch_file "$CAPACITOR_ANDROID" "capacitor-android"
patch_file "$VOICE_RECORDER" "capacitor-voice-recorder"
patch_file "$FOREGROUND_SERVICE" "capawesome-foreground-service"

echo ""
echo "Done! All Capacitor plugins will now inherit AGP from the root build.gradle."
echo "You can now run: cd android && ./gradlew assembleRelease"
