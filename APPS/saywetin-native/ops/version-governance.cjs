#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const appJsonPath = path.join(root, 'app.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
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

  if (!app.expo || !app.expo.android) {
    throw new Error('app.json must contain expo.android settings.');
  }

  if (typeof app.expo.android.versionCode !== 'number') {
    throw new Error('app.json expo.android.versionCode must be a number.');
  }

  assertSemver(app.expo.version);

  return { pkg, app };
}

function printState(pkg, app) {
  console.log('Version Governance State');
  console.log(`- app.json version: ${app.expo.version}`);
  console.log(`- app.json android.versionCode: ${app.expo.android.versionCode}`);
  console.log(`- package.json version: ${pkg.version}`);
  console.log(`- in sync: ${pkg.version === app.expo.version ? 'yes' : 'no'}`);
}

function syncVersions() {
  const { pkg, app } = loadState();
  pkg.version = app.expo.version;
  writeJson(packageJsonPath, pkg);
  printState(pkg, app);
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
    const { pkg, app } = loadState();
    printState(pkg, app);
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
