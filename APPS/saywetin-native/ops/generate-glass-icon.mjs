import sharp from "sharp";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "..", "assets");
const SIZE = 1024;
const CX = SIZE / 2;  // 512
const CY = SIZE / 2;  // 512

// S letterform — two offset bowls connected at waist.
// Top bowl centered at (560, 330): opens LEFT (like a backward C)
// Bottom bowl centered at (464, 694): opens RIGHT (like a C)
// Both bowls are thick stroked arcs rendered as filled outlines.
//
// Outer radius 155, inner radius 75 for each bowl.
// Top bowl arc: from ~320° to ~140° (clockwise, opening left)
// Bottom bowl arc: from ~140° to ~320° (clockwise, opening right)
//
// Built as two separate paths + connecting diagonal.

const R_OUT = 164;  // outer radius of each bowl
const R_IN  = 62;   // inner radius for stronger small-size readability

// Top bowl center — offset RIGHT
const TX = 575, TY = 338;
// Bottom bowl center — offset LEFT  
const BX = 449, BY = 694;

// Helper: point on a circle
const px = (cx, cy, r, deg) => cx + r * Math.cos(deg * Math.PI / 180);
const py = (cx, cy, r, deg) => cy + r * Math.sin(deg * Math.PI / 180);

// Top bowl: arc from 140° to 310° clockwise = C-shape opening LEFT
const topPath = [
  `M ${px(TX,TY,R_OUT,140).toFixed(1)},${py(TX,TY,R_OUT,140).toFixed(1)}`,
  `A ${R_OUT} ${R_OUT} 0 1 1 ${px(TX,TY,R_OUT,310).toFixed(1)},${py(TX,TY,R_OUT,310).toFixed(1)}`,
  `L ${px(TX,TY,R_IN,310).toFixed(1)},${py(TX,TY,R_IN,310).toFixed(1)}`,
  `A ${R_IN} ${R_IN} 0 1 0 ${px(TX,TY,R_IN,140).toFixed(1)},${py(TX,TY,R_IN,140).toFixed(1)}`,
  "Z",
].join(" ");

// Bottom bowl: arc from 320° to 130° clockwise = C-shape opening RIGHT
const botPath = [
  `M ${px(BX,BY,R_OUT,320).toFixed(1)},${py(BX,BY,R_OUT,320).toFixed(1)}`,
  `A ${R_OUT} ${R_OUT} 0 1 1 ${px(BX,BY,R_OUT,130).toFixed(1)},${py(BX,BY,R_OUT,130).toFixed(1)}`,
  `L ${px(BX,BY,R_IN,130).toFixed(1)},${py(BX,BY,R_IN,130).toFixed(1)}`,
  `A ${R_IN} ${R_IN} 0 1 0 ${px(BX,BY,R_IN,320).toFixed(1)},${py(BX,BY,R_IN,320).toFixed(1)}`,
  "Z",
].join(" ");

// Diagonal connector bar bridging the two bowls at the waist
const connPath = [
  `M ${px(TX,TY,R_OUT,140).toFixed(1)},${py(TX,TY,R_OUT,140).toFixed(1)}`,
  `C ${TX-20},${TY+132} ${BX+20},${BY-132} ${px(BX,BY,R_OUT,320).toFixed(1)},${py(BX,BY,R_OUT,320).toFixed(1)}`,
  `L ${px(BX,BY,R_IN,320).toFixed(1)},${py(BX,BY,R_IN,320).toFixed(1)}`,
  `C ${BX+2},${BY-112} ${TX-2},${TY+112} ${px(TX,TY,R_IN,140).toFixed(1)},${py(TX,TY,R_IN,140).toFixed(1)}`,
  "Z",
].join(" ");

// Combined S path (three sub-paths in one d attribute, each closes independently)
const sPath = topPath + " " + connPath + " " + botPath;

const svg = `<svg
  width="${SIZE}" height="${SIZE}"
  viewBox="0 0 ${SIZE} ${SIZE}"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="wave" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="linearRGB">
      <feTurbulence type="turbulence" baseFrequency="0.009 0.012" numOctaves="5" seed="17" result="turb"/>
      <feDisplacementMap in="SourceGraphic" in2="turb" scale="26" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="frost" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="sglow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="24" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0%"   stop-color="#200648"/>
      <stop offset="50%"  stop-color="#0c0224"/>
      <stop offset="100%" stop-color="#040012"/>
    </radialGradient>
    <radialGradient id="ambient" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="rgba(140,50,255,0.28)"/>
      <stop offset="58%"  stop-color="rgba(75,12,200,0.10)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <radialGradient id="orb-fill" cx="36%" cy="28%" r="74%">
      <stop offset="0%"   stop-color="rgba(240,190,255,0.32)"/>
      <stop offset="40%"  stop-color="rgba(160,75,255,0.22)"/>
      <stop offset="75%"  stop-color="rgba(90,18,210,0.12)"/>
      <stop offset="100%" stop-color="rgba(40,0,110,0.04)"/>
    </radialGradient>
    <linearGradient id="orb-rim" x1="15%" y1="4%" x2="85%" y2="96%">
      <stop offset="0%"   stop-color="rgba(255,225,255,0.80)"/>
      <stop offset="50%"  stop-color="rgba(190,95,255,0.40)"/>
      <stop offset="100%" stop-color="rgba(80,0,190,0.10)"/>
    </linearGradient>
    <radialGradient id="orb-sheen" cx="32%" cy="20%" r="52%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.58)"/>
      <stop offset="55%"  stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <linearGradient id="s-fill" x1="8%" y1="0%" x2="92%" y2="100%">
      <stop offset="0%"   stop-color="#fce8ff"/>
      <stop offset="18%"  stop-color="#e0a0ff"/>
      <stop offset="52%"  stop-color="#a040f0"/>
      <stop offset="100%" stop-color="#5010c0"/>
    </linearGradient>
    <linearGradient id="s-shine" x1="0%" y1="0%" x2="60%" y2="70%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.72)"/>
      <stop offset="38%"  stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <radialGradient id="icon-sheen" cx="26%" cy="8%" r="56%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.20)"/>
      <stop offset="70%"  stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <clipPath id="circ"><circle cx="${CX}" cy="${CY}" r="${CX}"/></clipPath>
  </defs>

  <g clip-path="url(#circ)">
    <circle cx="${CX}" cy="${CY}" r="${CX}" fill="url(#bg)"/>
    <circle cx="${CX}" cy="${CY}" r="${CX}" fill="url(#ambient)"/>

    <!-- 2 cleaner wave rings to avoid busy launcher appearance -->
    <circle cx="${CX}" cy="${CY}" r="386" fill="none" stroke="rgba(162,83,255,0.17)" stroke-width="24" filter="url(#wave)"/>
    <circle cx="${CX}" cy="${CY}" r="386" fill="none" stroke="rgba(216,164,255,0.28)" stroke-width="1.8" filter="url(#wave)"/>
    <circle cx="${CX}" cy="${CY}" r="320" fill="none" stroke="rgba(174,95,255,0.22)" stroke-width="18" filter="url(#wave)"/>
    <circle cx="${CX}" cy="${CY}" r="320" fill="none" stroke="rgba(224,184,255,0.34)" stroke-width="1.4" filter="url(#wave)"/>

    <!-- Frosted glass orb -->
    <circle cx="${CX}" cy="${CY}" r="236" fill="url(#orb-fill)"/>
    <circle cx="${CX}" cy="${CY}" r="235" fill="rgba(158,78,255,0.08)" filter="url(#frost)"/>
    <circle cx="${CX}" cy="${CY}" r="236" fill="none" stroke="url(#orb-rim)" stroke-width="2.8"/>
    <circle cx="${CX}" cy="${CY}" r="236" fill="url(#orb-sheen)"/>

    <!-- S glow -->
    <path d="${sPath}" fill="rgba(185,85,255,0.70)" filter="url(#sglow)"/>
    <!-- S glass fill -->
    <path d="${sPath}" fill="url(#s-fill)"/>
    <!-- S glass shine -->
    <path d="${sPath}" fill="url(#s-shine)" opacity="0.68"/>

    <circle cx="${CX}" cy="${CY}" r="${CX}" fill="url(#icon-sheen)"/>
    <ellipse cx="${CX - 75}" cy="${CY - 360}" rx="190" ry="40" fill="rgba(255,255,255,0.18)" filter="url(#frost)"/>
  </g>
  <circle cx="${CX}" cy="${CY}" r="${CX - 3}" fill="none" stroke="rgba(220,182,255,0.35)" stroke-width="4"/>
</svg>`;

const iconPath     = path.join(ASSETS, "icon.png");
const adaptivePath = path.join(ASSETS, "adaptive-icon.png");
console.log("Rendering ...");
await sharp(Buffer.from(svg)).png().toFile(iconPath);
console.log("ok", iconPath);
await copyFile(iconPath, adaptivePath);
console.log("ok", adaptivePath);

