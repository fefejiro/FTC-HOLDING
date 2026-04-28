#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const target = path.join(
  process.cwd(),
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts'
);

const original = 'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }';
const replacement = '// Local environment fix: disable foojay resolver plugin when plugin portal resolution is blocked.';
const repositoriesBlock = [
  '  repositories {',
  '    mavenCentral()',
  '    google()',
  '    gradlePluginPortal()',
  '  }',
].join('\n');
const strategyBlock = [
  '  resolutionStrategy {',
  '    eachPlugin {',
  '      if (requested.id.id == "org.jetbrains.kotlin.jvm") {',
  '        useModule("org.jetbrains.kotlin:kotlin-gradle-plugin:${requested.version}")',
  '      }',
  '    }',
  '  }',
].join('\n');

try {
  if (!fs.existsSync(target)) {
    console.log('patch-react-native-gradle: target file not found, skipping.');
    process.exit(0);
  }

  const content = fs.readFileSync(target, 'utf8');

  let updated = content;
  let changed = false;

  if (updated.includes(original)) {
    updated = updated.replace(original, replacement);
    changed = true;
  }

  if (!updated.includes('useModule("org.jetbrains.kotlin:kotlin-gradle-plugin:${requested.version}")')) {
    if (updated.includes(repositoriesBlock)) {
      updated = updated.replace(repositoriesBlock, `${repositoriesBlock}\n${strategyBlock}`);
      changed = true;
    }
  }

  if (!changed) {
    console.log('patch-react-native-gradle: already patched or no applicable changes.');
    process.exit(0);
  }

  fs.writeFileSync(target, updated, 'utf8');
  console.log('patch-react-native-gradle: patch applied.');
} catch (error) {
  console.error(`patch-react-native-gradle: failed - ${error.message}`);
  process.exit(1);
}
