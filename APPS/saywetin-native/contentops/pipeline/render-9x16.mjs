#!/usr/bin/env node
// Render 9:16 mp4 from script + audio + a background image/screenshot using ffmpeg.
// Requires ffmpeg in PATH. (winget install Gyan.FFmpeg)
// Usage: node render-9x16.mjs --audio=./_out/ig.mp3 --bg=./assets/bg.png --out=./_renders/ig.mp4 --title="Today's QA"

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.join('=')];
}));

function r(p) {
  if (!p) return '';
  return p.match(/^[a-zA-Z]:[\\/]/) ? p : resolve(process.cwd(), p);
}

const audio = r(args.audio);
const bgArg = args.bg ? r(args.bg) : resolve(__dirname, '../assets/bg-default.png');
const out = r(args.out) || resolve(process.cwd(), `./_renders/render-${Date.now()}.mp4`);
const title = args.title || 'SayWetin QA';
const scriptPath = args.script ? r(args.script) : '';
const platform = (args.platform || 'tiktok').toLowerCase();

// Per-platform accent color (top bar)
const accentByPlatform = {
  tiktok:    '0xFE2C55',
  instagram: '0xE1306C',
  x:         '0x1DA1F2',
  linkedin:  '0x0A66C2',
};
const accent = accentByPlatform[platform] || '0xFFB300';

// Read & wrap script body for caption overlay
function wrap(text, max = 28) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
    else { cur = cur ? cur + ' ' + w : w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 9); // safe-area max
}
let bodyText = '';
if (scriptPath && existsSync(scriptPath)) {
  try {
    const raw = readFileSync(scriptPath, 'utf8')
      .replace(/^\s*#.*$/gm, '')           // strip md headings
      .replace(/\*\*?/g, '')                // strip bold/italic markers
      .replace(/\[[^\]]*\]/g, '')           // strip [annotations]
      .replace(/^\s*[-*]\s+/gm, '')         // strip list bullets
      .trim();
    bodyText = wrap(raw, 28).join('\n');
  } catch {}
}

if (!audio || !existsSync(audio)) { console.error(`Missing --audio (file not found: ${audio})`); process.exit(1); }
const useGeneratedBg = !existsSync(bgArg);
if (useGeneratedBg) console.log(`[render-9x16] no bg image at ${bgArg}, using generated gradient`);
await mkdir(dirname(out), { recursive: true });

// 1080x1920 9:16, scale bg to cover, burn title at top, audio drives duration
const safeTitle = title.replace(/'/g, "\\'").replace(/:/g, '\\:');
// Pick a font that exists on the host (Windows ships Arial; Linux runners have DejaVu).
const fontCandidates = [
  process.env.FFMPEG_FONT,
  'C:/Windows/Fonts/arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
].filter(Boolean);
let fontFile = '';
for (const f of fontCandidates) { if (existsSync(f)) { fontFile = f; break; } }
const fontPart = fontFile ? `fontfile='${fontFile.replace(/\\/g, '/').replace(/:/g, '\\:')}':` : '';
// Write body to a temp file so drawtext can use `textfile=` (handles newlines + special chars cleanly).
let bodyFile = '';
if (bodyText) {
  bodyFile = resolve(tmpdir(), `swt-body-${process.pid}-${Date.now()}.txt`);
  writeFileSync(bodyFile, bodyText, 'utf8');
}
const bodyFileEsc = bodyFile.replace(/\\/g, '/').replace(/:/g, '\\:');

// Layered drawtext: top accent bar (color), header title, body lines, footer brand.
const headerBar = `drawbox=x=0:y=0:w=1080:h=220:color=${accent}:t=fill`;
const headerText = `drawtext=${fontPart}text='${safeTitle}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=80`;
const bodyLayer = bodyFile
  ? `,drawtext=${fontPart}textfile='${bodyFileEsc}':fontcolor=white:fontsize=56:line_spacing=18:x=(w-text_w)/2:y=520:box=1:boxcolor=black@0.45:boxborderw=28`
  : '';
const footerBar = `drawbox=x=0:y=1820:w=1080:h=100:color=black@0.65:t=fill`;
const footerText = `drawtext=${fontPart}text='saywetin.com  \\u2022  ${platform}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=1850`;
const drawText = `${headerBar},${headerText}${bodyLayer},${footerBar},${footerText}`;

let ffArgs;
if (useGeneratedBg) {
  // Generated solid dark-teal background, no external image needed.
  ffArgs = [
    '-y',
    '-f', 'lavfi', '-i', 'color=c=0x0F2A3F:s=1080x1920:d=60',
    '-i', audio,
    '-vf', drawText,
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    out
  ];
} else {
  const vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${drawText}`;
  ffArgs = [
    '-y',
    '-loop', '1', '-i', bgArg,
    '-i', audio,
    '-vf', vf,
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    out
  ];
}
console.log(`[render-9x16] ffmpeg -> ${out}`);
const p = spawn('ffmpeg', ffArgs, { stdio: 'inherit' });
p.on('exit', code => {
  if (code === 0) console.log(`[render-9x16] OK -> ${out}`);
  else { console.error(`[render-9x16] FAIL exit=${code}`); process.exit(code); }
});
