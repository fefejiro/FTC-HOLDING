#!/usr/bin/env node
// Create labels directly via gh api (bypasses workflow auth issue).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = "fefejiro/FTC-HOLDING";
const labelsPath = path.resolve(".github/labels.yml");
const raw = readFileSync(labelsPath, "utf8");

// minimal yaml parser for `- name: x\n  color: y\n  description: z`
const labels = [];
let cur = null;
for (const line of raw.split(/\r?\n/)) {
  const m1 = line.match(/^-\s*name:\s*(.+?)\s*$/);
  if (m1) { if (cur) labels.push(cur); cur = { name: m1[1].replace(/^"(.*)"$/, "$1") }; continue; }
  const m2 = line.match(/^\s+color:\s*"?([0-9A-Fa-f]{6})"?\s*$/);
  if (m2 && cur) { cur.color = m2[1]; continue; }
  const m3 = line.match(/^\s+description:\s*"(.*)"\s*$/);
  if (m3 && cur) { cur.description = m3[1]; continue; }
}
if (cur) labels.push(cur);

console.log(`Found ${labels.length} labels in ${labelsPath}`);
let ok = 0, fail = 0;
for (const l of labels) {
  if (!l.name || !l.color) continue;
  const desc = l.description || "";
  const args = [
    "api", `repos/${REPO}/labels`,
    "-X", "POST",
    "-f", `name=${l.name}`,
    "-f", `color=${l.color}`,
    "-f", `description=${desc}`,
  ];
  try {
    execSync(`gh ${args.map(a => /[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a).join(" ")}`, { stdio: "pipe" });
    console.log(`✓ ${l.name}`);
    ok++;
  } catch (e) {
    const msg = e.stderr?.toString() || e.message;
    if (/already_exists/.test(msg)) { console.log(`= ${l.name} (exists)`); ok++; }
    else { console.log(`✘ ${l.name} — ${msg.split("\n")[0]}`); fail++; }
  }
}
console.log(`\nDone. ok=${ok} fail=${fail}`);
