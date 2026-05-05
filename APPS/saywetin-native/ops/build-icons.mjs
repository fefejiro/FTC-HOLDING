// Builds SayWetin app icons from generated orb art.
// - Converts the source webp to PNG.
// - Removes the white/near-white background (alpha keying) so launcher masks render cleanly (circle, squircle, etc.).
// - Outputs icon.png (1024x1024, transparent surround) and adaptive-icon.png (1024x1024 foreground sized into the safe 66% zone, fully transparent).
//
// Usage: node ops/build-icons.mjs

import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'icon-concepts', 'v2', 'orb-raw.webp');
const OUT_ICON = path.join(ROOT, 'assets', 'icon.png');
const OUT_ADAPTIVE = path.join(ROOT, 'assets', 'adaptive-icon.png');
const OUT_PREVIEW = path.join(ROOT, 'assets', 'icon-concepts', 'v2', 'orb-keyed.png');

const SIZE = 1024;
// Adaptive icon: foreground content must live within inner 66% (Android masks the outer ring).
const ADAPTIVE_INNER = Math.round(SIZE * 0.66); // 676px

// White-key the background. Pixels close to pure white become fully transparent.
// We use a soft falloff so the orb's atmospheric glow keeps a halo instead of a hard edge.
async function keyOutWhite(inputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data); // copy
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    // Distance from white in 0..1
    const minC = Math.min(r, g, b);
    const whiteness = minC / 255; // 1 = pure white, 0 = saturated/dark
    // Hard threshold above 0.94, soft falloff between 0.78 and 0.94.
    let alphaScale;
    if (whiteness >= 0.94) alphaScale = 0;
    else if (whiteness <= 0.78) alphaScale = 1;
    else alphaScale = (0.94 - whiteness) / (0.94 - 0.78);
    out[i + 3] = Math.round(out[i + 3] * alphaScale);
  }
  return { buffer: out, width, height, channels };
}

async function main() {
  await fs.access(SRC);
  const keyed = await keyOutWhite(SRC);
  // Save preview keyed
  await sharp(keyed.buffer, { raw: { width: keyed.width, height: keyed.height, channels: keyed.channels } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_PREVIEW);

  // icon.png — full 1024 transparent canvas with the orb fitted to ~92% (room for breathing).
  const orbForIcon = await sharp(keyed.buffer, { raw: { width: keyed.width, height: keyed.height, channels: keyed.channels } })
    .resize(Math.round(SIZE * 0.92), Math.round(SIZE * 0.92), { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: orbForIcon, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(OUT_ICON);

  // adaptive-icon.png — foreground sized to the 66% safe zone, fully transparent surround.
  // Background color is supplied by app.json's adaptiveIcon.backgroundColor (#0A0A0F).
  const orbForAdaptive = await sharp(keyed.buffer, { raw: { width: keyed.width, height: keyed.height, channels: keyed.channels } })
    .resize(ADAPTIVE_INNER, ADAPTIVE_INNER, { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: orbForAdaptive, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(OUT_ADAPTIVE);

  console.log('wrote', OUT_PREVIEW);
  console.log('wrote', OUT_ICON);
  console.log('wrote', OUT_ADAPTIVE);
}

main().catch((err) => { console.error(err); process.exit(1); });
