#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const migrationsDir = path.join(appRoot, 'supabase', 'migrations');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Keep this list aligned with APPS/anion/.env.example and runtime usage in app/api/* routes.
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'DAILY_API_KEY',
  'DAILY_DOMAIN',
];

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? `: ${detail}` : ''}`);
}

function checkEnvPresence() {
  const missing = requiredEnvVars.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  record(
    'Required env vars present',
    missing.length === 0,
    missing.length === 0 ? `${requiredEnvVars.length} required vars detected` : `Missing: ${missing.join(', ')}`,
  );
}

function checkMigrationSanity() {
  if (!fs.existsSync(migrationsDir)) {
    record('Migration file sanity', false, `Missing directory: ${path.relative(appRoot, migrationsDir)}`);
    return;
  }

  const allFiles = fs.readdirSync(migrationsDir);
  const sqlFiles = allFiles.filter((name) => name.endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    record('Migration file sanity', false, 'No .sql migrations found');
    return;
  }

  // Expected format: YYYYMMDD_HHMMSS_description.sql
  const invalidNames = sqlFiles.filter((name) => !/^\d{8}_\d{6}_.+\.sql$/.test(name));
  if (invalidNames.length > 0) {
    record('Migration file sanity', false, `Invalid filename format: ${invalidNames.join(', ')}`);
    return;
  }

  const duplicatePrefixes = new Set();
  const seenPrefixes = new Set();
  for (const file of sqlFiles) {
    const prefix = file.split('_').slice(0, 2).join('_');
    if (seenPrefixes.has(prefix)) {
      duplicatePrefixes.add(prefix);
    }
    seenPrefixes.add(prefix);
  }

  if (duplicatePrefixes.size > 0) {
    record('Migration file sanity', false, `Duplicate migration prefixes: ${Array.from(duplicatePrefixes).join(', ')}`);
    return;
  }

  const zeroByteFiles = sqlFiles.filter((file) => fs.statSync(path.join(migrationsDir, file)).size === 0);
  if (zeroByteFiles.length > 0) {
    record('Migration file sanity', false, `Empty migration files: ${zeroByteFiles.join(', ')}`);
    return;
  }

  const whitespaceOnlyFiles = sqlFiles.filter((file) => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    return content.trim().length === 0;
  });

  if (whitespaceOnlyFiles.length > 0) {
    record('Migration file sanity', false, `Whitespace-only migration files: ${whitespaceOnlyFiles.join(', ')}`);
    return;
  }

  record('Migration file sanity', true, `${sqlFiles.length} migration files validated`);
}

function runCommandCheck(name, npmArgs) {
  console.log(`\n> Running ${name}: ${npmCmd} ${npmArgs.join(' ')}`);
  const child = spawnSync(npmCmd, npmArgs, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });

  const ok = child.status === 0;
  const detail = ok
    ? 'Completed successfully'
    : `Exited with code ${typeof child.status === 'number' ? child.status : 'unknown'}`;

  record(name, ok, detail);
}

function printSummaryAndExit() {
  const failures = results.filter((result) => !result.ok);
  console.log('\n=== Preflight Production Summary ===');
  for (const result of results) {
    console.log(`- [${result.ok ? 'PASS' : 'FAIL'}] ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
  }

  if (failures.length > 0) {
    console.error(`\nPreflight failed: ${failures.length}/${results.length} checks failed.`);
    process.exit(1);
  }

  console.log(`\nPreflight passed: ${results.length}/${results.length} checks passed.`);
}

function main() {
  checkEnvPresence();
  checkMigrationSanity();
  runCommandCheck('TypeScript check', ['run', 'check']);
  runCommandCheck('Next build', ['run', 'build']);
  runCommandCheck('Worker build', ['run', 'build:worker']);
  printSummaryAndExit();
}

main();
