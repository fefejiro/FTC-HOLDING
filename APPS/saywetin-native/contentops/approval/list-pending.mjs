#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const q = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), 'queue.json'), 'utf8'));
const pending = q.filter(e => e.status === 'pending');
console.log(`Pending approvals: ${pending.length} / ${q.length} total`);
for (const e of pending) {
  console.log(`  ${e.id}  tier=${e.approval_tier}  overall=${e.overall}  at=${e.generated_at}`);
}
