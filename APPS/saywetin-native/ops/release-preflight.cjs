#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(APP_ROOT, 'android');
const KEYS_TO_CHECK = [
  'SAYWETIN_KEYSTORE_PATH',
  'SAYWETIN_KEYSTORE_PASSWORD',
  'SAYWETIN_KEY_ALIAS',
  'SAYWETIN_KEY_PASSWORD',
  'SAYWETIN_PLAY_KEY_PATH',
];

function readEnvSource(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }
  return values;
}

function pickValue(key, sources) {
  for (const source of sources) {
    if (source && source[key]) return source[key];
  }
  return '';
}

function main() {
  const repoEnv = readEnvSource(path.join(APP_ROOT, '.env'));
  const androidEnv = readEnvSource(path.join(ANDROID_DIR, 'keystore.properties'));
  const gradleProps = readEnvSource(path.join(ANDROID_DIR, 'gradle.properties'));
  const homeGradle = readEnvSource(path.join(process.env.HOME || process.env.USERPROFILE || '', '.gradle', 'gradle.properties'));

  const sources = [process.env, androidEnv, gradleProps, homeGradle, repoEnv];
  const missing = [];

  for (const key of KEYS_TO_CHECK) {
    const value = pickValue(key, sources);
    if (!value) missing.push(key);
  }

  const keystorePath = pickValue('SAYWETIN_KEYSTORE_PATH', sources);
  const keystoreBlob = path.join(ANDROID_DIR, 'keystore-base64.txt');
  const releaseKeystore = path.join(ANDROID_DIR, 'app', 'saywetin-release.keystore');

  console.log('SayWetin release preflight');
  console.log(`- base64 blob: ${fs.existsSync(keystoreBlob) ? 'present' : 'missing'}`);
  console.log(`- decoded keystore: ${fs.existsSync(releaseKeystore) ? 'present' : 'missing'}`);
  console.log(`- release keystore path: ${keystorePath || 'unset'}`);
  console.log(`- signing env vars missing: ${missing.length ? missing.join(', ') : 'none'}`);

  if (missing.length || !keystorePath) {
    console.log('status: blocked');
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(keystorePath)) {
    console.log('status: blocked - keystore path does not exist');
    process.exitCode = 1;
    return;
  }

  console.log('status: ready');
}

main();