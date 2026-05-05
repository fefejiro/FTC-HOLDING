import { access, readdir } from "fs/promises";
import { constants } from "fs";
import path from "path";

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const distPublic = path.resolve("dist", "public");
  const indexPath = path.join(distPublic, "index.html");
  const assetsDir = path.join(distPublic, "assets");

  const hasIndex = await fileExists(indexPath);
  if (!hasIndex) {
    throw new Error(`Missing frontend build output: ${indexPath}`);
  }

  const hasAssetsDir = await fileExists(assetsDir);
  if (!hasAssetsDir) {
    throw new Error(`Missing frontend assets directory: ${assetsDir}`);
  }

  const assets = await readdir(assetsDir);
  const hasJsAsset = assets.some((file) => file.endsWith(".js"));
  const hasCssAsset = assets.some((file) => file.endsWith(".css"));

  if (!hasJsAsset) {
    throw new Error(`No JavaScript assets found in: ${assetsDir}`);
  }

  if (!hasCssAsset) {
    throw new Error(`No CSS assets found in: ${assetsDir}`);
  }

  console.log("PASS: Frontend-only build output is valid.");
  console.log(`- index: ${indexPath}`);
  console.log(`- assets: ${assetsDir}`);
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
});
