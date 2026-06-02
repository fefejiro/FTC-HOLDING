#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const appJsonPath = path.join(root, 'app.json');
const androidBuildGradlePath = path.join(root, 'android', 'app', 'build.gradle');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function syncAndroidGradleVersion(version, versionCode) {
  if (!fs.existsSync(androidBuildGradlePath)) return;
  const raw = fs.readFileSync(androidBuildGradlePath, 'utf8');
  const updated = raw
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  if (updated !== raw) {
    fs.writeFileSync(androidBuildGradlePath, updated, 'utf8');
  }
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version '${version}'. Use x.y.z format.`);
  }
}

function bumpSemver(version, level) {
  assertSemver(version);
  const [major, minor, patch] = version.split('.').map(Number);

  if (level === 'patch') {
    return `${major}.${minor}.${patch + 1}`;
  }

  if (level === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  if (level === 'major') {
    return `${major + 1}.0.0`;
  }

  throw new Error(`Unsupported bump level '${level}'. Use patch|minor|major.`);
}

function loadState() {
  const pkg = readJson(packageJsonPath);
  const app = readJson(appJsonPath);
  let gradle = null;

  if (!app.expo || !app.expo.android) {
    throw new Error('app.json must contain expo.android settings.');
  }

  if (typeof app.expo.android.versionCode !== 'number') {
    throw new Error('app.json expo.android.versionCode must be a number.');
  }

  assertSemver(app.expo.version);

  if (fs.existsSync(androidBuildGradlePath)) {
    const rawGradle = fs.readFileSync(androidBuildGradlePath, 'utf8');
    const versionCodeMatch = rawGradle.match(/versionCode\s+(\d+)/);
    const versionNameMatch = rawGradle.match(/versionName\s+"([^"]+)"/);
    gradle = {
      versionCode: versionCodeMatch ? Number(versionCodeMatch[1]) : null,
      versionName: versionNameMatch ? versionNameMatch[1] : null,
    };
  }

  return { pkg, app, gradle };
}

function printState(pkg, app, gradle) {
  const gradleVersionInSync =
    !gradle ||
    (gradle.versionName === app.expo.version && gradle.versionCode === app.expo.android.versionCode);

  console.log('Version Governance State');
  console.log(`- app.json version: ${app.expo.version}`);
  console.log(`- app.json android.versionCode: ${app.expo.android.versionCode}`);
  console.log(`- package.json version: ${pkg.version}`);
  if (gradle) {
    console.log(`- android/app/build.gradle versionName: ${gradle.versionName ?? 'missing'}`);
    console.log(`- android/app/build.gradle versionCode: ${gradle.versionCode ?? 'missing'}`);
  }
  console.log(`- in sync: ${pkg.version === app.expo.version && gradleVersionInSync ? 'yes' : 'no'}`);
}

function syncVersions() {
  const { pkg, app } = loadState();
  pkg.version = app.expo.version;
  writeJson(packageJsonPath, pkg);
  syncAndroidGradleVersion(app.expo.version, app.expo.android.versionCode);
  const state = loadState();
  printState(state.pkg, state.app, state.gradle);
}

function bumpRelease(levelOrSet, maybeVersion) {
  const { pkg, app } = loadState();
  const previousVersion = app.expo.version;
  const previousCode = app.expo.android.versionCode;

  let nextVersion;

  if (levelOrSet === 'set') {
    if (!maybeVersion) {
      throw new Error("Missing version value. Use: node ops/version-governance.cjs bump set 1.3.1");
    }
    assertSemver(maybeVersion);
    nextVersion = maybeVersion;
  } else {
    nextVersion = bumpSemver(previousVersion, levelOrSet);
  }

  app.expo.version = nextVersion;
  app.expo.android.versionCode = previousCode + 1;
  pkg.version = nextVersion;

  writeJson(appJsonPath, app);
  writeJson(packageJsonPath, pkg);
  syncAndroidGradleVersion(nextVersion, app.expo.android.versionCode);

  console.log('Release version updated successfully');
  console.log(`- previous: ${previousVersion} (${previousCode})`);
  console.log(`- next: ${nextVersion} (${app.expo.android.versionCode})`);
}

function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log('Usage:');
    console.log('  node ops/version-governance.cjs show');
    console.log('  node ops/version-governance.cjs sync');
    console.log('  node ops/version-governance.cjs bump patch|minor|major');
    console.log('  node ops/version-governance.cjs bump set x.y.z');
    process.exit(0);
  }

  if (command === 'show') {
    const { pkg, app, gradle } = loadState();
    printState(pkg, app, gradle);
    return;
  }

  if (command === 'sync') {
    syncVersions();
    return;
  }

  if (command === 'bump') {
    const [levelOrSet, maybeVersion] = args;
    if (!levelOrSet) {
      throw new Error('Missing bump argument. Use patch|minor|major|set.');
    }
    bumpRelease(levelOrSet, maybeVersion);
    return;
  }

  throw new Error(`Unknown command '${command}'. Use show|sync|bump.`);
}

try {
  main();
} catch (error) {
  console.error(`Version governance error: ${error.message}`);
  process.exit(1);
}
