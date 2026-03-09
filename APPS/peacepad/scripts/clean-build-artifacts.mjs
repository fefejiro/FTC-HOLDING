import { rmSync } from "node:fs";
import { resolve } from "node:path";

const targets = ["dist", "node_modules/typescript/tsbuildinfo"];

for (const target of targets) {
  const absoluteTarget = resolve(process.cwd(), target);
  rmSync(absoluteTarget, { recursive: true, force: true });
}

console.log("[clean] Removed build artifacts:", targets.join(", "));
