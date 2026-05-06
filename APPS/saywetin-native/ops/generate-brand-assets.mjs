/**
 * generate-brand-assets.mjs
 * Resizes source brand images into all required sizes for:
 *  - Android mipmaps (ic_launcher, ic_launcher_round)
 *  - Play Store (icon 512x512, feature graphic 1024x500)
 *  - Chrome extension icons (16, 32, 48, 128)
 *  - Web favicon (32x32)
 *
 * Run: node ops/generate-brand-assets.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const brandDir = path.join(root, 'assets', 'brand');
const appIconSrc = path.join(brandDir, 'app-icon-source.webp');
const featureSrc = path.join(brandDir, 'feature-graphic-source.webp');
const faviconSrc = path.join(brandDir, 'favicon-source.webp');

const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const extensionPublic = path.join(root, '..', 'saywetin-extension', 'public');

// Android mipmap sizes (icon, round icon, foreground)
const mipmaps = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

async function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function resizePng(srcPath, destPath, width, height) {
  height = height ?? width;
  await sharp(srcPath)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(destPath);
  console.log(`  ✓ ${path.relative(root, destPath)} (${width}x${height})`);
}

async function resizeWebp(srcPath, destPath, width, height) {
  height = height ?? width;
  await sharp(srcPath)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 90 })
    .toFile(destPath);
  console.log(`  ✓ ${path.relative(root, destPath)} (${width}x${height})`);
}

async function createCircularPng(srcPath, destPath, size) {
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );

  await sharp(srcPath)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toFile(destPath);

  console.log(`  ✓ ${path.relative(root, destPath)} (${size}x${size}, circular)`);
}

async function createCircularOrbFromFeature(featurePath, destPath, size) {
  const meta = await sharp(featurePath).metadata();
  const srcW = meta.width ?? 1280;
  const srcH = meta.height ?? 720;

  // Feature graphic is 1280x720 with drum on the left.
  // Crop a square around the drum area, then mask to a circle.
  const cropSize = Math.min(srcH, Math.round(srcW * 0.41));
  const left = 0;
  const top = Math.max(0, Math.round((srcH - cropSize) * 0.42));

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );

  await sharp(featurePath)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toFile(destPath);

  console.log(`  ✓ ${path.relative(root, destPath)} (${size}x${size}, circular feature crop)`);
}

async function run() {
  console.log('\n── Expo app assets (icon/orb) ───────────────────');
  // These files are read by Expo config and in-app UI components.
  await resizePng(appIconSrc, path.join(brandDir, '..', 'icon.png'), 1024);
  await resizePng(appIconSrc, path.join(brandDir, '..', 'adaptive-icon.png'), 1024);
  await resizePng(faviconSrc, path.join(brandDir, '..', 'favicon.png'), 48);
  await createCircularOrbFromFeature(featureSrc, path.join(brandDir, '..', 'orb.png'), 1024);

  console.log('\n── Android mipmap icons ─────────────────────────');
  for (const m of mipmaps) {
    const dir = path.join(androidRes, m.dir);
    await ensureDir(dir);
    await resizeWebp(appIconSrc, path.join(dir, 'ic_launcher.webp'), m.size);
    await resizeWebp(appIconSrc, path.join(dir, 'ic_launcher_round.webp'), m.size);
    await resizeWebp(appIconSrc, path.join(dir, 'ic_launcher_foreground.webp'), m.size);
  }

  console.log('\n── Play Store assets ────────────────────────────');
  const playDir = path.join(brandDir, 'playstore');
  await ensureDir(playDir);
  // App icon: 512x512 PNG required by Play Store
  await resizePng(appIconSrc, path.join(playDir, 'icon-512.png'), 512);
  // Feature graphic: 1024x500 PNG
  await resizePng(featureSrc, path.join(playDir, 'feature-graphic-1024x500.png'), 1024, 500);

  console.log('\n── Chrome extension icons ───────────────────────');
  if (fs.existsSync(extensionPublic)) {
    for (const size of [16, 32, 48, 128]) {
      await resizePng(appIconSrc, path.join(extensionPublic, `icon-${size}.png`), size);
    }
  } else {
    console.log('  Extension public dir not found, skipping');
  }

  console.log('\n── Web favicon ──────────────────────────────────');
  // Save a 32x32 PNG favicon alongside playstore assets for web use
  await resizePng(faviconSrc, path.join(brandDir, 'favicon-32.png'), 32);
  await resizePng(faviconSrc, path.join(brandDir, 'favicon-16.png'), 16);

  console.log('\n✅ All brand assets generated.\n');
}

run().catch(err => { console.error(err); process.exit(1); });
