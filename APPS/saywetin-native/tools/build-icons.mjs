// Regenerate launcher icons from icon-source.png so Android's circle mask produces a clean
// round icon (PeacePad-style) instead of the current small-square-in-circle look.
//
// Strategy: source PNG already contains the violet squircle + S glyph centered on a transparent
// canvas. We trim the transparent border then resize to fully fill 1024x1024. Then for the
// adaptive foreground we additionally composite onto a solid violet background so the circle
// mask cuts a fully-saturated circle (no transparent corners showing the system bg).

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'icon-source.png');
const SIZE = 1024;
const VIOLET = { r: 124, g: 58, b: 237, alpha: 1 }; // #7C3AED brand violet

// Trim transparent padding so the squircle artwork fills its own bbox.
const trimmed = await sharp(SRC).trim().toBuffer();

// Resize the artwork to fully cover the canvas (edge-to-edge squircle).
const filled = await sharp(trimmed).resize(SIZE, SIZE, { fit: 'cover' }).png().toBuffer();

// icon.png: edge-to-edge squircle. iOS rounds it; legacy Android launchers show it as a squircle.
await sharp(filled).toFile(path.join(ROOT, 'assets', 'icon.png'));
console.log('wrote icon.png');

// adaptive-icon.png (foreground): place the squircle artwork on a solid violet background so
// when Android's circle mask is applied the result is a fully-filled violet circle with the
// S glyph centered. The squircle's rounded corners disappear under the violet bg.
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: VIOLET } })
  .composite([{ input: filled }])
  .png()
  .toFile(path.join(ROOT, 'assets', 'adaptive-icon.png'));
console.log('wrote adaptive-icon.png');
