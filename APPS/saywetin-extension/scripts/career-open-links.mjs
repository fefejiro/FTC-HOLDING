import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'career', 'outputs');

function newestFileByPrefixAndExt(prefix, ext) {
  const files = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
    .sort();
  if (files.length === 0) {
    return null;
  }
  return path.join(OUTPUT_DIR, files[files.length - 1]);
}

function main() {
  const jsonPath = newestFileByPrefixAndExt('quick-apply-', '.json');
  if (!jsonPath) {
    console.error('No quick-apply JSON output found. Run career:batch first.');
    process.exit(1);
  }

  const max = Number(process.argv[2] || 5);
  const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const links = rows
    .slice(0, Math.max(1, max))
    .map((r) => r.link)
    .filter((x) => typeof x === 'string' && x.trim().length > 0);

  if (links.length === 0) {
    console.error('No links found in quick-apply output.');
    process.exit(1);
  }

  for (const url of links) {
    spawnSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
  }

  console.log(`Opened ${links.length} job links in your default browser.`);
}

main();
