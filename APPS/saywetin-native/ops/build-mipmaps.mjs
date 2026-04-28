// Regenerates Android mipmap-* launcher icons from the keyed orb foreground.
// Writes:
//   mipmap-{m,h,x,xx,xxx}hdpi/ic_launcher_foreground.webp  (adaptive foreground, 108dp)
//   mipmap-{m,h,x,xx,xxx}hdpi/ic_launcher.webp             (legacy square, 48dp)
//   mipmap-{m,h,x,xx,xxx}hdpi/ic_launcher_round.webp       (legacy round, 48dp)
// On Android 8+ (anydpi-v26 XML) the adaptive foreground is masked by the launcher.

import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const KEYED = path.join(ROOT, 'assets', 'icon.png');
const BG = { r: 0x0a, g: 0x0a, b: 0x0f, alpha: 1 };

async function circularize(srcSize) {
  // Produce a full-bleed circular crop of the source icon at srcSize×srcSize.
  const resized = await sharp(KEYED).resize(srcSize, srcSize, { fit: 'cover' }).png().toBuffer();
  const r = Math.floor(srcSize / 2);
  const mask = Buffer.from(
    `<svg width="${srcSize}" height="${srcSize}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
  );
  return sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

// Adaptive foreground sizes (108dp at each density)
const FG_SIZES = {
  'mdpi': 108,
  'hdpi': 162,
  'xhdpi': 216,
  'xxhdpi': 324,
  'xxxhdpi': 432,
};
// Legacy launcher sizes (48dp at each density)
const LEGACY_SIZES = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192,
};

async function makeForeground(density, size) {
  // Adaptive foreground: a circular icon filling the 72dp safe zone
  // (66% of 108dp), centered on a transparent canvas. Launchers apply
  // their own mask but the visible art is already a true circle.
  const inner = Math.round(size * 0.66);
  const orb = await circularize(inner);
  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: orb, gravity: 'center' }])
    .webp({ quality: 92, lossless: false })
    .toBuffer();
  const dest = path.join(RES, `mipmap-${density}`, 'ic_launcher_foreground.webp');
  await fs.writeFile(dest, out);
  return dest;
}

async function makeLegacy(density, size, round) {
  // Legacy icons (Android 7 and below). Render a true circle at full size
  // on a transparent canvas (no dark backplate visible in the corners).
  const orb = await circularize(size);
  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: orb, gravity: 'center' }])
    .webp({ quality: 92, lossless: false })
    .toBuffer();
  return { buffer: out };
}

async function writeLegacy(density, size, outName, round) {
  const { buffer } = await makeLegacy(density, size, round);
  const dest = path.join(RES, `mipmap-${density}`, outName);
  await fs.writeFile(dest, buffer);
  return dest;
}

async function main() {
  await fs.access(KEYED);
  for (const [density, size] of Object.entries(FG_SIZES)) {
    console.log('fg', density, size, '->', await makeForeground(density, size));
  }
  for (const [density, size] of Object.entries(LEGACY_SIZES)) {
    // Both legacy ic_launcher and ic_launcher_round get a circular mask
    // so launchers that don't use adaptive icons still show a round icon.
    console.log('legacy', density, size, '->', await writeLegacy(density, size, 'ic_launcher.webp', true));
    console.log('round ', density, size, '->', await writeLegacy(density, size, 'ic_launcher_round.webp', true));
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
