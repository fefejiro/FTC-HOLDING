import { readFile } from 'node:fs/promises';

const allowedStatuses = new Set([
  'live_surface', 'qa_blocked', 'release_blocked', 'degraded',
  'release_hardening', 'controlled_operations', 'integrations_unverified',
  'canonical_host_blocked', 'public_host_unavailable', 'not_located', 'internal_release_gated',
]);

const path = new URL('../ops/portfolio/status.json', import.meta.url);
const status = JSON.parse(await readFile(path, 'utf8'));
const errors = [];

if (status.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!/^\d{4}-\d{2}-\d{2}$/.test(status.asOf ?? '')) errors.push('asOf must be YYYY-MM-DD');
if (!Array.isArray(status.products) || status.products.length === 0) errors.push('products must be a non-empty array');

const ids = new Set();
for (const [index, product] of (status.products ?? []).entries()) {
  const prefix = `products[${index}]`;
  if (!product.id || ids.has(product.id)) errors.push(`${prefix}.id must be present and unique`);
  ids.add(product.id);
  if (!allowedStatuses.has(product.status)) errors.push(`${prefix}.status is not allowed`);
  if (!product.evidence?.trim()) errors.push(`${prefix}.evidence is required`);
  if (!product.nextProof?.trim()) errors.push(`${prefix}.nextProof is required`);
}

if (errors.length) {
  console.error(`Portfolio status validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Portfolio status valid: ${status.products.length} products as of ${status.asOf}`);
