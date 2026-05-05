#!/usr/bin/env node
/**
 * Upload a signed AAB to Google Play Store internal testing track.
 * Uses service account key at secrets/play-store-key.json.
 *
 * Usage: node tools/upload-to-play.js [--track internal|alpha|production]
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.saywetin.app';
const AAB_PATH = path.resolve(__dirname, '../android/app/build/outputs/bundle/release/app-release.aab');
const KEY_PATH = path.resolve(__dirname, '../secrets/play-store-key.json');

const args = process.argv.slice(2);
const trackIdx = args.indexOf('--track');
const TRACK = trackIdx !== -1 ? args[trackIdx + 1] : 'internal';

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error('ERROR: Service account key not found at', KEY_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(AAB_PATH)) {
    console.error('ERROR: AAB not found at', AAB_PATH);
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const publisher = google.androidpublisher({ version: 'v3', auth });

  // 1. Open edit
  console.log(`Opening edit for ${PACKAGE_NAME}...`);
  const editRes = await publisher.edits.insert({ packageName: PACKAGE_NAME });
  const editId = editRes.data.id;
  console.log('Edit ID:', editId);

  // 2. Upload AAB
  console.log(`Uploading AAB from ${AAB_PATH}...`);
  const aabRes = await publisher.edits.bundles.upload({
    packageName: PACKAGE_NAME,
    editId,
    media: {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(AAB_PATH),
    },
  });
  const versionCode = aabRes.data.versionCode;
  console.log('Uploaded version code:', versionCode);

  // 3. Assign to track
  console.log(`Assigning version code ${versionCode} to track "${TRACK}"...`);
  await publisher.edits.tracks.update({
    packageName: PACKAGE_NAME,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [
        {
          versionCodes: [String(versionCode)],
          status: 'completed',
        },
      ],
    },
  });

  // 4. Commit edit
  console.log('Committing edit...');
  await publisher.edits.commit({ packageName: PACKAGE_NAME, editId });

  console.log(`\nSuccess! Version ${versionCode} submitted to "${TRACK}" track.`);
}

main().catch((err) => {
  console.error('Upload failed:', err.message || err);
  process.exit(1);
});
