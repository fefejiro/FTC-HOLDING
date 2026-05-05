import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const assetsDir = path.join(projectRoot, "dist", "public", "assets");

const BASELINE_MAIN_CHUNK_BYTES = 942300;
const STRICT_TARGET_REDUCTION = 0.15;
const STRICT_MAX_MAIN_CHUNK_BYTES = Math.floor(
  BASELINE_MAIN_CHUNK_BYTES * (1 - STRICT_TARGET_REDUCTION),
);
function getMode(nowMs) {
  const explicit = process.env.BUNDLE_GATING_MODE?.trim().toLowerCase();
  if (explicit === "strict") {
    return "strict";
  }
  if (explicit === "soft") {
    return "soft";
  }
  const enforced = process.env.BUNDLE_GATING_ENFORCED?.trim().toLowerCase();
  if (enforced === "1" || enforced === "true" || enforced === "yes") {
    return "strict";
  }
  return "soft";
}

function asKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

async function listJsAssets(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const assets = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    const stats = await fs.stat(fullPath);
    assets.push({
      file: entry.name,
      bytes: stats.size,
    });
  }

  return assets.sort((a, b) => b.bytes - a.bytes);
}

async function run() {
  const nowMs = Date.now();
  const mode = getMode(nowMs);

  let assets;
  try {
    assets = await listJsAssets(assetsDir);
  } catch (error) {
    console.error("[bundle-report] Failed to read build assets:", error);
    process.exit(1);
  }

  if (!assets.length) {
    console.error("[bundle-report] No JavaScript assets found in dist/public/assets.");
    process.exit(1);
  }

  const topAssets = assets.slice(0, 10);
  console.log("[bundle-report] Top JavaScript chunks:");
  topAssets.forEach((asset, index) => {
    console.log(`  ${index + 1}. ${asset.file} (${asKb(asset.bytes)})`);
  });

  const mainChunk =
    assets.find((asset) => /^index-.*\.js$/i.test(asset.file)) || assets[0];

  console.log(`[bundle-report] Main chunk: ${mainChunk.file} (${asKb(mainChunk.bytes)})`);
  console.log(
    `[bundle-report] Baseline target: <= ${asKb(STRICT_MAX_MAIN_CHUNK_BYTES)} (${Math.round(
      STRICT_TARGET_REDUCTION * 100,
    )}% below ${asKb(BASELINE_MAIN_CHUNK_BYTES)})`,
  );
  console.log(
    `[bundle-report] Gate mode: ${mode.toUpperCase()} (set BUNDLE_GATING_MODE=strict or BUNDLE_GATING_ENFORCED=true to hard-fail deploys)`,
  );

  if (mainChunk.bytes > STRICT_MAX_MAIN_CHUNK_BYTES) {
    const overBy = mainChunk.bytes - STRICT_MAX_MAIN_CHUNK_BYTES;
    const message = `[bundle-report] Main chunk exceeds target by ${asKb(overBy)}.`;

    if (mode === "strict") {
      console.error(message);
      process.exit(1);
    }

    console.warn(`${message} Warning only until strict gate is active.`);
    return;
  }

  console.log("[bundle-report] Main chunk is within target.");
}

run().catch((error) => {
  console.error("[bundle-report] Unexpected failure:", error);
  process.exit(1);
});
