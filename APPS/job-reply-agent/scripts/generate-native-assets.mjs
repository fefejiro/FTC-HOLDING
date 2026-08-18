import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const masterIcon = path.join(root, "store", "assets", "brand", "unascout-master-icon.png");
const iconSvg = (background = true, preserveAlpha = false) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${background ? `<rect width="1024" height="1024" fill="#151719"${preserveAlpha ? ' fill-opacity="0.999"' : ""}/>` : ""}
  <path d="M250 220V570c0 190 94 278 262 278s262-88 262-278V280"
        fill="none" stroke="#ffffff" stroke-width="156" stroke-linecap="square" stroke-linejoin="round"/>
  <path d="M172 142h294v282L172 592z" fill="#ff5a12"/>
  <path d="M614 142h160l88 88v160H704c-50 0-90-40-90-90z" fill="#ffffff"/>
  <path d="M774 142l88 88h-88z" fill="#00ad72"/>
  <path d="M620 710l72 72 164-182" fill="none" stroke="#ff5a12" stroke-width="58"
        stroke-linecap="square" stroke-linejoin="miter"/>
</svg>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function renderSvg(svg, output, width, height, omitBackground = false) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await page.setViewportSize({ width, height });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`);
  await page.screenshot({ path: output, omitBackground });
}

async function renderMasterIcon(output, width, height, omitBackground = false) {
  if (!fs.existsSync(masterIcon)) {
    throw new Error(`Missing UnaScout master icon: ${masterIcon}`);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const source = `data:image/png;base64,${fs.readFileSync(masterIcon).toString("base64")}`;
  await page.setViewportSize({ width, height });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#ffffff}img{display:block;width:100%;height:100%;object-fit:cover}</style><img src="${source}" alt="">`);
  await page.screenshot({ path: output, omitBackground });
}

async function renderSplash(output, width, height) {
  const markSize = Math.round(Math.min(width, height) * 0.28);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await page.setViewportSize({ width, height });
  await page.setContent(`
    <style>
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
      body{display:grid;place-items:center;background:#f4f6f7;font-family:Arial,sans-serif;color:#151719}
      main{display:grid;justify-items:center;gap:${Math.max(18, Math.round(markSize * 0.12))}px}
      .mark{width:${markSize}px;height:${markSize}px;border-radius:${Math.round(markSize * 0.18)}px;overflow:hidden}
      strong{font-size:${Math.max(24, Math.round(markSize * 0.18))}px;letter-spacing:0;font-weight:800}
      span{font-size:${Math.max(12, Math.round(markSize * 0.07))}px;color:#596168;letter-spacing:0}
    </style>
    <main><div class="mark">${iconSvg(true)}</div><strong>UnaScout</strong><span>Move your search forward</span></main>
  `);
  await page.screenshot({ path: output });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return result;
}

function forceOpaqueRgbaPng(file) {
  const source = fs.readFileSync(file);
  const idat = [];
  let width;
  let height;
  let offset = 8;
  while (offset < source.length) {
    const length = source.readUInt32BE(offset);
    const type = source.toString("ascii", offset + 4, offset + 8);
    const data = source.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) {
        throw new Error("Google icon source must be a non-interlaced 8-bit RGB PNG");
      }
    }
    if (type === "IDAT") idat.push(data);
    offset += length + 12;
  }
  const filtered = zlib.inflateSync(Buffer.concat(idat));
  const rgbStride = width * 3;
  const rgba = Buffer.alloc((width * 4 + 1) * height);
  let previous = Buffer.alloc(rgbStride);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[inputOffset++];
    const current = Buffer.alloc(rgbStride);
    for (let x = 0; x < rgbStride; x += 1) {
      const raw = filtered[inputOffset++];
      const left = x >= 3 ? current[x - 3] : 0;
      const up = previous[x];
      const upLeft = x >= 3 ? previous[x - 3] : 0;
      if (filter === 0) current[x] = raw;
      else if (filter === 1) current[x] = (raw + left) & 255;
      else if (filter === 2) current[x] = (raw + up) & 255;
      else if (filter === 3) current[x] = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        current[x] = (raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      } else throw new Error(`Unsupported PNG filter ${filter}`);
    }
    const row = y * (width * 4 + 1);
    rgba[row] = 0;
    for (let x = 0; x < width; x += 1) {
      current.copy(rgba, row + 1 + x * 4, x * 3, x * 3 + 3);
      rgba[row + 1 + x * 4 + 3] = 255;
    }
    previous = current;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(rgba, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]));
}

const iosIcon = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png");
await renderMasterIcon(iosIcon, 1024, 1024);

const pwaSizes = [[512, "icon.png"], [192, "icon-192.png"]];
for (const [size, name] of pwaSizes) {
  const output = path.join(root, "public", name);
  await renderMasterIcon(output, size, size);
  fs.writeFileSync(`${output}.b64`, `${fs.readFileSync(output).toString("base64")}\n`);
}

const googleListingIcon = path.join(root, "store", "assets", "google", "icon-512.png");
await renderMasterIcon(googleListingIcon, 512, 512, true);
forceOpaqueRgbaPng(googleListingIcon);
await renderMasterIcon(path.join(root, "store", "assets", "apple", "icon-1024.png"), 1024, 1024);

const androidDensities = {
  mdpi: { icon: 48, foreground: 108 },
  hdpi: { icon: 72, foreground: 162 },
  xhdpi: { icon: 96, foreground: 216 },
  xxhdpi: { icon: 144, foreground: 324 },
  xxxhdpi: { icon: 192, foreground: 432 }
};
for (const [density, sizes] of Object.entries(androidDensities)) {
  const destination = path.join(root, "android", "app", "src", "main", "res", `mipmap-${density}`);
  await renderMasterIcon(path.join(destination, "ic_launcher.png"), sizes.icon, sizes.icon);
  await renderMasterIcon(path.join(destination, "ic_launcher_round.png"), sizes.icon, sizes.icon);
  await renderMasterIcon(path.join(destination, "ic_launcher_foreground.png"), sizes.foreground, sizes.foreground, true);
}

const splashRoot = path.join(root, "android", "app", "src", "main", "res");
const androidSplashes = [
  ["drawable", 480, 320],
  ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280], ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920], ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480], ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280]
];
for (const [folder, width, height] of androidSplashes) {
  await renderSplash(path.join(splashRoot, folder, "splash.png"), width, height);
}

const iosSplashRoot = path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
for (const name of ["splash-2732x2732-2.png", "splash-2732x2732-1.png", "splash-2732x2732.png"]) {
  await renderSplash(path.join(iosSplashRoot, name), 2732, 2732);
}

await browser.close();
console.log("Generated UnaScout PWA, store, Android, and iOS identity assets.");
