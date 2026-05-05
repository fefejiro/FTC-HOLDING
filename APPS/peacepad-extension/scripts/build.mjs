import fs from "fs";
import path from "path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = path.join(root, "dist");

await fs.promises.rm(outdir, { recursive: true, force: true });
await fs.promises.mkdir(outdir, { recursive: true });

await build({
  entryPoints: {
    background: path.join(root, "src", "background.ts"),
    content: path.join(root, "src", "content.ts"),
    popup: path.join(root, "src", "popup.ts"),
  },
  outdir,
  bundle: true,
  alias: {
    "@ftc/peacepad-sdk": path.join(root, "..", "..", "PACKAGES", "peacepad-sdk", "src", "index.ts"),
  },
  format: "esm",
  target: "chrome114",
  sourcemap: true,
  logLevel: "info",
});

for (const file of ["popup.html", "popup.css"]) {
  await fs.promises.copyFile(path.join(root, "src", file), path.join(outdir, file));
}

console.log("[peacepad-extension] Build complete");
