#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const appJsonPath = path.join(root, 'app.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: false,
    encoding: 'utf8',
  });
}

function getVersionState() {
  const pkg = readJson(packageJsonPath);
  const app = readJson(appJsonPath);
  const appVersion = app?.expo?.version;
  const androidCode = app?.expo?.android?.versionCode;
  const packageName = app?.expo?.android?.package;

  if (!appVersion || !androidCode || !packageName) {
    throw new Error('app.json is missing expo.version, expo.android.versionCode, or expo.android.package.');
  }

  return {
    packageVersion: pkg.version,
    appVersion,
    androidCode,
    packageName,
    inSync: pkg.version === appVersion,
  };
}

function findAdb() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'),
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    'adb',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'adb') {
      const probe = run('where', ['adb'], { capture: true });
      if (probe.status === 0) {
        const found = probe.stdout.split(/\r?\n/).find(Boolean);
        if (found) return found.trim();
      }
      continue;
    }

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function listDevices(adbPath) {
  const result = run(adbPath, ['devices'], { capture: true });
  if (result.status !== 0) {
    throw new Error(`adb failed: ${result.stderr || result.stdout}`);
  }

  const lines = result.stdout.split(/\r?\n/).slice(1).map((line) => line.trim()).filter(Boolean);
  return lines
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === 'device')
    .map((parts) => parts[0]);
}

function printPreflight() {
  const state = getVersionState();
  console.log('Android Test Preflight');
  console.log(`- app version: ${state.appVersion}`);
  console.log(`- android versionCode: ${state.androidCode}`);
  console.log(`- android package: ${state.packageName}`);
  console.log(`- package/app version sync: ${state.inSync ? 'ok' : 'mismatch'}`);

  if (!state.inSync) {
    console.log('Action: run npm run version:sync');
  }

  const adbPath = findAdb();
  if (!adbPath) {
    console.log('adb status: not found');
    console.log('Action: install Android platform-tools or set ADB_PATH.');
    return { ok: false, adbPath: null, devices: [] };
  }

  console.log(`adb path: ${adbPath}`);

  const devices = listDevices(adbPath);
  if (devices.length === 0) {
    console.log('connected devices: none');
    console.log('Action: connect a phone with USB debugging enabled or start an emulator.');
    return { ok: state.inSync, adbPath, devices };
  }

  console.log(`connected devices: ${devices.join(', ')}`);
  return { ok: state.inSync, adbPath, devices };
}

function runAndroid() {
  const preflight = printPreflight();
  if (!preflight.ok) {
    process.exit(1);
  }

  if (preflight.devices.length === 0) {
    process.exit(1);
  }

  console.log('Starting Android run via Expo...');
  const result = run('npx', ['expo', 'run:android']);
  process.exit(result.status ?? 1);
}

function main() {
  const mode = process.argv[2] || 'preflight';

  if (mode === 'preflight') {
    printPreflight();
    return;
  }

  if (mode === 'run') {
    runAndroid();
    return;
  }

  throw new Error(`Unknown mode '${mode}'. Use preflight or run.`);
}

try {
  main();
} catch (error) {
  console.error(`android-test-loop error: ${error.message}`);
  process.exit(1);
}
