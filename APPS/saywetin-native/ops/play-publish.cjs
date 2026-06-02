#!/usr/bin/env node
/**
 * SayWetin → Google Play auto-publisher
 *
 * Usage:
 *   node ops/play-publish.cjs --track=internal           # upload current AAB to internal track
 *   node ops/play-publish.cjs --track=production --rollout=0.2
 *   node ops/play-publish.cjs --promote --from=internal --to=production --rollout=0.2
 *
 * Auth:
 *   Set env var SAYWETIN_PLAY_KEY_PATH to the Google Play service-account JSON
 *   (default: C:\Users\mikef\Documents\saywetin-play-service-account.json).
 *
 * Requires: npm i -D googleapis  (installed in this app workspace).
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const APP_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(APP_ROOT, 'android');
const AAB_PATH = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const PACKAGE_NAME = 'com.saywetin.app';
const FALLBACK_PLAY_KEY_PATH = 'C:\\Users\\mikef\\Documents\\saywetin-play-service-account.json';
const DEFAULT_RELEASE_KEYSTORE = path.join(ANDROID_DIR, 'app', 'saywetin-release.keystore');

function readExpoCredentials() {
  const credentialsPath = path.join(APP_ROOT, 'credentials.json');
  if (!fs.existsSync(credentialsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  } catch {
    return {};
  }
}

const expoCredentials = readExpoCredentials();
const expoKeystore = expoCredentials?.android?.keystore || {};

function resolvePlayKeyPath() {
  return (
    process.env.SAYWETIN_PLAY_KEY_PATH ||
    (expoCredentials?.android?.playServiceAccountKeyPath
      ? path.resolve(APP_ROOT, expoCredentials.android.playServiceAccountKeyPath)
      : '') ||
    FALLBACK_PLAY_KEY_PATH
  );
}

function parseArgs(argv) {
  const out = { track: 'internal', rollout: 1.0, promote: false, from: null, to: null, notes: null };
  for (const a of argv.slice(2)) {
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'track') out.track = v;
    else if (k === 'rollout') out.rollout = parseFloat(v);
    else if (k === 'promote') out.promote = true;
    else if (k === 'from') out.from = v;
    else if (k === 'to') out.to = v;
    else if (k === 'notes') out.notes = v;
  }
  return out;
}

async function authClient() {
  const playKeyPath = resolvePlayKeyPath();
  if (!fs.existsSync(playKeyPath)) {
    throw new Error(
      `Service account key not found at ${playKeyPath}. ` +
        `Create one in Google Cloud Console (Play Android Developer API enabled) and grant it ` +
        `'Release manager' on this app in Play Console → Setup → API access.`,
    );
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: playKeyPath,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return auth.getClient();
}

function hasSigningEnv() {
  return Boolean(
    (process.env.SAYWETIN_KEYSTORE_PASSWORD || expoKeystore.keystorePassword) &&
      (process.env.SAYWETIN_KEY_ALIAS || expoKeystore.keyAlias) &&
      (process.env.SAYWETIN_KEY_PASSWORD || expoKeystore.keyPassword),
  );
}

function resolveReleaseKeystorePath() {
  return (
    process.env.SAYWETIN_KEYSTORE_PATH ||
    (expoKeystore.keystorePath ? path.resolve(APP_ROOT, expoKeystore.keystorePath) : '') ||
    (fs.existsSync(DEFAULT_RELEASE_KEYSTORE) ? DEFAULT_RELEASE_KEYSTORE : '')
  );
}

function failFastIfSigningMissing() {
  const keystorePath = resolveReleaseKeystorePath();
  if (!keystorePath) {
    throw new Error(
      'Release keystore not found. Set SAYWETIN_KEYSTORE_PATH or decode android/app/saywetin-release.keystore first.',
    );
  }
  if (!hasSigningEnv()) {
    throw new Error(
      'Missing release signing env vars. Set SAYWETIN_KEYSTORE_PASSWORD, SAYWETIN_KEY_ALIAS, and SAYWETIN_KEY_PASSWORD.',
    );
  }
  process.env.SAYWETIN_KEYSTORE_PATH = keystorePath;
  process.env.SAYWETIN_KEYSTORE_PASSWORD = process.env.SAYWETIN_KEYSTORE_PASSWORD || expoKeystore.keystorePassword;
  process.env.SAYWETIN_KEY_ALIAS = process.env.SAYWETIN_KEY_ALIAS || expoKeystore.keyAlias;
  process.env.SAYWETIN_KEY_PASSWORD = process.env.SAYWETIN_KEY_PASSWORD || expoKeystore.keyPassword;
}

function readReleaseNotes(explicit) {
  if (explicit) return explicit;
  const file = path.join(APP_ROOT, 'release-notes.txt');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  return 'Quality, speed, and translation polish.';
}

async function uploadAAB({ args }) {
  failFastIfSigningMissing();
  if (!fs.existsSync(AAB_PATH)) {
    throw new Error(`AAB not found at ${AAB_PATH}. Build it first with 'gradlew bundleRelease'.`);
  }
  const auth = await authClient();
  const publisher = google.androidpublisher({ version: 'v3', auth });

  console.log(`▶ Creating edit for ${PACKAGE_NAME}…`);
  const edit = await publisher.edits.insert({ packageName: PACKAGE_NAME });
  const editId = edit.data.id;

  console.log(`▶ Uploading ${path.basename(AAB_PATH)} (${(fs.statSync(AAB_PATH).size / 1024 / 1024).toFixed(1)} MB)…`);
  const bundle = await publisher.edits.bundles.upload({
    packageName: PACKAGE_NAME,
    editId,
    media: { mimeType: 'application/octet-stream', body: fs.createReadStream(AAB_PATH) },
  });
  const versionCode = bundle.data.versionCode;
  console.log(`  ✓ versionCode ${versionCode} uploaded`);

  const notes = readReleaseNotes(args.notes);
  const status = args.rollout >= 1.0 ? 'completed' : 'inProgress';
  const release = {
    name: `v-${versionCode}`,
    versionCodes: [String(versionCode)],
    status,
    releaseNotes: [{ language: 'en-US', text: notes }],
  };
  if (status === 'inProgress') release.userFraction = args.rollout;

  console.log(`▶ Assigning to track '${args.track}' (status=${status}${status === 'inProgress' ? `, rollout=${args.rollout}` : ''})…`);
  await publisher.edits.tracks.update({
    packageName: PACKAGE_NAME,
    editId,
    track: args.track,
    requestBody: { track: args.track, releases: [release] },
  });

  console.log('▶ Committing edit…');
  await publisher.edits.commit({ packageName: PACKAGE_NAME, editId });
  console.log(`✅ Released versionCode ${versionCode} to '${args.track}'.`);
}

async function promote({ args }) {
  failFastIfSigningMissing();
  if (!args.from || !args.to) throw new Error('Promote requires --from and --to');
  const auth = await authClient();
  const publisher = google.androidpublisher({ version: 'v3', auth });

  console.log(`▶ Promoting from '${args.from}' → '${args.to}'…`);
  const edit = await publisher.edits.insert({ packageName: PACKAGE_NAME });
  const editId = edit.data.id;

  const sourceTrack = await publisher.edits.tracks.get({
    packageName: PACKAGE_NAME,
    editId,
    track: args.from,
  });
  const sourceRelease = (sourceTrack.data.releases || []).find((r) => r.status === 'completed' || r.status === 'inProgress');
  if (!sourceRelease) throw new Error(`No active release on '${args.from}'`);

  const status = args.rollout >= 1.0 ? 'completed' : 'inProgress';
  const newRelease = {
    name: sourceRelease.name,
    versionCodes: sourceRelease.versionCodes,
    status,
    releaseNotes: sourceRelease.releaseNotes,
  };
  if (status === 'inProgress') newRelease.userFraction = args.rollout;

  await publisher.edits.tracks.update({
    packageName: PACKAGE_NAME,
    editId,
    track: args.to,
    requestBody: { track: args.to, releases: [newRelease] },
  });
  await publisher.edits.commit({ packageName: PACKAGE_NAME, editId });
  console.log(`✅ Promoted versionCode(s) ${newRelease.versionCodes.join(',')} to '${args.to}'.`);
}

(async () => {
  const args = parseArgs(process.argv);
  try {
    if (args.promote) await promote({ args });
    else await uploadAAB({ args });
  } catch (err) {
    console.error('✗ Play publish failed:', err.message);
    if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
    process.exit(1);
  }
})();
